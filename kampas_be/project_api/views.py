import os
import boto3
from botocore.exceptions import ClientError
from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from .models import Project, GroupType, GroupTag, CoordinateReferenceSystem, VectorLayer, VectorFeature, StreetImage, TerrainModel

from .vector_layer_utils import create_vector_layer, update_vector_layer, update_feature_geometry, merge_vector_layers, split_layer_by_attribute, create_empty_layer, filter_features, get_feature_geojson
from django.shortcuts import get_object_or_404
from django.http import Http404
from .geoserver_utils import get_geoserver_manager, GeoServerManager, StreetImageryLayerManager
from .serializers import (
    ProjectSerializer, GroupTypeSerializer, GroupTagSerializer, 
    CoordinateReferenceSystemSerializer, VectorLayerSerializer,
    VectorLayerListSerializer, LayerUploadSerializer, VectorLayerUpdateSerializer,
    VectorFeatureSerializer, StreetImageSerializer, StreetImageGeoSerializer, 
    StreetImageUploadSerializer, StreetImageryLayerSerializer, TerrainModelSerializer, TerrainModelUpdateSerializer, TerrainModelCreateSerializer
)
from .vector_utils import VectorDataProcessor
from company_api.models import Client
from django.db.models import Q
from django.db import transaction
from django.contrib.gis.geos import GEOSGeometry
import json
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from rest_framework.exceptions import PermissionDenied
from kampas_be.storage_backends import create_project_folder, list_project_files, mark_file_for_deletion
from celery.result import AsyncResult

from .models import Project, RasterGroupTag, RasterLayer
from .serializers import RasterGroupTagSerializer, RasterLayerSerializer, RasterLayerCreateSerializer
from .tasks import process_raster_layer, process_vector_layer, process_bulk_file_uploads, process_street_images_upload, process_terrain_layer
from project_api.file_upload_utils import FileUploadProcessor
from .street_image_utils import StreetImageProcessor

import logging

logger = logging.getLogger(__name__)
# -----------------------------------------------------------------------------
# ProjectAdminAPIView
# - Allows company admins to manage (view, create, update) projects within their own company.
# - Only authenticated users with admin privileges and an associated company can access these endpoints.
# - GET method: Retrieve a specific project by ID or list all projects for the admin's company.
# - POST method: Create a new project for the admin's company.
# - PATCH method: Partially update an existing project belonging to the admin's company.
# -----------------------------------------------------------------------------
class ProjectAdminAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id=None):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)

        if id:
            project = get_object_or_404(Project, id=id, company=user.company)
            # Check if the user is assigned to the project in any role or is an admin
            if not (user.is_admin or user == project.project_head or user in project.managers.all() or user in project.editors.all() or user in project.viewers.all() or user in project.reviewers.all()):
                return Response({'error': 'Permission denied. You are not assigned to this project.'}, status=status.HTTP_403_FORBIDDEN)
            serializer = ProjectSerializer(project)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Admin users can view all projects in their company
            if user.is_admin:
                projects = Project.objects.filter(company=user.company)
            else:
                # Non-admin users can only view projects they are assigned to
                projects = Project.objects.filter(
                    company=user.company
                ).filter(
                    Q(project_head=user) |
                    Q(managers=user) |
                    Q(editors=user) |
                    Q(viewers=user) |
                    Q(reviewers=user)
                ).distinct()
            serializer = ProjectSerializer(projects, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        if not (user.is_admin or user.role == 'manager'):
            return Response({'error': 'Only company admins or manager can create projects.'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        data['company'] = user.company.id
        serializer = ProjectSerializer(data=data, context={'request': request}) 
        
        if serializer.is_valid():
            project = serializer.save(created_by=user, modified_by=user, company=user.company)
            
            # The project creation will automatically trigger:
            # 1. GeoServer datastore creation (handled in Project.save())
            # 2. Layer groups creation (handled in Project.save())
            # 3. S3 folder structure creation (handled in Project.save())
            
            return Response({
                'message': 'Project created successfully with GeoServer workspace and S3 folders', 
                'project': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        if not id:
            return Response({'error': 'Project ID is required for update.'}, status=status.HTTP_400_BAD_REQUEST)
        
        project = get_object_or_404(Project, id=id, company=user.company)
        
        # Check if user is admin or project head
        if not (user.is_admin or user == project.project_head):
            return Response({
                'error': 'Permission denied. Only admin or project head can edit this project.'
            }, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ProjectSerializer(project, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save(modified_by=user)
            return Response({
                'message': 'Project updated successfully',
                'project': serializer.data
            }, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProjectS3DataAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        # Check if user has access to this project (same as in ProjectAdminAPIView)
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Permission denied. You are not assigned to this project.'}, status=status.HTTP_403_FORBIDDEN)
        folder_type = request.query_params.get('folder_type')
        files = list_project_files(project_id, folder_type)
        return Response(files, status=status.HTTP_200_OK)

# class ProjectS3DeleteAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def delete(self, request, project_id):
#         user = request.user
#         if not (user.is_admin or user == project.project_head):
#             return Response({'error': 'Only admin and project head can delete project data.'}, status=status.HTTP_403_FORBIDDEN)
#         project = get_object_or_404(Project, id=project_id, company=user.company)
#         waiting_period = request.data.get('waiting_period', 7)
#         # Mark S3 data for deletion (soft delete, actual deletion should be handled by a scheduled task or S3 lifecycle policy)
#         success = delete_project_data(project_id, waiting_period_days=waiting_period)
#         if success:
#             return Response({'message': f'Project S3 data marked for deletion in {waiting_period} days.'}, status=status.HTTP_200_OK)
#         else:
#             return Response({'error': 'Failed to mark project S3 data for deletion.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProjectS3FileDeleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, project_id):
        user = request.user
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Only admin and project head can delete project files.'}, status=status.HTTP_403_FORBIDDEN)
        project = get_object_or_404(Project, id=project_id, company=user.company)
        file_keys = request.data.get('file_keys')
        if not file_keys or not isinstance(file_keys, list):
            return Response({'error': 'file_keys (list of file paths) are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        waiting_period = request.data.get('waiting_period', 7)
        results = []
        for file_key in file_keys:
            success = mark_file_for_deletion(project_id, file_key, waiting_period_days=waiting_period)
            results.append({'file_key': file_key, 'success': success})
        
        if all(r['success'] for r in results):
            return Response({'message': f'All specified files marked for deletion in {waiting_period} days.', 'results': results}, status=status.HTTP_200_OK)
        else:
            return Response({'error': 'Some files failed to be marked for deletion.', 'results': results}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# class ProjectS3FolderDeleteAPIView(APIView):
#     permission_classes = [IsAuthenticated]

#     def delete(self, request, project_id):
#         user = request.user
#         if not (user.is_admin or user == project.project_head):
#             return Response({'error': 'Only admin and project head can delete project folders.'}, status=status.HTTP_403_FORBIDDEN)
#         project = get_object_or_404(Project, id=project_id, company=user.company)
#         folder_keys = request.data.get('folder_keys')
#         if not folder_keys or not isinstance(folder_keys, list):
#             return Response({'error': 'folder_keys (list of folder paths) are required.'}, status=status.HTTP_400_BAD_REQUEST)
        
#         waiting_period = request.data.get('waiting_period', 7)
#         results = []
#         for folder_key in folder_keys:
#             success = mark_folder_for_deletion(project_id, folder_key, waiting_period_days=waiting_period)
#             results.append({'folder_key': folder_key, 'success': success})
        
#         if all(r['success'] for r in results):
#             return Response({'message': f'All specified folders marked for deletion in {waiting_period} days.', 'results': results}, status=status.HTTP_200_OK)
#         else:
#             return Response({'error': 'Some folders failed to be marked for deletion.', 'results': results}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class GroupTypeAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id=None, id=None):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        if project_id:
            project = get_object_or_404(Project, id=project_id, company=user.company)
            # Check if user has access to this project
            if not (user.is_admin or user == project.project_head or user in project.managers.all() or 
                    user in project.editors.all() or user in project.viewers.all() or 
                    user in project.reviewers.all()):
                return Response({'error': 'Permission denied. You are not assigned to this project.'}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            if id:
                # Get specific group type
                group_type = get_object_or_404(GroupType, id=id, project=project)
                serializer = GroupTypeSerializer(group_type)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # List all group types for the project
                group_types = GroupType.objects.filter(project=project)
                serializer = GroupTypeSerializer(group_types, many=True)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response({'error': 'Project ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, project_id):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        project = get_object_or_404(Project, id=project_id, company=user.company)
        # Only admin or project head can create group types
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Permission denied. Only admin or project head can create group types.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        data['project'] = project.id
        serializer = GroupTypeSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Group type created successfully', 'group_type': serializer.data}, 
                            status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, project_id, id):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        project = get_object_or_404(Project, id=project_id, company=user.company)
        # Only admin or project head can update group types
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Permission denied. Only admin or project head can update group types.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        group_type = get_object_or_404(GroupType, id=id, project=project)
        serializer = GroupTypeSerializer(group_type, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Group type updated successfully', 'group_type': serializer.data}, 
                            status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GroupTagAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, group_type_id=None, id=None):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        if group_type_id:
            group_type = get_object_or_404(GroupType, id=group_type_id)
            project = group_type.project
            
            # Check if user has access to the project
            if not (user.is_admin or user == project.project_head or user in project.managers.all() or 
                    user in project.editors.all() or user in project.viewers.all() or 
                    user in project.reviewers.all()):
                return Response({'error': 'Permission denied. You are not assigned to this project.'}, 
                                status=status.HTTP_403_FORBIDDEN)
            
            if id:
                # Get specific group tag
                group_tag = get_object_or_404(GroupTag, id=id, group_type=group_type)
                serializer = GroupTagSerializer(group_tag)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # List all group tags for the group type
                group_tags = GroupTag.objects.filter(group_type=group_type)
                serializer = GroupTagSerializer(group_tags, many=True)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response({'error': 'Group type ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request, group_type_id):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        group_type = get_object_or_404(GroupType, id=group_type_id)
        project = group_type.project
        
        # Only admin or project head can create group tags
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Permission denied. Only admin or project head can create group tags.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        data['group_type'] = group_type.id
        serializer = GroupTagSerializer(data=data, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Group tag created successfully', 'group_tag': serializer.data}, 
                            status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, group_type_id, id):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        group_type = get_object_or_404(GroupType, id=group_type_id)
        project = group_type.project
        
        # Only admin or project head can update group tags
        if not (user.is_admin or user == project.project_head):
            return Response({'error': 'Permission denied. Only admin or project head can update group tags.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        group_tag = get_object_or_404(GroupTag, id=id, group_type=group_type)
        serializer = GroupTagSerializer(group_tag, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Group tag updated successfully', 'group_tag': serializer.data}, 
                            status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CoordinateReferenceSystemAPIView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, code=None):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        if code:
            # Get specific CRS
            crs = get_object_or_404(CoordinateReferenceSystem, code=code)
            serializer = CoordinateReferenceSystemSerializer(crs)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # List all CRS
            crs_list = CoordinateReferenceSystem.objects.all()
            serializer = CoordinateReferenceSystemSerializer(crs_list, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only admin can create CRS
        if not user.is_admin:
            return Response({'error': 'Permission denied. Only admin can create coordinate reference systems.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        serializer = CoordinateReferenceSystemSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Coordinate reference system created successfully', 'crs': serializer.data}, 
                            status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, code):
        user = request.user
        if not user.company:
            return Response({'error': 'User is not associated with a company.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only admin can update CRS
        if not user.is_admin:
            return Response({'error': 'Permission denied. Only admin can update coordinate reference systems.'}, 
                            status=status.HTTP_403_FORBIDDEN)
        
        crs = get_object_or_404(CoordinateReferenceSystem, code=code)
        serializer = CoordinateReferenceSystemSerializer(crs, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Coordinate reference system updated successfully', 'crs': serializer.data}, 
                            status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#================================================================Upload Files===============================================================



class BulkFileUploadAPIView(APIView):
    """
    /api/projects/<project_id>/bulk-file-upload/
    Handle multiple file uploads directly to S3 with queue processing
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        """Generate presigned URLs for multiple files (only filename required)"""
        try:
            user = request.user
            project = get_object_or_404(Project, id=project_id, company=user.company)
            
            # Check permissions
            if not (user.is_admin or user == project.project_head or 
                    user in project.managers.all() or user in project.editors.all()):
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
            # Get file list from request
            files_data = request.data.get('files', [])
            if not files_data:
                return Response({'error': 'No files provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file data structure - only filename is required
            for file_data in files_data:
                if 'filename' not in file_data:
                    return Response({
                        'error': 'Each file must have a filename'
                    }, status=status.HTTP_400_BAD_REQUEST)

            processor = FileUploadProcessor()
            upload_urls = []
            file_mappings = []
            
            for file_data in files_data:
                original_filename = file_data['filename']
                
                # Generate unique filename
                unique_filename = processor.generate_unique_filename(original_filename)

                folder_category = processor.determine_file_category(original_filename)
                
                # Generate S3 key
                s3_key = processor.generate_s3_key(
                    company_id=user.company.id,
                    project_id=project.id,
                    folder_category=folder_category,
                filename=unique_filename
                )

                # Get MIME type
                mime_type = processor.get_file_mime_type(original_filename)
                
                # Generate presigned URL for direct upload
                try:
                    presigned_data = processor.get_presigned_upload_url(s3_key, mime_type)
                    
                    file_mapping = {
                        'original_filename': original_filename,
                        'unique_filename': unique_filename,
                        's3_key': s3_key,
                        's3_folder': folder_category,
                        'mime_type': mime_type,
                    }

                    # Add extra_data for street_imagery files
                    if folder_category == 'street_imagery':
                        # Collect these from POST data, or individual file_data if structure supports it
                        # For bulk upload, usually these would be global for request, or per-file
                        file_mapping['extra_data'] = {
                            'latitude': request.data.get('latitude') or file_data.get('latitude'),
                            'longitude': request.data.get('longitude') or file_data.get('longitude'),
                            'image_type': request.data.get('image_type') or file_data.get('image_type', 'front_view'),
                            'notes': request.data.get('notes') or file_data.get('notes', ''),
                            'file_size': file_data.get('size', 0)
                        }

                    file_mappings.append(file_mapping)
                    
                    upload_urls.append({
                        'original_filename': original_filename,
                        'unique_filename': unique_filename,
                        's3_folder': folder_category,
                        'presigned_url': presigned_data['url'],
                        'form_fields': presigned_data['fields'],
                        'key': s3_key
                    })
                    
                except Exception as e:
                    logger.error(f"Error generating presigned URL for {original_filename}: {e}")
                    return Response({
                        'error': f'Error generating upload URL for {original_filename}: {str(e)}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Start Celery task for processing uploaded files
            task = process_bulk_file_uploads.delay(
                file_mappings=file_mappings,
                project_id=str(project.id),
                company_id=user.company.id,
                user_id=str(user.id)
            )
            
            return Response({
                'message': 'File upload URLs generated. Upload files then monitor task status.',
                'task_id': task.id,
                'upload_urls': upload_urls,
                'expires_in': 3600,  # 1 hour
                'status_check_url': f'/upload-tasks/{task.id}/status/',
                #'allowed_folders': list(processor.FOLDER_MAPPING.keys())  # Help frontend with validation
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generating bulk upload URLs: {e}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error generating upload URLs: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

       
       


class UploadTaskStatusAPIView(APIView):
    """
    /api/upload-tasks/<task_id>/status/
    Get real-time status of file upload processing from Celery
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, task_id):
        """Get detailed status from Celery task"""
        try:
            task_result = AsyncResult(task_id)
            
            response_data = {
                'task_id': task_id,
                'status': task_result.status,
                'progress': None,
                'result': None,
                'error': None
            }
            
            if task_result.ready():
                if task_result.successful():
                    response_data['result'] = task_result.result
                else:
                    response_data['error'] = str(task_result.info)
            else:
                # Get progress info if task is running
                if hasattr(task_result, 'info') and isinstance(task_result.info, dict):
                    response_data['progress'] = task_result.info
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking upload task status: {e}")
            return Response({
                'error': f'Error checking task status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#========================================================================Vector Layer===============================================================================


class VectorLayerPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# -----------------------------------------------------------------------------
# VectorLayerAPIView
# - Handles listing and uploading vector layers within a project.
# - Provides endpoints for retrieving all active vector layers and for creating new ones
#   by uploading spatial data files (e.g., GeoJSON, Shapefile).
# - Integrates with GeoServer for publishing new layers.
# -----------------------------------------------------------------------------
class VectorLayerAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/
    List all vector layers in the project (name, title, GeoServer URL)
    Upload a new vector file (GeoJSON/Shapefile), register in GeoServer
    """
    permission_classes = [IsAuthenticated]
    pagination_class = VectorLayerPagination

    def get(self, request, project_id):
        """List all vector layers in the project"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Get all active layers for project
        layers = VectorLayer.objects.filter(project=project, is_active=True)
        
        # Apply filters
        layer_name = request.query_params.get('name')
        geometry_type = request.query_params.get('geometry_type')
        
        if layer_name:
            layers = layers.filter(name__icontains=layer_name)
        if geometry_type:
            layers = layers.filter(geometry_type=geometry_type)
        
        # Use list serializer for performance
        serializer = VectorLayerListSerializer(layers, many=True)
        return Response({
            'layers': serializer.data,
            'count': layers.count()
        }, status=status.HTTP_200_OK)

    def post(self, request, project_id):
        """Upload a new vector file (GeoJSON/Shapefile), register in GeoServer"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check if user can create layers
        if not (user.is_admin or user == project.project_head or user in project.managers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Validate upload data
        serializer = LayerUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Check if layer name already exists in project
            if VectorLayer.objects.filter(
                project=project, 
                name=serializer.validated_data['layer_name'],
                is_active=True
            ).exists():
                return Response({
                    'error': 'A layer with this name already exists in the project.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Process uploaded file
            processor = VectorDataProcessor()
            layer = processor.process_uploaded_file(
                file_key=serializer.validated_data['file_key'],
                project=project,
                layer_name=serializer.validated_data['layer_name'],
                created_by=user,
                title=serializer.validated_data.get('title')
            )
            
            if serializer.validated_data.get('description'):
                layer.description = serializer.validated_data['description']
                layer.save()
            
            response_serializer = VectorLayerSerializer(layer)
            return Response({
                'message': 'Layer created and published to GeoServer successfully.',
                'layer': response_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error processing uploaded file: {e}")
            return Response({
                'error': f'Error processing file: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())

class VectorLayerEmptyCreateAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/empty/
    Create an empty vector layer with specified geometry type
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate input
        required_fields = ['name', 'geometry_type']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        name = request.data['name']
        geometry_type = request.data['geometry_type']
        description = request.data.get('description', '')
        
        # Validate geometry type
        valid_geometry_types = ["Point", "LineString", "Polygon"]
        if geometry_type not in valid_geometry_types:
            return Response({
                'error': f'Invalid geometry type. Must be one of: {valid_geometry_types}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create empty layer
            vector_layer = create_empty_layer(
                name=name,
                geometry_type=geometry_type,
                project=project,
                created_by=user
            )
            
            # Update description if provided
            if description:
                vector_layer.description = description
                vector_layer.save()

            # **GENERATE WFS URL INSTEAD OF WMS**
            wfs_url = self._get_wfs_url(vector_layer.project.company.id, vector_layer.geoserver_layer_name)
            
            return Response({
                'message': 'Empty vector layer created successfully.',
                'layer': {
                    'id': vector_layer.id,
                    'name': vector_layer.name,  # This is now the unique name
                    'title': vector_layer.title,  # This is the user-provided name
                    'geometry_type': vector_layer.geometry_type,
                    'is_published': vector_layer.is_published,
                    'layer_name': vector_layer.geoserver_layer_name,
                    'wfs_url': wfs_url,  # **CHANGED FROM wms_url TO wfs_url**
                    'wfs_capabilities': self._get_wfs_capabilities_url(vector_layer.project.company.id),
                    'wfs_features': wfs_url
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating empty layer: {e}")
            return Response({
                'error': f'Error creating empty layer: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_wfs_url(self, company_id, layer_name):
        """Generate WFS GetFeature URL"""
        from django.conf import settings
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        return f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"
        
    def _get_wfs_capabilities_url(self, company_id):
        """Generate WFS GetCapabilities URL"""
        from django.conf import settings
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        return f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetCapabilities"

class VectorLayerMergeAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/merge/
    Merge two vector layers into a new one
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate input
        required_fields = ['layer1_id', 'layer2_id', 'new_layer_name']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        layer1_id = request.data['layer1_id']
        layer2_id = request.data['layer2_id']
        new_layer_name = request.data['new_layer_name']
        description = request.data.get('description', '')

        logger.info(f"Attempting to merge layers for project {project.id}. Layer1 ID: {layer1_id}, Layer2 ID: {layer2_id}")
        
        # Check if layers exist and belong to the project
        try:
            layer1 = VectorLayer.objects.get(id=layer1_id, project=project, is_active=True)
            layer2 = VectorLayer.objects.get(id=layer2_id, project=project, is_active=True)
        except VectorLayer.DoesNotExist:
            return Response({
                'error': 'One or both layers do not exist or do not belong to this project.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if new layer name already exists
        if VectorLayer.objects.filter(project=project, name=new_layer_name, is_active=True).exists():
            return Response({
                'error': 'A layer with this name already exists in the project.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Merge layers
            merged_layer = merge_vector_layers(
                layer1_id=layer1_id,
                layer2_id=layer2_id,
                new_layer_name=new_layer_name,
                created_by=user
            )
            
            # Update description if provided
            if description:
                merged_layer.description = description
                merged_layer.save()

            # **GENERATE WFS URL**
            wfs_url = self._get_wfs_url(merged_layer.project.company.id, merged_layer.project.id, merged_layer.geoserver_layer_name)
            
            return Response({
                'message': 'Vector layers merged successfully.',
                'layer': {
                    'id': merged_layer.id,
                    'name': merged_layer.name,  # This is now the unique name
                    'title': merged_layer.title,  # This is the user-provided name
                    'geometry_type': merged_layer.geometry_type,
                    'is_published': merged_layer.is_published,
                    'layer_name': merged_layer.geoserver_layer_name,
                    'wfs_url': wfs_url  # **CHANGED FROM wms_url TO wfs_url**
                }
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            logger.error(f"ValueError in layer merge: {str(e)}")
            return Response({
                'error': f'Cannot merge layers: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error merging layers: {e}")
            return Response({
                'error': f'Error merging layers: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
    def _get_wfs_url(self, company_id, project_id, layer_name):
        """Generate WFS GetFeature URL"""
        from django.conf import settings
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        return f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"

class VectorLayerSplitAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/split/
    Split a vector layer based on attribute value
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate input
        required_fields = ['layer_id', 'attribute_key', 'attribute_value', 'new_layer_name']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        layer_id = request.data['layer_id']
        attribute_key = request.data['attribute_key']
        attribute_value = request.data['attribute_value']
        new_layer_name = request.data['new_layer_name']
        description = request.data.get('description', '')
        
        # Check if layer exists and belongs to the project
        try:
            layer = VectorLayer.objects.get(id=layer_id, project=project, is_active=True)
        except VectorLayer.DoesNotExist:
            return Response({
                'error': 'Layer does not exist or does not belong to this project.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            # Split layer
            split_layer = split_layer_by_attribute(
                layer_id=layer_id,
                attribute_key=attribute_key,
                attribute_value=attribute_value,
                new_layer_name=new_layer_name,
                created_by=user
            )
            
            # Update description if provided
            if description:
                split_layer.description = description
                split_layer.save()

            # **GENERATE WFS URL**
            wfs_url = self._get_wfs_url(split_layer.project.company.id, split_layer.project.id, split_layer.geoserver_layer_name)
            
            return Response({
                'message': 'Vector layer split successfully.',
                'layer': {
                    'id': split_layer.id,
                    'name': split_layer.name,  # This is now the unique name
                    'title': split_layer.title,  # This is the user-provided name
                    'geometry_type': split_layer.geometry_type,
                    'is_published': split_layer.is_published,
                    'layer_name': split_layer.geoserver_layer_name,
                    'wfs_url': wfs_url  # **CHANGED FROM wms_url TO wfs_url**
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error splitting layer: {e}")
            return Response({
                'error': f'Error splitting layer: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
    def _get_wfs_url(self, company_id, project_id, layer_name):
        """Generate WFS GetFeature URL"""
        from django.conf import settings
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        return f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"

class VectorFeatureListAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/<layer_id>/features/
    List all features in a vector layer
    Add a new feature to a vector layer
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, layer_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get features for this layer
        features = VectorFeature.objects.filter(layer=layer)
        
        # Apply filters if provided
        bbox = request.query_params.get('bbox')
        if bbox:
            try:
                # Parse bbox as minx,miny,maxx,maxy
                bbox_coords = [float(x) for x in bbox.split(',')]
                if len(bbox_coords) != 4:
                    return Response({
                        'error': 'Invalid bbox format. Expected minx,miny,maxx,maxy'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create polygon from bbox
                bbox_geom = GEOSGeometry(
                    f"POLYGON(({bbox_coords[0]} {bbox_coords[1]}, "
                    f"{bbox_coords[0]} {bbox_coords[3]}, "
                    f"{bbox_coords[2]} {bbox_coords[3]}, "
                    f"{bbox_coords[2]} {bbox_coords[1]}, "
                    f"{bbox_coords[0]} {bbox_coords[1]}))", 
                    srid=4326
                )
                features = features.filter(geom__intersects=bbox_geom)
            except Exception as e:
                return Response({
                    'error': f'Error parsing bbox: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Apply attribute filters
        for key, value in request.query_params.items():
            if key.startswith('attr_'):
                attr_key = key[5:]  # Remove 'attr_' prefix
                features = features.filter(attributes__contains={attr_key: value})
        
        # Paginate results
        paginator = PageNumberPagination()
        paginator.page_size = 100  # Adjust as needed
        paginated_features = paginator.paginate_queryset(features, request)
        
        serializer = VectorFeatureSerializer(paginated_features, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    def post(self, request, project_id, layer_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate input
        required_fields = ['geometry', 'attributes']
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'Missing required field: {field}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Parse geometry
            geometry_data = request.data['geometry']
            if isinstance(geometry_data, str):
                geometry = GEOSGeometry(geometry_data, srid=4326)
            else:
                geometry = GEOSGeometry(json.dumps(geometry_data), srid=4326)
            
            # Validate geometry type matches layer type
            if geometry.geom_type != layer.geometry_type:
                return Response({
                    'error': f'Geometry type {geometry.geom_type} does not match layer type {layer.geometry_type}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create feature
            attributes = request.data['attributes']
            feature = VectorFeature.objects.create(
                layer=layer,
                geom=geometry,
                attributes=attributes
            )
            
            serializer = VectorFeatureSerializer(feature)
            return Response({
                'message': 'Feature added successfully.',
                'feature': serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error adding feature: {e}")
            return Response({
                'error': f'Error adding feature: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())

class VectorFeatureDetailAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/<layer_id>/features/<feature_id>/
    Get, update or delete a specific feature
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, layer_id, feature_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        feature = get_object_or_404(VectorFeature, id=feature_id, layer=layer)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = VectorFeatureSerializer(feature)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request, project_id, layer_id, feature_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        feature = get_object_or_404(VectorFeature, id=feature_id, layer=layer)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Update geometry if provided
            if 'geometry' in request.data:
                geometry_data = request.data['geometry']
                if isinstance(geometry_data, str):
                    geometry = GEOSGeometry(geometry_data, srid=4326)
                else:
                    geometry = GEOSGeometry(json.dumps(geometry_data), srid=4326)
                
                # Validate geometry type matches layer type
                if geometry.geom_type != layer.geometry_type:
                    return Response({
                        'error': f'Geometry type {geometry.geom_type} does not match layer type {layer.geometry_type}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                feature.geom = geometry
            
            # Update attributes if provided
            if 'attributes' in request.data:
                attributes = request.data['attributes']
                feature.attributes = attributes
            
            feature.save()
            
            # Use the utility function to update in PostGIS if needed
            update_feature_geometry(feature_id, feature.geom, feature.attributes)
            
            serializer = VectorFeatureSerializer(feature)
            return Response({
                'message': 'Feature updated successfully.',
                'feature': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating feature: {e}")
            return Response({
                'error': f'Error updating feature: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, project_id, layer_id, feature_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        feature = get_object_or_404(VectorFeature, id=feature_id, layer=layer)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Delete feature
            feature.delete()
            
            return Response({
                'message': 'Feature deleted successfully.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting feature: {e}")
            return Response({
                'error': f'Error deleting feature: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())

# -----------------------------------------------------------------------------
# VectorLayerDetailAPIView
# - Handles retrieving, updating, and deleting specific vector layers.
# - Allows modification of layer metadata (name, tags, styles) but not spatial data.
# - Provides functionality to delete a layer, which also unregisters it from GeoServer.
# -----------------------------------------------------------------------------

class VectorLayerUploadAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/upload
    Handle vector layer uploads from S3 using Celery for async processing
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        """Process uploaded vector file asynchronously using Celery"""
        try:
            user = request.user
            logger.info(f"Vector layer upload request from user: {user.email} for project: {project_id}")
            
            project = get_object_or_404(Project, id=project_id, company=user.company)
            logger.info(f"Found project: {project.project_name} in company: {project.company.company_name}")
            
            # Check permissions
            if not (user.is_admin or user == project.project_head or 
                    user in project.managers.all() or user in project.editors.all()):
                logger.warning(f"Permission denied for user {user.email} on project {project_id}")
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = LayerUploadSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            file_key = validated_data['file_key']
            layer_name = validated_data['layer_name']
            title = validated_data.get('title', '')
            description = validated_data.get('description', '')
            
            logger.info(f"Processing upload - File: {file_key}, Layer: {layer_name}")
            
            # Start the Celery task for asynchronous processing
            task = process_vector_layer.delay(
                file_key=file_key,
                project_id=str(project.id),
                layer_name=layer_name,
                created_by_id=str(user.id),
                title=title,
                description=description
            )
            
            logger.info(f"Started Celery task {task.id} for layer {layer_name}")
            
            # Return immediate response with task information
            return Response({
                'message': 'Vector layer upload started. Processing will continue in the background.',
                'task_id': task.id,
                'status': 'PENDING',
                'layer_name': layer_name,
                'project_id': project_id,
                'check_status_url': f'/tasks/{task.id}/status/'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Unexpected error in vector layer upload: {str(e)}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error processing upload request: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskStatusAPIView(APIView):
    """
    /api/tasks/<task_id>/status/
    Check the status of a Celery task
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, task_id):
        """Get task status and result"""
        try:
            
            task_result = AsyncResult(task_id)
            
            response_data = {
                'task_id': task_id,
                'status': task_result.status,
                'result': task_result.result if task_result.ready() else None
            }
            
            if task_result.failed():
                response_data['error'] = str(task_result.info)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking task status: {e}")
            return Response({
                'error': f'Error checking task status: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VectorLayerListAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/
    List all vector layers in the project
    Upload a new vector file (GeoJSON/Shapefile), register in GeoServer
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        """List all vector layers in the project"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get active layers for this project
        layers = VectorLayer.objects.filter(project=project, is_active=True)
        serializer = VectorLayerListSerializer(layers, many=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request, project_id):
        """Upload a new vector file (GeoJSON/Shapefile), register in GeoServer"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = LayerUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Process the uploaded file
            file_key = serializer.validated_data['file_key']
            layer_name = serializer.validated_data['layer_name']
            title = serializer.validated_data.get('title', layer_name)
            description = serializer.validated_data.get('description', '')
            
            # Check if layer name already exists
            if VectorLayer.objects.filter(project=project, name=layer_name, is_active=True).exists():
                return Response({
                    'error': 'A layer with this name already exists in the project.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process the file
            processor = VectorDataProcessor()
            vector_layer = processor.process_uploaded_file(
                file_key=file_key,
                project=project,
                layer_name=layer_name,
                created_by=user,
                title=title
            )
            
            # Update description if provided
            if description:
                vector_layer.description = description
                vector_layer.save()

            # **GENERATE WFS URL**
            wfs_url = self._get_wfs_url(vector_layer.project.company.id, vector_layer.project.id, vector_layer.geoserver_layer_name)
            
            return Response({
                'message': 'Vector layer created successfully.',
                'layer': {
                    'id': vector_layer.id,
                    'name': vector_layer.name,
                    'title': vector_layer.title,
                    'geometry_type': vector_layer.geometry_type,
                    'feature_count': vector_layer.feature_count,
                    'is_published': vector_layer.is_published,
                    'layer_name': vector_layer.geoserver_layer_name,
                    'wfs_url': wfs_url  # **CHANGED FROM wms_url TO wfs_url**
                }
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            logger.error(f"ValueError in vector layer upload: {str(e)}")
            return Response({
                'error': f'Invalid file format or data: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Unexpected error in vector layer upload: {str(e)}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error processing uploaded file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def _get_wfs_url(self, company_id, project_id, layer_name):
        """Generate WFS GetFeature URL"""
        from django.conf import settings
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        return f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())

class VectorLayerDetailAPIView(APIView):
    """
    /api/projects/<project_id>/vector-layers/<id>
    Update name, tags, styles, etc. (not spatial data)
    Delete layer, and unregister from GeoServer
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, layer_id):
        """Get specific layer details"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = VectorLayerSerializer(layer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, project_id, layer_id):
        """Update name, tags, styles, etc. (not spatial data)"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or user in project.managers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # Check if name is being changed and if it conflicts
        if 'name' in request.data and request.data['name'] != layer.name:
            if VectorLayer.objects.filter(
                project=project, 
                name=request.data['name'],
                is_active=True
            ).exclude(id=layer.id).exists():
                return Response({
                    'error': 'A layer with this name already exists in the project.'
                }, status=status.HTTP_400_BAD_REQUEST)

        serializer = VectorLayerUpdateSerializer(layer, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Return full layer data
            response_serializer = VectorLayerSerializer(layer)
            return Response({
                'message': 'Layer updated successfully.',
                'layer': response_serializer.data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, project_id, layer_id):
        """Soft delete layer with 7-day waiting period (keep in GeoServer during waiting period)"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        layer = get_object_or_404(VectorLayer, id=layer_id, project=project, is_active=True, deleted_at__isnull=True)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head):
            return Response({
                'error': 'Only admins and project heads can delete layers.'
            }, status=status.HTTP_403_FORBIDDEN)

        try:
            # Perform ONLY soft delete - DO NOT remove from GeoServer yet
            layer.deleted_at = timezone.now()
            layer.is_active = False
            # Keep is_published=True and geoserver info intact for the 7-day period
            layer.save()
            
            logger.info(f"Soft deleted layer {layer.name} (ID: {layer.id}) by user {user.email}")
            
            # Calculate permanent deletion date
            permanent_deletion_date = layer.deleted_at + timedelta(days=7)
            
            return Response({
                'message': f'Layer "{layer.name}" has been marked for deletion.',
                'details': {
                    'status': 'soft_deleted',
                    'deleted_at': layer.deleted_at.isoformat(),
                    'permanent_deletion_date': permanent_deletion_date.isoformat(),
                    'days_remaining': 7,
                    'geoserver_status': 'still_available_for_7_days',
                    'database_status': 'soft_deleted',
                    'can_be_restored': True,
                    'note': 'Layer will remain accessible in GeoServer for 7 days, then be permanently removed from both database and GeoServer.'
                }
            }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error soft deleting layer {layer_id}: {e}")
            return Response({
                'error': f'Error deleting layer: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())



class FeaturePagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000

class VectorFeatureFilterAPIView(APIView):
    """
    /api/projects/<project_id>/features/filter
    Filter vector features by various criteria
    """
    permission_classes = [IsAuthenticated]
    pagination_class = FeaturePagination
    
    def get(self, request, project_id):
        """Filter features by query parameters"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Extract filter parameters
            layer_name = request.query_params.get('layer_name')
            
            # Parse bounding box
            bbox_param = request.query_params.get('bbox')  # Expected format: "minx,miny,maxx,maxy"
            geom_bbox = None
            if bbox_param:
                try:
                    bbox_parts = [float(x.strip()) for x in bbox_param.split(',')]
                    if len(bbox_parts) == 4:
                        geom_bbox = tuple(bbox_parts)
                except (ValueError, TypeError) as e:
                    return Response({
                        'error': f'Invalid bbox format. Expected: "minx,miny,maxx,maxy". Got: {bbox_param}'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Parse attribute filters
            attributes = {}
            for key, value in request.query_params.items():
                if key.startswith('attr_'):
                    attr_key = key[5:]  # Remove 'attr_' prefix
                    attributes[attr_key] = value
            
            # Response format
            response_format = request.query_params.get('format', 'json')  # 'json' or 'geojson'
            
            # Filter features
            features_qs = filter_features(
                layer_name=layer_name,
                geom_bbox=geom_bbox,
                attributes=attributes if attributes else None,
                project_id=project_id,
                company_id=user.company.id
            )
            
            # Get total count before pagination
            total_count = features_qs.count()
            
            if response_format.lower() == 'geojson':
                # Return GeoJSON format (without pagination for mapping purposes)
                max_features = int(request.query_params.get('max_features', 1000))
                limited_features = features_qs[:max_features]
                
                geojson_data = get_feature_geojson(limited_features)
                geojson_data['total_count'] = total_count
                geojson_data['returned_count'] = len(geojson_data['features'])
                
                if total_count > max_features:
                    geojson_data['warning'] = f'Only showing first {max_features} features out of {total_count} total'
                
                return Response(geojson_data, status=status.HTTP_200_OK)
            
            else:
                # Return paginated JSON format
                paginator = FeaturePagination()
                paginated_features = paginator.paginate_queryset(features_qs, request)
                
                # Serialize features
                features_data = []
                for feature in paginated_features:
                    features_data.append({
                        'id': str(feature.id),
                        'layer': {
                            'id': str(feature.layer.id),
                            'name': feature.layer.name,
                            'title': feature.layer.title,
                            'geometry_type': feature.layer.geometry_type
                        },
                        'attributes': feature.attributes,
                        'geometry': feature.geom.geojson if feature.geom else None,
                        'created_at': feature.created_at.isoformat(),
                        'updated_at': feature.updated_at.isoformat()
                    })
                
                return paginator.get_paginated_response({
                    'features': features_data,
                    'filters_applied': {
                        'layer_name': layer_name,
                        'bounding_box': geom_bbox,
                        'attributes': attributes,
                        'project_id': project_id
                    },
                    'total_count': total_count
                })
                
        except Exception as e:
            logger.error(f"Error filtering features: {e}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error filtering features: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, project_id):
        """Filter features using POST body (for complex filters)"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Extract filter parameters from request body
            data = request.data
            layer_name = data.get('layer_name')
            geom_bbox = data.get('bbox')  # Expected as [minx, miny, maxx, maxy]
            attributes = data.get('attributes', {})
            response_format = data.get('format', 'json')
            
            # Validate bbox if provided
            if geom_bbox and (not isinstance(geom_bbox, (list, tuple)) or len(geom_bbox) != 4):
                return Response({
                    'error': 'Invalid bbox format. Expected array: [minx, miny, maxx, maxy]'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Filter features
            features_qs = filter_features(
                layer_name=layer_name,
                geom_bbox=tuple(geom_bbox) if geom_bbox else None,
                attributes=attributes if attributes else None,
                project_id=project_id,
                company_id=user.company.id
            )
            
            # Get total count
            total_count = features_qs.count()
            
            if response_format.lower() == 'geojson':
                # Return GeoJSON format
                max_features = data.get('max_features', 1000)
                limited_features = features_qs[:max_features]
                
                geojson_data = get_feature_geojson(limited_features)
                geojson_data['total_count'] = total_count
                geojson_data['returned_count'] = len(geojson_data['features'])
                
                if total_count > max_features:
                    geojson_data['warning'] = f'Only showing first {max_features} features out of {total_count} total'
                
                return Response(geojson_data, status=status.HTTP_200_OK)
            
            else:
                # Return paginated JSON format
                paginator = FeaturePagination()
                paginated_features = paginator.paginate_queryset(features_qs, request)
                
                features_data = []
                for feature in paginated_features:
                    features_data.append({
                        'id': str(feature.id),
                        'layer': {
                            'id': str(feature.layer.id),
                            'name': feature.layer.name,
                            'title': feature.layer.title,
                            'geometry_type': feature.layer.geometry_type
                        },
                        'attributes': feature.attributes,
                        'geometry': feature.geom.geojson if feature.geom else None,
                        'created_at': feature.created_at.isoformat(),
                        'updated_at': feature.updated_at.isoformat()
                    })
                
                return paginator.get_paginated_response({
                    'features': features_data,
                    'filters_applied': {
                        'layer_name': layer_name,
                        'bounding_box': list(geom_bbox) if geom_bbox else None,
                        'attributes': attributes,
                        'project_id': project_id
                    },
                    'total_count': total_count
                })
                
        except Exception as e:
            logger.error(f"Error filtering features via POST: {e}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error filtering features: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all())


#===================================Raster_Layer===========================================


class RasterGroupTagAPIView(APIView):
    """API view for managing RasterGroupTag objects"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, tag_id=None):
        """Get a single tag or list of tags"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            
            if tag_id:
                # Get specific tag
                tag = get_object_or_404(RasterGroupTag, id=tag_id, project=project)
                serializer = RasterGroupTagSerializer(tag)
                return Response(serializer.data)
            else:
                # Get all tags for project
                tags = RasterGroupTag.objects.filter(project=project)
                serializer = RasterGroupTagSerializer(tags, many=True)
                return Response(serializer.data)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving raster group tags: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, project_id):
        """Create a new tag"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            
            # Add project and user to data
            data = request.data.copy()
            data['project'] = project.id
            data['created_by'] = request.user.id
            
            serializer = RasterGroupTagSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Http404:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error creating raster group tag: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, project_id, tag_id):
        """Update an existing tag"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            tag = get_object_or_404(RasterGroupTag, id=tag_id, project=project)
            
            serializer = RasterGroupTagSerializer(tag, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating raster group tag: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, project_id, tag_id):
        """Delete a tag"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            tag = get_object_or_404(RasterGroupTag, id=tag_id, project=project)
            
            tag.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting raster group tag: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RasterLayerListAPIView(APIView):
    """API view for listing raster layers"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        """Get list of raster layers for a project"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            
            # Get query parameters
            group_tag = request.query_params.get('group_tag')
            is_published = request.query_params.get('is_published')
            
            # Filter layers
            layers = RasterLayer.objects.filter(project=project)
            
            if group_tag:
                layers = layers.filter(group_tag__id=group_tag)
            
            if is_published is not None:
                is_published_bool = is_published.lower() == 'true'
                layers = layers.filter(is_published=is_published_bool)
            
            serializer = RasterLayerSerializer(layers, many=True)
            return Response(serializer.data)
        except Http404:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving raster layers: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RasterLayerDetailAPIView(APIView):
    """API view for managing a single raster layer"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, layer_id):
        """Get a single raster layer"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            layer = get_object_or_404(RasterLayer, id=layer_id, project=project)
            
            serializer = RasterLayerSerializer(layer)
            return Response(serializer.data)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving raster layer: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, project_id, layer_id):
        """Update a raster layer"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            layer = get_object_or_404(RasterLayer, id=layer_id, project=project)
            
            serializer = RasterLayerSerializer(layer, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error updating raster layer: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, project_id, layer_id):
        """Delete a raster layer"""
        try:
            # Verify project exists and user has access
            project = get_object_or_404(Project, id=project_id)
            layer = get_object_or_404(RasterLayer, id=layer_id, project=project)
            
            # Soft delete by setting deleted_at timestamp
            layer.deleted_at = timezone.now()
            layer.save()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Http404:
            return Response({"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting raster layer: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RasterLayerUploadAPIView(APIView):
    """
    /api/projects/<project_id>/raster-layers/upload
    Handle raster layer uploads from S3 using Celery for async processing
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        """Process uploaded raster file asynchronously using Celery"""
        try:
            user = request.user
            logger.info(f"Raster layer upload request from user: {user.email} for project: {project_id}")
            
            project = get_object_or_404(Project, id=project_id, company=user.company)
            logger.info(f"Found project: {project.project_name} in company: {project.company.company_name}")
            
            # Check permissions
            if not (user.is_admin or user == project.project_head or 
                    user in project.managers.all() or user in project.editors.all()):
                logger.warning(f"Permission denied for user {user.email} on project {project_id}")
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
            # Validate input data
            serializer = RasterLayerCreateSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Serializer validation failed: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            file_key = validated_data['file_key']  # S3 key
            file_name = validated_data['file_name']
            description = validated_data.get('description', '')
            
            logger.info(f"Processing upload - S3 Key: {file_key}, Name: {file_name}")
            
            # Check if raster layer name already exists in project
            if RasterLayer.objects.filter(project=project, file_name=file_name, is_active=True, deleted_at__isnull=True).exists():
                logger.warning(f"Raster layer name '{file_name}' already exists in project {project_id}")
                return Response({
                    'error': f'A raster layer with name "{file_name}" already exists in this project.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Start the Celery task for asynchronous processing
            task = process_raster_layer.delay(
                file_key=file_key,
                project_id=str(project.id),
                file_name=file_name,
                description=description,
                user_id=str(user.id)
            )
            
            logger.info(f"Started Celery task {task.id} for raster layer {file_name}")
            
            # Return immediate response with task information
            return Response({
                'message': 'Raster layer upload started. Processing will continue in the background.',
                'task_id': task.id,
                'status': 'PENDING',
                'file_name': file_name,
                'project_id': project_id,
                'check_status_url': f'/tasks/{task.id}/status/'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Unexpected error in raster layer upload: {str(e)}")
            logger.error(f"Full traceback:", exc_info=True)
            return Response({
                'error': f'Error processing upload request: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class StreetImageUploadAPIView(APIView):
    """Handle street image uploads with geographic coordinates"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        try:
            user = request.user
            project = get_object_or_404(Project, id=project_id, company=user.company)
            
            # Check permissions
            if not (getattr(user, 'is_admin', False) or user == project.project_head or 
                    user in project.managers.all() or user in project.editors.all()):
                return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
            
            # Validate request data
            serializer = StreetImageUploadSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = serializer.validated_data
            files_data = validated_data['files']
            latitude = validated_data['latitude']
            longitude = validated_data['longitude']
            image_type = validated_data.get('image_type', 'front_view')
            notes = validated_data.get('notes', '')
            
            # **Ensure single layer exists in GeoServer**
            layer_manager = StreetImageryLayerManager()
            try:
                layer_created = layer_manager.get_or_create_street_imagery_layer(str(project.id))
            except Exception as e:
                logger.warning(f"Could not create/access street imagery layer for project {project.id}: {e}")
                layer_created = False
            
            if not layer_created:
                logger.warning(f"Could not create/access street imagery layer for project {project.id}")
            
            processor = FileUploadProcessor()
            upload_urls = []
            file_mappings = []
            
            for file_data in files_data:
                original_filename = os.path.basename(file_data.get('filename', ''))
                file_size = int(file_data.get('size', 0))
                
                # Validate file type
                file_extension = os.path.splitext(original_filename)[1].lower()
                # allowed_extensions = ['.jpg', '.jpeg', '.png', '.tiff', '.tif']
                # if file_extension not in allowed_extensions:
                #     return Response({
                #         'error': f'File type {file_extension} not allowed. Allowed: {allowed_extensions}'
                #     }, status=status.HTTP_400_BAD_REQUEST)
                
                # Generate unique filename
                unique_filename = processor.generate_unique_filename(original_filename)
                
                # Generate S3 key for street_imagery folder
                s3_key = f"{user.company.id}/{project.id}/street_imagery/{unique_filename}"
                
                # Get MIME type
                mime_type = processor.get_file_mime_type(original_filename)
                
                # Generate presigned URL
                try:
                    presigned_data = processor.get_presigned_upload_url(s3_key, mime_type)
                    
                    file_mapping = {
                        'original_filename': original_filename,
                        'unique_filename': unique_filename,
                        's3_key': s3_key,
                        'file_size': file_size,
                        'mime_type': mime_type,
                        'latitude': latitude,
                        'longitude': longitude,
                        'image_type': image_type,
                        'notes': notes
                    }
                    file_mappings.append(file_mapping)
                    
                    upload_urls.append({
                        'original_filename': original_filename,
                        'unique_filename': unique_filename,
                        'presigned_url': presigned_data['url'],
                        'form_fields': presigned_data['fields'],
                        's3_key': s3_key
                    })
                    
                except Exception as e:
                    logger.error(f"Error generating presigned URL for {original_filename}: {e}")
                    return Response({
                        'error': f'Error generating upload URL for {original_filename}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Start Celery task for processing uploaded images
            task = process_street_images_upload.delay(
                file_mappings=file_mappings,
                project_id=str(project.id),
                company_id=str(user.company.id),
                user_id=str(user.id)
            )
            
            return Response({
                'message': 'Street image upload URLs generated. Upload images then monitor task status.',
                'task_id': task.id,
                'upload_urls': upload_urls,
                'layer_name': f"{str(project.id).replace('-', '')}_street_imagery",
                'expires_in': 3600,
                'status_check_url': f'/api/upload-tasks/{task.id}/status/'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error generating street image upload URLs: {e}")
            return Response({
                'error': f'Error generating upload URLs: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StreetImageListAPIView(generics.ListAPIView):
    """
    List street images for a project with presigned URLs
    GET /api/projects/<project_id>/street-images/
    """
    serializer_class = StreetImageSerializer
    permission_classes = [IsAuthenticated]
    
    def generate_presigned_url(self, s3_key, expiration=3600):
        """Generate a presigned URL for S3 object"""
        try:
            # Clean the s3_key - remove any full URLs (same logic as detail view)
            if s3_key.startswith('https://'):
                # Extract just the key part from full URL
                # Example: https://bucket.s3.region.amazonaws.com/key -> key
                parts = s3_key.split('amazonaws.com/', 1)
                if len(parts) > 1:
                    s3_key = parts[1]
                else:
                    # Fallback parsing
                    s3_key = s3_key.split('/', 3)[-1]  # Get everything after domain
            
            logger.info(f"Cleaned S3 key for presigned URL: {s3_key}")
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': s3_key,
                    'ResponseContentType': 'image/jpeg'  # This helps display in browser
                },
                ExpiresIn=expiration
            )
            return presigned_url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL for key '{s3_key}': {e}")
            return None

    def get_queryset(self):
        project_id = self.kwargs['project_id']
        project = get_object_or_404(Project, id=project_id, company=self.request.user.company)
        
        return StreetImage.objects.filter(
            project=project,
            is_active=True
        ).order_by('-captured_at', '-uploaded_at')
    
    def list(self, request, *args, **kwargs):
        """Override list method to add presigned URLs"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Add presigned URLs to each image
        data = serializer.data
        for item in data:
            if item.get('file_path'):
                # Generate presigned URL with the same cleaning logic
                presigned_url = self.generate_presigned_url(item['file_path'])
                
                if presigned_url:
                    # item['presigned_url'] = presigned_url
                    item['s3_url'] = presigned_url
                    # item['image_url'] = presigned_url  # Additional compatibility
                else:
                    logger.warning(f"Could not generate presigned URL for image {item.get('id')}")
                
                item['expires_in'] = 3600
                
                # Also add the cleaned S3 key for reference
                s3_key = item['file_path']
                if s3_key.startswith('https://'):
                    parts = s3_key.split('amazonaws.com/', 1)
                    if len(parts) > 1:
                        s3_key = parts[1]
                item['s3_key'] = s3_key
        
        return Response(data)
    
    # def get_queryset(self):
    #     project_id = self.kwargs['project_id']
    #     project = get_object_or_404(Project, id=project_id, company=self.request.user.company)
        
    #     return StreetImage.objects.filter(
    #         project=project,
    #         is_active=True
    #     ).select_related('project').order_by('-captured_at', '-uploaded_at')
    
    # def list(self, request, *args, **kwargs):
    #     """Override list method to return minimal data with presigned URLs"""
    #     queryset = self.get_queryset()
        
    #     # Build minimal response data
    #     results = []
        
    #     for street_image in queryset:
    #         # Generate presigned URL
    #         presigned_url = None
    #         if street_image.file_path:
    #             presigned_url = self.generate_presigned_url(street_image.file_path)
            
    #         # Create minimal response object
    #         image_data = {
    #             'id': str(street_image.id),
    #             'original_filename': street_image.original_filename,
    #             # 'file_path': street_image.file_path,
    #             # 's3_url': presigned_url,
    #             'latitude': street_image.latitude,
    #             'longitude': street_image.longitude,
    #             # 'project': str(street_image.project.id),
    #             # 'geoserver_url': getattr(street_image.project, 'geoserver_url', None)  # Add if this field exists
    #         }
            
    #         results.append(image_data)
        
    #     return Response(results)



class StreetImageDetailAPIView(APIView):
    """Get street image details for viewing on map click"""
    permission_classes = [IsAuthenticated]
    
    def generate_presigned_url(self, s3_key, expiration=3600):
        """Generate a presigned URL for S3 object"""
        try:
            # Clean the s3_key - remove any full URLs
            if s3_key.startswith('https://'):
                # Extract just the key part from full URL
                # Example: https://bucket.s3.region.amazonaws.com/key -> key
                parts = s3_key.split('amazonaws.com/', 1)
                if len(parts) > 1:
                    s3_key = parts[1]
                else:
                    # Fallback parsing
                    s3_key = s3_key.split('/', 3)[-1]  # Get everything after domain
            
            logger.info(f"Cleaned S3 key: {s3_key}")
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Generate presigned URL with correct parameters
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                    'Key': s3_key,
                    'ResponseContentType': 'image/jpeg'  # This helps display in browser
                },
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned URL: {presigned_url[:100]}...")
            return presigned_url
            
        except Exception as e:
            logger.error(f"Error generating presigned URL for key '{s3_key}': {e}")
            return None
    
    def get(self, request, project_id, image_id):
        try:
            project = get_object_or_404(Project, id=project_id, company=request.user.company)
            street_image = get_object_or_404(
                StreetImage, 
                id=image_id, 
                project=project, 
                is_active=True
            )
            
            # Generate presigned URL
            presigned_url = self.generate_presigned_url(street_image.file_path)
            
            # Also create a clean S3 key for reference
            s3_key = street_image.file_path
            if s3_key.startswith('https://'):
                parts = s3_key.split('amazonaws.com/', 1)
                if len(parts) > 1:
                    s3_key = parts[1]
            
            return Response({
                'id': str(street_image.id),
                'original_filename': street_image.original_filename,
                # 'file_path': street_image.file_path,
                # 's3_key': s3_key,  # Clean S3 key
                # 'presigned_url': presigned_url,
                's3_url': presigned_url,  # For compatibility
                'latitude': street_image.latitude,
                'longitude': street_image.longitude,
                # 'image_type': street_image.image_type,
                # 'captured_at': street_image.captured_at,
                # 'uploaded_at': street_image.uploaded_at,
                # 'notes': street_image.notes,
                # 'processing_status': street_image.processing_status,
                # 'expires_in': 3600,
                # 'bucket_name': settings.AWS_STORAGE_BUCKET_NAME
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving street image {image_id}: {e}")
            return Response({
                'error': f'Error retrieving street image: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProjectStreetImageGeoAPIView(APIView):
    """Get street images for specific project only"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        try:
            project = get_object_or_404(Project, id=project_id, company=request.user.company)
            
            # **ONLY GET IMAGES FOR THIS PROJECT**
            street_images = StreetImage.objects.filter(
                project=project,  # **PROJECT-SPECIFIC FILTER**
                is_active=True,
                latitude__isnull=False,
                longitude__isnull=False
            ).exclude(
                latitude=0.0,
                longitude=0.0
            ).order_by('-uploaded_at')
            
            # Build GeoJSON features
            features = []
            for image in street_images:
                # Generate presigned URL for the image
                presigned_url = image.get_presigned_url()
                
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [float(image.longitude), float(image.latitude)]
                    },
                    'properties': {
                        'streetimage_id': str(image.id),
                        'original_filename': image.original_filename,
                        'file_path': image.file_path,
                        'latitude': float(image.latitude),
                        'longitude': float(image.longitude),
                        'image_type': image.image_type,
                        'project_id': str(project.id),  # **PROJECT ID**
                        'uploaded_at': image.uploaded_at.isoformat(),
                        'view_image_url': image.file_path,
                        'presigned_url': presigned_url
                    }
                })
            
            # **PROJECT-SPECIFIC LAYER INFO**
            project_layer_name = f"{str(project.id).replace('-', '')}_street_imagery"
            company_id = str(project.company.id)

            # **GENERATE WFS URLs INSTEAD OF WMS**
            wfs_capabilities_url = f"{settings.GEOSERVER_URL}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetCapabilities"
            wfs_features_url = f"{settings.GEOSERVER_URL}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{project_layer_name}&outputFormat=application/json"
            
            return Response({
                'type': 'FeatureCollection',
                'features': features,
                'project_id': str(project.id),
                'layer_name': project_layer_name,
                'total_images': len(features),
                'wfs_capabilities_url': wfs_capabilities_url,  # **WFS Capabilities URL**
                'wfs_features_url': wfs_features_url,          # **WFS GetFeature URL**
                'wfs_layer_url': wfs_features_url              # **Main WFS URL**
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving project street images: {e}")
            return Response({
                'error': f'Error retrieving street images: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    
class ProjectStreetImageDebugAPIView(APIView):
    """Debug API to check project-specific street imagery setup"""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        try:
            from django.db import connection
            
            project = get_object_or_404(Project, id=project_id, company=request.user.company)
            table_name = f"street_imagery_{project_id.replace('-', '_')}"
            
            debug_info = {
                'project_id': project_id,
                'table_name': table_name,
                'layer_name': f"{project_id.replace('-', '')}_street_imagery"
            }
            
            # Check if project-specific table exists
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, [table_name])
                
                table_exists = cursor.fetchone()[0]
                debug_info['table_exists'] = table_exists
                
                if table_exists:
                    # Count records in project table
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    record_count = cursor.fetchone()[0]
                    debug_info['records_in_table'] = record_count
                    
                    # Get sample records
                    cursor.execute(f"""
                        SELECT streetimage_id, original_filename, latitude, longitude 
                        FROM {table_name} 
                        ORDER BY uploaded_at DESC 
                        LIMIT 5
                    """)
                    records = cursor.fetchall()
                    debug_info['sample_records'] = [
                        {
                            'id': r[0], 
                            'filename': r[1], 
                            'lat': r[2], 
                            'lon': r[3]
                        } for r in records
                    ]
            
            # Check Django model records
            django_count = StreetImage.objects.filter(project=project, is_active=True).count()
            debug_info['django_model_count'] = django_count
            
            return Response(debug_info, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': f'Debug error: {str(e)}',
                'project_id': project_id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class StreetImageGeoAPIView(APIView):
    """
    Get street images as GeoJSON for mapping
    GET /api/projects/<project_id>/street-images/geo/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        project = get_object_or_404(Project, id=project_id, company=request.user.company)
        
        street_images = StreetImage.objects.filter(
            project=project,
            is_active=True,
            location__isnull=False  # Only images with GPS data
        )
        
        serializer = StreetImageGeoSerializer(street_images, many=True)
        
        return Response({
            'type': 'FeatureCollection',
            'features': serializer.data
        })



class StreetImageryLayerAPIView(APIView):
    """
    Get street imagery layer information for a project
    GET /api/projects/<project_id>/street-images/layer/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not (getattr(user, 'is_admin', False) or user == project.project_head or 
                user in project.managers.all() or user in project.editors.all() or 
                user in project.viewers.all() or user in project.reviewers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Initialize GeoServer manager to ensure the layer exists
        geoserver = GeoServerManager()
        try:
            geoserver._ensure_street_imagery_table_exists(project_id=project_id)
        except Exception as e:
            logger.warning(f"Could not ensure street imagery table exists for project {project_id}: {e}")
        
        # Use the serializer to get layer information
        serializer = StreetImageryLayerSerializer(project)
        
        return Response(serializer.data, status=status.HTTP_200_OK)



class TerrainModelListAPIView(APIView):
    """
    /api/projects/<project_id>/terrain-models/
    List all terrain models in the project
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id):
        """List all terrain models in the project"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all active terrain models for project
        terrain_models = TerrainModel.objects.filter(project=project, is_active=True)
        
        # Apply filters
        terrain_type = request.query_params.get('terrain_type')
        file_type = request.query_params.get('file_type')
        
        if terrain_type:
            terrain_models = terrain_models.filter(terrain_type=terrain_type)
        if file_type:
            terrain_models = terrain_models.filter(file_type=file_type)
        
        serializer = TerrainModelSerializer(terrain_models, many=True)
        return Response({
            'terrain_models': serializer.data,
            'count': terrain_models.count()
        }, status=status.HTTP_200_OK)
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or
                user in project.managers.all() or user in project.editors.all() or
                user in project.viewers.all() or user in project.reviewers.all())

class TerrainModelUploadAPIView(APIView):
    """
    /api/projects/<project_id>/terrain-models/upload/
    Upload a new terrain model file
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, project_id):
        """Upload a new terrain model file"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        
        # Check if user can create terrain models
        if not (user.is_admin or user == project.project_head or user in project.managers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate upload data
        serializer = TerrainModelCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Check if terrain model name already exists in project
            if TerrainModel.objects.filter(
                project=project,
                file_name=serializer.validated_data['file_name'],
                is_active=True
            ).exists():
                return Response({
                    'error': 'A terrain model with this name already exists in the project.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Start async processing
            task = process_terrain_layer.delay(
                file_key=serializer.validated_data['file_key'],
                project_id=str(project.id),
                file_name=serializer.validated_data['file_name'],
                terrain_type=serializer.validated_data['terrain_type'],
                description=serializer.validated_data.get('description', ''),
                user_id=str(user.id)
            )
            
            return Response({
                'message': 'Terrain model upload started. Monitor task status.',
                'task_id': task.id,
                'status_check_url': f'/api/upload-tasks/{task.id}/status/'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Error processing terrain upload: {e}")
            return Response({
                'error': f'Error processing terrain file: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

class TerrainModelDetailAPIView(APIView):
    """
    /api/projects/<project_id>/terrain-models/<terrain_id>/
    Retrieve, update, or delete a specific terrain model
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, project_id, terrain_id):
        """Get terrain model details"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        terrain_model = get_object_or_404(TerrainModel, id=terrain_id, project=project)
        
        # Check project access
        if not self._has_project_access(user, project):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TerrainModelSerializer(terrain_model)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request, project_id, terrain_id):
        """Update terrain model metadata"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        terrain_model = get_object_or_404(TerrainModel, id=terrain_id, project=project)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or user in project.managers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TerrainModelUpdateSerializer(terrain_model, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Terrain model updated successfully.',
                'terrain_model': TerrainModelSerializer(terrain_model).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, project_id, terrain_id):
        """Soft delete terrain model"""
        user = request.user
        project = get_object_or_404(Project, id=project_id, company=user.company)
        terrain_model = get_object_or_404(TerrainModel, id=terrain_id, project=project)
        
        # Check permissions
        if not (user.is_admin or user == project.project_head or user in project.managers.all()):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Soft delete
        terrain_model.deleted_at = timezone.now()
        terrain_model.is_active = False
        terrain_model.save()
        
        return Response({
            'message': 'Terrain model deleted successfully. It will be permanently removed after 7 days.'
        }, status=status.HTTP_200_OK)
    
    def _has_project_access(self, user, project):
        """Check if user has access to project"""
        return (user.is_admin or user == project.project_head or
                user in project.managers.all() or user in project.editors.all() or
                user in project.viewers.all() or user in project.reviewers.all())
