import logging
import os
from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from django.conf import settings
from django.utils import timezone
from kampas_be.project_api.geoserver_utils import StreetImageryLayerManager
from kampas_be.project_api.models import RasterLayer, Project, VectorLayer, TerrainModel
from django.contrib.auth import get_user_model
from kampas_be.project_api.file_upload_utils import FileUploadProcessor
import time
from kampas_be.project_api.vector_utils import VectorDataProcessor
from kampas_be.project_api.raster_utils import RasterDataProcessor
from kampas_be.project_api.geoserver_utils import GeoServerManager
from kampas_be.project_api.terrain_utils import TerrainDataProcessor


logger = logging.getLogger(__name__)
User = get_user_model()

@shared_task(bind=True, max_retries=3, soft_time_limit=600, time_limit=600)
def process_bulk_file_uploads(self, file_mappings, project_id, company_id, user_id):
    """
    Process multiple file uploads with enhanced S3 verification and layer creation
    """
    logger.info(f"Starting bulk file upload task for project {project_id} with {len(file_mappings)} files")
    
    try:
        # Get required objects
        project = Project.objects.get(id=project_id)
        user = User.objects.get(id=user_id)
        
        processor = FileUploadProcessor()
        
        total_files = len(file_mappings)
        processed_files = 0
        failed_files = 0
        
        # Wait settings imported from settings.py
        max_wait_time = getattr(settings, 'BULK_UPLOAD_MAX_WAIT_TIME')
        wait_interval = getattr(settings, 'BULK_UPLOAD_WAIT_INTERVAL')
        max_checks = getattr(settings, 'BULK_UPLOAD_MAX_CHECKS')
        
        files_status = []
        
        # Initialize file status
        for file_mapping in file_mappings:
            files_status.append({
                'original_filename': file_mapping['original_filename'],
                's3_key': file_mapping['s3_key'],
                's3_folder': file_mapping['s3_folder'],
                'status': 'waiting_for_upload',
                'layer_created': False,
                'error': None,
                'layer_type': None,
                'layer_id': None,
                'layer_name': None
            })
        
        logger.info(f"Checking for {total_files} files in S3 (max {max_checks} checks, {wait_interval}s intervals)")
        
        # File checking loop (your existing code works fine)
        check_count = 0
        uploaded_count = 0
        waited_time = 0
        
        while check_count < max_checks and waited_time < max_wait_time:
            check_count += 1
            previous_uploaded_count = uploaded_count
            uploaded_count = 0
            
            logger.info(f"🔍 File check #{check_count}/{max_checks} (waited {waited_time}s)")
            
            for i, file_mapping in enumerate(file_mappings):
                s3_key = file_mapping['s3_key']
                
                if files_status[i]['status'] == 'waiting_for_upload':
                    logger.info(f"   Checking S3 key: {s3_key}")
                    logger.info(f"   Using bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
                    
                    file_exists = processor.verify_file_upload_with_details(s3_key)
                    
                    if file_exists:
                        files_status[i]['status'] = 'uploaded'
                        uploaded_count += 1
                        logger.info(f"✅ File FOUND: {file_mapping['original_filename']}")
                    else:
                        logger.warning(f"❌ File NOT FOUND: {file_mapping['original_filename']}")
                        
                elif files_status[i]['status'] == 'uploaded':
                    uploaded_count += 1
            
            # Update progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'stage': 'checking_uploads',
                    'total_files': total_files,
                    'uploaded_files': uploaded_count,
                    'processed_files': 0,
                    'failed_files': 0,
                    'files_status': files_status,
                    'check_count': check_count,
                    'max_checks': max_checks,
                    'waited_time': waited_time
                }
            )
            
            # Break early if all files uploaded
            if uploaded_count == total_files:
                logger.info(f"🎉 All {total_files} files found after {check_count} checks and {waited_time}s")
                break
            
            # Continue waiting if we still have checks left
            if check_count < max_checks:
                logger.info(f"⏳ Waiting {wait_interval}s before next check... ({uploaded_count}/{total_files} found)")
                time.sleep(wait_interval)
                waited_time += wait_interval
        
        # Check if files were found
        if uploaded_count == 0:
            logger.error("❌ NO FILES FOUND IN S3 after all checks")
            return {
                'status': 'failed',
                'error': 'No files were uploaded to S3.',
                'total_files': total_files,
                'processed_files': 0,
                'failed_files': total_files,
                'files_status': [dict(f, status='failed', error='File not found in S3') for f in files_status]
            }
        
        # **PROCEED WITH LAYER CREATION**
        logger.info(f"🔧 Creating layers for {uploaded_count} uploaded files...")
        
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'creating_layers',
                'total_files': total_files,
                'uploaded_files': uploaded_count,
                'processed_files': 0,
                'failed_files': 0,
                'files_status': files_status
            }
        )
        
        # Process each uploaded file by calling appropriate APIs
        for i, file_mapping in enumerate(file_mappings):
            if files_status[i]['status'] != 'uploaded':
                files_status[i]['status'] = 'failed'
                files_status[i]['error'] = 'File was not uploaded to S3'
                failed_files += 1
                continue
            
            try:
                files_status[i]['status'] = 'processing'
                s3_folder = file_mapping['s3_folder']
                s3_key = file_mapping['s3_key']
                original_filename = file_mapping['original_filename']
                
                logger.info(f"🔧 Creating layer for: {original_filename} in folder: {s3_folder}")
                
                # **CALL MODULE-LEVEL FUNCTIONS (NOT SELF METHODS)**
                if s3_folder == 'vector_layers':
                    success = create_vector_layer_from_task(project, user, s3_key, original_filename, files_status[i])
                    if success:
                        processed_files += 1
                    else:
                        failed_files += 1
                        
                elif s3_folder == 'raster_layers':
                    success = create_raster_layer_from_task(project, user, s3_key, original_filename, files_status[i])
                    if success:
                        processed_files += 1
                    else:
                        failed_files += 1
                        
                elif s3_folder == 'street_imagery':
                    # Extract extra_data if available
                    extra_data = file_mapping.get('extra_data', {})
                    success = create_street_image_from_task(project, user, s3_key, original_filename, files_status[i], extra_data)
                    if success:
                        processed_files += 1
                    else:
                        failed_files += 1
                elif s3_folder == 'terrain_models':
                    success = create_terrain_model_from_task(project, user, s3_key, original_filename, files_status[i])
                    if success:
                        processed_files += 1
                    else:
                        failed_files += 1
                else:
                    # Other file types
                    files_status[i].update({
                        'status': 'completed',
                        'layer_created': False,
                        'note': f'File stored in {s3_folder} folder'
                    })
                    processed_files += 1
                    
            except Exception as e:
                logger.error(f"❌ Error processing {original_filename}: {e}")
                files_status[i].update({
                    'status': 'failed',
                    'error': f"Processing error: {str(e)}"
                })
                failed_files += 1
        
        # Final result
        result = {
            'status': 'completed',
            'total_files': total_files,
            'processed_files': processed_files,
            'failed_files': failed_files,
            'files_status': files_status,
            'summary': {
                'vector_layers_created': len([f for f in files_status if f.get('layer_type') == 'vector']),
                'raster_layers_created': len([f for f in files_status if f.get('layer_type') == 'raster']),
                'street_images_created': len([f for f in files_status if f.get('layer_type') == 'street']),
                'files_stored': len([f for f in files_status if f['status'] == 'completed' and not f.get('layer_created')])
            }
        }
        
        logger.info(f"🎉 Task completed: {processed_files} processed, {failed_files} failed")
        return result
        
    except Exception as e:
        logger.error(f"💥 Task error: {e}", exc_info=True)
        return {
            'status': 'error',
            'error': str(e),
            'total_files': len(file_mappings) if 'file_mappings' in locals() else 0
        }

def create_vector_layer_from_task(project, user, s3_key, original_filename, status_dict):
    """Create vector layer via direct API call - FIXED VERSION"""
    try:
        layer_name = original_filename.split('.')[0].replace(' ', '_').lower()
        layer_name = ''.join(c for c in layer_name if c.isalnum() or c == '_')
        
        # Ensure unique layer name
        base_layer_name = layer_name
        counter = 1
        while project.vector_layers.filter(name=layer_name, is_active=True).exists():
            layer_name = f"{base_layer_name}_{counter}"
            counter += 1
        
        # **OPTION 1: Call the VectorDataProcessor directly (RECOMMENDED)**
        try:
            from project_api.vector_utils import VectorDataProcessor
            
            processor = VectorDataProcessor()
            vector_layer = processor.process_uploaded_file(
                file_key=s3_key,
                project=project,
                layer_name=layer_name,
                created_by=user,
                title=original_filename.split('.')[0]
            )
            
            if vector_layer:
                status_dict.update({
                    'status': 'completed',
                    'layer_created': True,
                    'layer_type': 'vector',
                    'layer_id': str(vector_layer.id),
                    'layer_name': vector_layer.name,
                    'layer_data': {
                        'id': str(vector_layer.id),
                        'name': vector_layer.name,
                        'title': vector_layer.title,
                        'is_published': vector_layer.is_published,
                        'geoserver_url': vector_layer.geoserver_url,
                        'feature_count': vector_layer.feature_count
                    }
                })
                logger.info(f"✅ Vector layer created via processor: {layer_name}")
                return True
            else:
                status_dict.update({
                    'status': 'failed',
                    'error': "Vector processor returned None"
                })
                logger.error(f"❌ Vector processor returned None for: {layer_name}")
                return False
                
        except Exception as processor_error:
            logger.error(f"❌ Vector processor error: {processor_error}")
            
            # **OPTION 2: Fallback to API call with proper DRF request**
            return _create_vector_layer_via_api(project, user, s3_key, original_filename, layer_name, status_dict)
            
    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"Vector layer creation error: {str(e)}"
        })
        logger.error(f"❌ Vector layer creation error: {e}")
        return False


def _create_vector_layer_via_api(project, user, s3_key, original_filename, layer_name, status_dict):
    """Fallback method using proper DRF API call"""
    try:
        from rest_framework.test import APIRequestFactory
        from .views import VectorLayerAPIView
        
        # Use DRF's APIRequestFactory instead of Django's RequestFactory
        factory = APIRequestFactory()
        data = {
            'file_key': s3_key,
            'layer_name': layer_name,
            'title': original_filename.split('.')[0],
            'description': f'Uploaded from {original_filename}'
        }
        
        # Create proper DRF request with JSON data
        request = factory.post(
            f'/api/projects/{project.id}/vector-layers/',
            data=data,
            format='json'  # This ensures request.data is available
        )
        request.user = user
        
        view = VectorLayerAPIView()
        response = view.post(request, str(project.id))
        
        if response.status_code in [200, 201]:
            status_dict.update({
                'status': 'completed',
                'layer_created': True,
                'layer_type': 'vector',
                'layer_data': response.data
            })
            logger.info(f"✅ Vector layer created via API: {layer_name}")
            return True
        else:
            status_dict.update({
                'status': 'failed',
                'error': f"Vector layer API failed: {response.data}"
            })
            logger.error(f"❌ Vector layer API failed: {response.data}")
            return False
            
    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"Vector layer API error: {str(e)}"
        })
        logger.error(f"❌ Vector layer API error: {e}")
        return False


def create_raster_layer_from_task(project, user, s3_key, original_filename, status_dict):
    """Create raster layer via direct processor call - FIXED VERSION"""
    try:
        file_name = original_filename.split('.')[0].replace(' ', '_').lower()
        file_name = ''.join(c for c in file_name if c.isalnum() or c == '_')
        
        # Ensure unique file name
        base_file_name = file_name
        counter = 1
        while project.raster_layers.filter(file_name=file_name, is_active=True).exists():
            file_name = f"{base_file_name}_{counter}"
            counter += 1
        
        # **OPTION 1: Call the RasterDataProcessor directly (RECOMMENDED)**
        try:
            from project_api.raster_utils import RasterDataProcessor
            
            processor = RasterDataProcessor()
            raster_layer = processor.process_uploaded_file(
                file_key=s3_key,
                project=project,
                file_name=file_name,
                description=f'Uploaded from {original_filename}',
                created_by=user
            )
            
            if raster_layer:
                status_dict.update({
                    'status': 'completed',
                    'layer_created': True,
                    'layer_type': 'raster',
                    'layer_id': str(raster_layer.id),
                    'layer_name': raster_layer.file_name,
                    'layer_data': {
                        'id': str(raster_layer.id),
                        'file_name': raster_layer.file_name,
                        'description': raster_layer.description,
                        'is_published': raster_layer.is_published,
                        'geoserver_url': raster_layer.geoserver_url or '',
                        's3_file_key': raster_layer.s3_file_key
                    }
                })
                logger.info(f"✅ Raster layer created via processor: {file_name}")
                return True
            else:
                status_dict.update({
                    'status': 'failed',
                    'error': "Raster processor returned None"
                })
                logger.error(f"❌ Raster processor returned None for: {file_name}")
                return False
                
        except Exception as processor_error:
            logger.error(f"❌ Raster processor error: {processor_error}")
            
            # **OPTION 2: Fallback to API call with proper DRF request**
            return _create_raster_layer_via_api(project, user, s3_key, original_filename, file_name, status_dict)
            
    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"Raster layer creation error: {str(e)}"
        })
        logger.error(f"❌ Raster layer creation error: {e}")
        return False


def _create_raster_layer_via_api(project, user, s3_key, original_filename, file_name, status_dict):
    """Fallback method using proper DRF API call for raster layers"""
    try:
        from rest_framework.test import APIRequestFactory
        from .views import RasterLayerUploadAPIView
        
        # Use DRF's APIRequestFactory
        factory = APIRequestFactory()
        data = {
            'file_key': s3_key,
            'file_name': file_name,
            'description': f'Uploaded from {original_filename}'
        }
        
        request = factory.post(
            f'/api/projects/{project.id}/raster-layers/upload/',
            data=data,
            format='json'
        )
        request.user = user
        
        view = RasterLayerUploadAPIView()
        response = view.post(request, str(project.id))
        
        if response.status_code in [200, 201, 202]:
            status_dict.update({
                'status': 'completed',
                'layer_created': True,
                'layer_type': 'raster',
                'layer_data': response.data
            })
            logger.info(f"✅ Raster layer created via API: {file_name}")
            return True
        else:
            status_dict.update({
                'status': 'failed',
                'error': f"Raster layer API failed: {response.data}"
            })
            logger.error(f"❌ Raster layer API failed: {response.data}")
            return False
            
    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"Raster layer API error: {str(e)}"
        })
        logger.error(f"❌ Raster layer API error: {e}")
        return False
# def create_street_image_from_task(project, user, s3_key, original_filename, status_dict, extra_data=None):
#     """Create street image using correct model fields and extract coordinates"""
#     try:
#         from project_api.models import StreetImage
#         from django.conf import settings
#         from project_api.street_image_utils import StreetImageProcessor
#         from django.contrib.gis.geos import Point
        
#         # Generate image name from original filename
#         image_name = original_filename.split('.')[0].replace(' ', '_').lower()
#         image_name = ''.join(c for c in image_name if c.isalnum() or c == '_')
        
#         # Generate unique filename (extract from s3_key)
#         unique_filename = s3_key.split('/')[-1]  # Get filename from S3 key
        
#         # Construct full S3 URL for file_path
#         bucket = settings.AWS_STORAGE_BUCKET_NAME
#         region = settings.AWS_S3_REGION_NAME
#         file_path = f"https://{bucket}.s3.{region}.amazonaws.com/{s3_key}"

#         processor = FileUploadProcessor()
#         file_size = processor.get_s3_file_size(s3_key)
        
#         # Check if unique_filename already exists
#         if StreetImage.objects.filter(unique_filename=unique_filename, project=project, is_active=True).exists():
#             status_dict.update({
#                 'status': 'failed',
#                 'error': f"StreetImage with filename {unique_filename} already exists"
#             })
#             logger.error(f"❌ Duplicate StreetImage filename: {unique_filename}")
#             return False
            
#         # Extract coordinates from image EXIF data
#         image_processor = StreetImageProcessor()
        
#         # Download image from S3 for EXIF processing
#         s3_client = processor.get_s3_client()
#         try:
#             response = s3_client.get_object(Bucket=bucket, Key=s3_key)
#             image_data = response['Body']
#             metadata = image_processor.extract_exif_metadata(image_data)
            
#             # Get location from metadata
#             location = metadata.get('location')
#             latitude = None
#             longitude = None
            
#             if location and isinstance(location, Point):
#                 latitude = location.y
#                 longitude = location.x
#             elif extra_data and 'latitude' in extra_data and 'longitude' in extra_data:
#                 # Use coordinates from extra_data if available
#                 try:
#                     latitude = float(extra_data['latitude'])
#                     longitude = float(extra_data['longitude'])
#                     location = Point(longitude, latitude, srid=4326)
#                 except (ValueError, TypeError):
#                     logger.warning(f"Invalid coordinates in extra_data for {unique_filename}")
            
#             logger.info(f"Extracted coordinates for {unique_filename}: lat={latitude}, lon={longitude}")
#         except Exception as e:
#             logger.warning(f"Failed to extract EXIF data from {unique_filename}: {e}")
#             latitude = None
#             longitude = None
#             location = None
        
#         # Create StreetImage with correct model fields including coordinates
#         # If coordinates are missing, use default values (0, 0) to satisfy not-null constraint
#         if latitude is None:
#             latitude = 0.0
#         if longitude is None:
#             longitude = 0.0
#         if location is None:
#             location = Point(longitude, latitude, srid=4326)
            
#         street_image = StreetImage.objects.create(
#             project=project,
#             unique_filename=unique_filename,
#             original_filename=original_filename,
#             file_path=file_path,
#             file_size=file_size,
#             image_type='front_view',
#             uploaded_by=user,
#             processing_status='pending',
#             is_active=True,
#             notes=f'Uploaded from {original_filename}',
#             latitude=latitude,
#             longitude=longitude,
#             location=location
#         )
        
#         # Update processing status to completed
#         street_image.processing_status = 'completed'
#         street_image.save()
        
#         # Add to GeoServer layer if location is available and not default coordinates
#         if street_image.location and not (street_image.latitude == 0.0 and street_image.longitude == 0.0):
#             try:
#                 # Add to street imagery layer
#                 image_processor.add_to_street_imagery_layer(street_image)
#                 logger.info(f"✅ Added street image to GeoServer layer: {street_image.id}")
#             except Exception as e:
#                 logger.error(f"❌ Failed to add street image to GeoServer layer: {e}")
#         else:
#             logger.info(f"⚠️ Skipping GeoServer layer for image {street_image.id}: Using default or no coordinates")
        
#         status_dict.update({
#             'status': 'completed',
#             'layer_created': True,
#             'layer_type': 'street',
#             'layer_id': str(street_image.id),
#             'layer_name': street_image.unique_filename,
#             'layer_data': {
#                 'id': str(street_image.id),
#                 'unique_filename': street_image.unique_filename,
#                 'original_filename': street_image.original_filename,
#                 'file_path': street_image.file_path,
#                 'image_type': street_image.image_type,
#                 'latitude': street_image.latitude,
#                 'longitude': street_image.longitude,
#                 'has_location': street_image.location is not None,
#                 'using_default_coordinates': latitude == 0.0 and longitude == 0.0
#             }
#         })
        
#         logger.info(f"✅ StreetImage created: {unique_filename} (ID: {street_image.id})")
#         return True
        
#     except Exception as e:
#         status_dict.update({
#             'status': 'failed',
#             'error': f"StreetImage creation error: {str(e)}"
#         })
#         logger.error(f"❌ StreetImage creation error: {e}")
#         return False

def create_street_image_from_task(project, user, s3_key, original_filename, status_dict, extra_data=None):
    """Enhanced street image creation with comprehensive EXIF metadata storage"""
    try:
        from project_api.models import StreetImage
        from project_api.geoserver_utils import StreetImageryLayerManager
        from django.contrib.gis.geos import Point
        from django.conf import settings
        
        # Extract coordinates from extra_data or EXIF
        latitude = extra_data.get('latitude') if extra_data else None
        longitude = extra_data.get('longitude') if extra_data else None
        
        # Extract comprehensive EXIF metadata
        metadata = {}
        if latitude is None or longitude is None:
            try:
                logger.info(f"Extracting comprehensive EXIF metadata for {original_filename}")
                
                from project_api.street_image_utils import StreetImageProcessor
                processor = StreetImageProcessor()
                
                response = processor.s3_client.get_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key
                )
                
                import io
                image_bytes = response['Body'].read()
                image_file = io.BytesIO(image_bytes)
                metadata = processor.extract_exif_metadata(image_file)
                
                if metadata.get('location'):
                    latitude = metadata.get('latitude')
                    longitude = metadata.get('longitude')
                    logger.info(f"✅ Extracted EXIF coordinates: ({latitude}, {longitude})")
                    
            except Exception as e:
                logger.error(f"EXIF extraction failed for {original_filename}: {e}")
        
        # Coordinate validation
        if latitude is None or longitude is None or (abs(float(latitude)) < 0.0001 and abs(float(longitude)) < 0.0001):
            status_dict.update({
                'status': 'failed',
                'error': 'Street images require valid GPS coordinates.'
            })
            return False
        
        # Create street image with all metadata
        unique_filename = s3_key.split('/')[-1]
        file_path = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
        
        street_image = StreetImage.objects.create(
            project=project,
            unique_filename=unique_filename,
            original_filename=original_filename,
            file_path=file_path,
            file_size=extra_data.get('file_size', 0) if extra_data else 0,
            
            # Location data
            latitude=float(latitude),
            longitude=float(longitude),
            location=Point(float(longitude), float(latitude), srid=4326),
            altitude=metadata.get('altitude'),
            altitude_ref=metadata.get('altitude_ref'),
            
            # Image type
            image_type=extra_data.get('image_type', 'front_view') if extra_data else 'front_view',
            
            # Camera information
            camera_make=metadata.get('camera_make'),
            camera_model=metadata.get('camera_model'),
            camera_serial=metadata.get('camera_serial'),
            lens_make=metadata.get('lens_make'),
            lens_model=metadata.get('lens_model'),
            
            # Camera settings
            focal_length=metadata.get('focal_length'),
            focal_length_35mm=metadata.get('focal_length_35mm'),
            f_number=metadata.get('f_number'),
            exposure_time=metadata.get('exposure_time'),
            iso_speed=metadata.get('iso_speed'),
            exposure_mode=metadata.get('exposure_mode'),
            white_balance=metadata.get('white_balance'),
            flash=metadata.get('flash'),
            
            # Image properties
            image_width=metadata.get('image_width'),
            image_height=metadata.get('image_height'),
            orientation=metadata.get('orientation'),
            color_space=metadata.get('color_space'),
            compression=metadata.get('compression'),
            
            # Sensor information
            sensor_width=metadata.get('sensor_width'),
            sensor_height=metadata.get('sensor_height'),
            pixel_x_dimension=metadata.get('pixel_x_dimension'),
            pixel_y_dimension=metadata.get('pixel_y_dimension'),
            
            # Dates
            captured_at=metadata.get('captured_at') or metadata.get('date_time_original'),
            date_time_original=metadata.get('date_time_original'),
            date_time_digitized=metadata.get('date_time_digitized'),
            
            # Orientation
            yaw=metadata.get('yaw'),
            pitch=metadata.get('pitch'),
            roll=metadata.get('roll'),
            
            # GPS additional
            gps_accuracy=metadata.get('gps_accuracy'),
            gps_speed=metadata.get('gps_speed'),
            gps_track=metadata.get('gps_track'),
            gps_img_direction=metadata.get('gps_img_direction'),
            gps_img_direction_ref=metadata.get('gps_img_direction_ref'),
            
            # Software and processing
            software=metadata.get('software'),
            uploaded_by=user,
            processing_status='completed',
            is_active=True,
            notes=extra_data.get('notes', '') if extra_data else ''
        )
        
        # Layer creation logic (your existing code)
        try:
            table_name = f"street_imagery_{str(project.id).replace('-', '_')}"
            _ensure_street_imagery_table_exists(project.id, table_name)
            _add_street_image_to_table(street_image, table_name)
            
            layer_manager = StreetImageryLayerManager(company_id=str(project.company.id))
            layer_created = layer_manager.get_or_create_project_street_layer(str(project.id))
            
            if layer_created:
                # **GENERATE WFS URL FOR STATUS RESPONSE**
                geoserver_manager = GeoServerManager()
                wfs_url = geoserver_manager.get_layer_url(
                    workspace=str(project.company.id),
                    layer_name=f"{str(project.id).replace('-', '_')}_street_imagery",
                    service_type='WFS'
                )
                logger.info(f"✅ Street imagery layer created with WFS URL: {wfs_url}")
                
        except Exception as layer_error:
            logger.warning(f"GeoServer layer creation failed but continuing: {layer_error}")
        
        # Update status
        status_dict.update({
            'status': 'completed',
            'layer_created': True,
            'layer_type': 'street',
            'layer_id': str(street_image.id),
            'layer_name': f"{str(project.id).replace('-', '_')}_street_imagery",
            'wfs_url': wfs_url,  # **WFS URL instead of WMS**
            'layer_data': {
                'id': str(street_image.id),
                'latitude': float(latitude),
                'longitude': float(longitude),
                'wfs_capabilities': wfs_url,
                'wfs_features': geoserver_manager.get_feature_url(
                    workspace=str(project.company.id),
                    layer_name=f"{str(project.id).replace('-', '_')}_street_imagery"
                ),
                'camera': street_image.camera_info,
                'settings': street_image.camera_settings,
                'has_valid_coordinates': True
            }
        })
        
        logger.info(f"✅ StreetImage created with comprehensive metadata: {original_filename}")
        return True
        
    except Exception as e:
        status_dict.update({
            'status': 'failed', 
            'error': f"StreetImage creation error: {str(e)}"
        })
        logger.error(f"❌ StreetImage creation error: {e}")
        return False



def _ensure_street_imagery_table_exists(project_id, table_name):
    """Ensure project-specific street imagery table exists"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = %s
            );
        """, [table_name])
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # Create table
            cursor.execute(f"""
                CREATE TABLE "{table_name}" (
                    id SERIAL PRIMARY KEY,
                    streetimage_id UUID NOT NULL UNIQUE,
                    project_id VARCHAR(255) NOT NULL,
                    original_filename VARCHAR(255) NOT NULL,
                    file_path TEXT NOT NULL,
                    latitude DOUBLE PRECISION NOT NULL,
                    longitude DOUBLE PRECISION NOT NULL,
                    geom GEOMETRY(POINT, 4326) NOT NULL,
                    image_type VARCHAR(50) DEFAULT 'front_view',
                    uploaded_at TIMESTAMP DEFAULT NOW(),
                    uploaded_by VARCHAR(255),
                    is_active BOOLEAN DEFAULT TRUE,
                    notes TEXT
                );
            """)
            
            # Create indexes
            cursor.execute(f'CREATE INDEX "idx_{table_name}_geom" ON "{table_name}" USING GIST (geom);')
            cursor.execute(f'CREATE INDEX "idx_{table_name}_project" ON "{table_name}" (project_id);')
            
            logger.info(f"✅ Created street imagery table: {table_name}")

def _add_street_image_to_table(street_image, table_name):
    """Add street image to project-specific table"""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute(f"""
            INSERT INTO "{table_name}"
            (streetimage_id, project_id, original_filename, file_path,
             latitude, longitude, geom, image_type, uploaded_at,
             uploaded_by, notes, is_active)
            VALUES (%s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                    %s, NOW(), %s, %s, %s)
            ON CONFLICT (streetimage_id) DO UPDATE SET
                file_path = EXCLUDED.file_path,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                geom = EXCLUDED.geom
        """, [
            str(street_image.id),
            str(street_image.project.id),
            street_image.original_filename,
            street_image.file_path,
            street_image.latitude,
            street_image.longitude,
            street_image.longitude,  # X coordinate for ST_MakePoint
            street_image.latitude,   # Y coordinate for ST_MakePoint
            street_image.image_type,
            street_image.uploaded_by.email if street_image.uploaded_by else None,
            street_image.notes or '',
            True
        ])
        
        logger.info(f"✅ Added street image to table {table_name}")



def _create_street_image_via_api(project, user, s3_key, original_filename, image_name, status_dict):
    """Fallback API method with proper DRF request"""
    try:
        from rest_framework.test import APIRequestFactory
        from .views import StreetImageUploadAPIView
        
        factory = APIRequestFactory()
        data = {
            'files': [{
                'filename': original_filename,
                'size': 0  # You can get actual size from S3 if needed
            }],
            'image_type': 'front_view',
            'notes': f'Uploaded from {original_filename}'
        }
        
        request = factory.post(
            f'/api/projects/{project.id}/street-images/upload/',
            data=data,
            format='json'
        )
        request.user = user
        
        view = StreetImageUploadAPIView()
        response = view.post(request, str(project.id))
        
        if response.status_code in [200, 201]:
            status_dict.update({
                'status': 'completed',
                'layer_created': True,
                'layer_type': 'street',
                'layer_data': response.data
            })
            logger.info(f"✅ StreetImage created via API: {image_name}")
            return True
        else:
            status_dict.update({
                'status': 'failed',
                'error': f"StreetImage API failed: {response.data}"
            })
            logger.error(f"❌ StreetImage API failed: {response.data}")
            return False
            
    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"StreetImage API error: {str(e)}"
        })
        logger.error(f"❌ StreetImage API error: {e}")
        return False

@shared_task(bind=True, max_retries=3)
def process_vector_layer(self, file_key, project_id, layer_name, created_by_id, title=None, description=None):
    """
    Celery task to process a vector layer asynchronously.
    
    Args:
        file_key (str): S3 key for the uploaded file.
        project_id (str): UUID of the project.
        layer_name (str): Name for the vector layer.
        created_by_id (str): ID of the user who uploaded the file.
        title (str, optional): Display title for the layer.
        description (str, optional): Description for the layer.
        
    Returns:
        dict: Dictionary with processing results.
    """
    logger.info(f"Processing vector layer: {file_key} for project {project_id}")
    
    try:
        # Get project and user objects
        try:
            project = Project.objects.get(id=project_id)
            created_by = User.objects.get(id=created_by_id)
        except Project.DoesNotExist:
            error_msg = f"Project with ID {project_id} not found."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
        except User.DoesNotExist:
            error_msg = f"User with ID {created_by_id} not found."
            logger.error(error_msg)
            return {
                "status": "error", 
                "message": error_msg,
                "task_id": self.request.id
            }
        
        # Check if layer name still doesn't exist (race condition check)
        if VectorLayer.objects.filter(project=project, name=layer_name, is_active=True, deleted_at__isnull=True).exists():
            error_msg = f"Layer name '{layer_name}' already exists in project."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
        
        # Process the file
        processor = VectorDataProcessor()
        vector_layer = processor.process_uploaded_file(
            file_key=file_key,
            project=project,
            layer_name=layer_name,
            created_by=created_by,
            title=title
        )
        
        # Update description if provided
        if description and vector_layer:
            vector_layer.description = description
            vector_layer.save()
        
        if vector_layer:
            logger.info(f"Successfully processed vector layer {layer_name} (ID: {vector_layer.id})")
            
            return {
                "status": "success",
                "message": f"Vector layer '{layer_name}' processed successfully.",
                "vector_layer_id": str(vector_layer.id),
                "layer_name": vector_layer.name,
                "title": vector_layer.title,
                "is_published": vector_layer.is_published,
                "geoserver_url": vector_layer.geoserver_url,
                "feature_count": vector_layer.feature_count,
                "task_id": self.request.id
            }
        else:
            error_msg = f"Failed to process vector layer: Unknown error"
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
            
    except Exception as e:
        logger.exception(f"Error in process_vector_layer task: {str(e)}")
        retry_count = self.request.retries
        
        # Exponential backoff: 60s, 120s, 240s
        retry_delay = 60 * (2 ** retry_count)
        
        # Retry logic
        if retry_count < self.max_retries:
            logger.info(f"Retrying task in {retry_delay} seconds (attempt {retry_count + 1}/{self.max_retries})")
            try:
                self.retry(countdown=retry_delay, exc=e)
            except Exception as retry_error:
                logger.error(f"Failed to retry task: {retry_error}")
        
        # Max retries exceeded
        error_msg = f"Failed to process vector layer after {self.max_retries} retries: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "task_id": self.request.id,
            "retries_attempted": retry_count
        }


@shared_task(bind=True, max_retries=3)
def process_raster_layer(self, file_key, project_id, file_name, description=None, user_id=None):
    """
    Celery task to process a raster layer asynchronously.
    
    Args:
        file_key (str): S3 key for the uploaded raster file.
        project_id (str): UUID of the project.
        file_name (str): Name for the raster layer.
        description (str, optional): Description for the layer.
        user_id (str, optional): ID of the user who uploaded the file.
        
    Returns:
        dict: Dictionary with processing results.
    """
    logger.info(f"Processing raster layer from S3: {file_key} for project {project_id}")
    
    try:
        # Get project and user objects
        try:
            project = Project.objects.get(id=project_id)
            user = User.objects.get(id=user_id) if user_id else None
        except Project.DoesNotExist:
            error_msg = f"Project with ID {project_id} not found."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
        except User.DoesNotExist:
            error_msg = f"User with ID {user_id} not found."
            logger.error(error_msg)
            return {
                "status": "error", 
                "message": error_msg,
                "task_id": self.request.id
            }
        
        # Check if raster layer name still doesn't exist (race condition check)
        if RasterLayer.objects.filter(project=project, file_name=file_name, is_active=True, deleted_at__isnull=True).exists():
            error_msg = f"Raster layer name '{file_name}' already exists in project."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
        
        # Process the raster file (downloads from S3, extracts metadata, creates DB record)
        processor = RasterDataProcessor()
        raster_layer = processor.process_uploaded_file(
            file_key=file_key,
            project=project,
            file_name=file_name,
            description=description or '',
            created_by=user
        )
        
        if raster_layer:
            logger.info(f"Successfully processed raster layer {file_name} (ID: {raster_layer.id})")
            
            return {
                "status": "success",
                "message": f"Raster layer '{file_name}' processed successfully.",
                "raster_layer_id": str(raster_layer.id),
                "file_name": raster_layer.file_name,
                "description": raster_layer.description,
                "is_published": raster_layer.is_published,
                "geoserver_url": raster_layer.geoserver_url or '',
                "s3_file_key": raster_layer.s3_file_key,
                "task_id": self.request.id
            }
        else:
            error_msg = f"Failed to process raster layer: Unknown error"
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
            
    except Exception as e:
        logger.exception(f"Error in process_raster_layer task: {str(e)}")
        retry_count = self.request.retries
        
        # Exponential backoff: 60s, 120s, 240s
        retry_delay = 60 * (2 ** retry_count)
        
        # Retry logic
        if retry_count < self.max_retries:
            logger.info(f"Retrying task in {retry_delay} seconds (attempt {retry_count + 1}/{self.max_retries})")
            try:
                self.retry(countdown=retry_delay, exc=e)
            except Exception as retry_error:
                logger.error(f"Failed to retry task: {retry_error}")
        
        # Max retries exceeded
        error_msg = f"Failed to process raster layer after {self.max_retries} retries: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "task_id": self.request.id,
            "retries_attempted": retry_count
        }



@shared_task(bind=True, max_retries=3, soft_time_limit=300, time_limit=600)
def process_street_images_upload(self, file_mappings, project_id, company_id, user_id):
    """
    Process street image uploads with EXIF extraction
    """
    logger.info(f"Starting street images upload task for project {project_id} with {len(file_mappings)} images")
    
    try:
        # Get required objects
        project = Project.objects.get(id=project_id)
        user = User.objects.get(id=user_id)
        
        from project_api.file_upload_utils import FileUploadProcessor
        from project_api.street_image_utils import StreetImageProcessor
        
        file_processor = FileUploadProcessor()
        image_processor = StreetImageProcessor()
        
        total_files = len(file_mappings)
        processed_files = 0
        failed_files = 0
        
        # Check for uploaded files (limited checks)
        max_checks = 3
        wait_interval = 15
        check_count = 0
        
        files_status = []
        
        # Initialize file status
        for file_mapping in file_mappings:
            files_status.append({
                'original_filename': file_mapping['original_filename'],
                's3_key': file_mapping['s3_key'],
                'status': 'waiting_for_upload',
                'image_created': False,
                'error': None
            })
        
        # Wait for files with limited checks
        while check_count < max_checks:
            check_count += 1
            uploaded_count = 0
            
            logger.info(f"Street image check #{check_count}/{max_checks}")
            
            for i, file_mapping in enumerate(file_mappings):
                if files_status[i]['status'] == 'waiting_for_upload':
                    if file_processor.verify_file_upload(file_mapping['s3_key']):
                        files_status[i]['status'] = 'uploaded'
                        uploaded_count += 1
                        logger.info(f"✓ Street image uploaded: {file_mapping['original_filename']}")
                elif files_status[i]['status'] == 'uploaded':
                    uploaded_count += 1
            
            # Update progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'stage': 'checking_uploads',
                    'total_files': total_files,
                    'uploaded_files': uploaded_count,
                    'processed_files': 0,
                    'failed_files': 0,
                    'files_status': files_status,
                    'check_count': check_count
                }
            )
            
            if uploaded_count == total_files:
                logger.info(f"✓ All {total_files} street images uploaded")
                break
            
            if check_count == 1 and uploaded_count == 0:
                logger.warning("No street images found on first check")
                break
            
            if check_count < max_checks:
                time.sleep(wait_interval)
        
        if uploaded_count == 0:
            return {
                'status': 'failed',
                'error': 'No street images were uploaded to S3',
                'total_files': total_files,
                'processed_files': 0,
                'failed_files': total_files,
                'files_status': files_status
            }
        
        # Process uploaded images
        logger.info(f"Processing {uploaded_count} uploaded street images")
        
        self.update_state(
            state='PROGRESS',
            meta={
                'stage': 'processing_images',
                'total_files': total_files,
                'uploaded_files': uploaded_count,
                'processed_files': 0,
                'failed_files': 0,
                'files_status': files_status
            }
        )
        
        for i, file_mapping in enumerate(file_mappings):
            if files_status[i]['status'] != 'uploaded':
                files_status[i]['status'] = 'failed'
                files_status[i]['error'] = 'Image was not uploaded to S3'
                failed_files += 1
                continue
            
            try:
                files_status[i]['status'] = 'processing'
                
                # Download image from S3 for processing
                s3_key = file_mapping['s3_key']
                
                # Get image from S3
                response = file_processor.s3_client.get_object(
                    Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                    Key=s3_key
                )
                image_data = response['Body']
                
                # Process the street image
                street_image = image_processor.process_street_image_from_s3(
                    s3_key=s3_key,
                    project=project,
                    unique_filename=file_mapping['unique_filename'],
                    original_filename=file_mapping['original_filename'],
                    uploaded_by=user,
                    image_type=file_mapping.get('image_type', 'front_view'),
                    notes=file_mapping.get('notes', ''),
                    file_size=file_mapping.get('file_size', 0)
                )
                
                files_status[i].update({
                    'status': 'completed',
                    'image_created': True,
                    'image_id': str(street_image.id),
                    'has_gps': bool(street_image.location),
                    'has_exif': any([
                        street_image.camera_make,
                        street_image.camera_model,
                        street_image.focal_length,
                        street_image.captured_at
                    ])
                })
                
                processed_files += 1
                logger.info(f"✓ Street image processed: {file_mapping['original_filename']}")
                
            except Exception as e:
                files_status[i].update({
                    'status': 'failed',
                    'error': f"Processing failed: {str(e)}"
                })
                failed_files += 1
                logger.error(f"✗ Street image processing failed: {e}")
        
        # Final result
        result = {
            'status': 'completed',
            'total_files': total_files,
            'processed_files': processed_files,
            'failed_files': failed_files,
            'files_status': files_status,
            'summary': {
                'street_images_created': len([f for f in files_status if f.get('image_created')]),
                'images_with_gps': len([f for f in files_status if f.get('has_gps')]),
                'images_with_exif': len([f for f in files_status if f.get('has_exif')])
            }
        }
        
        logger.info(f"🎉 Street images upload completed: {processed_files} processed, {failed_files} failed")
        return result
        
    except Exception as e:
        logger.error(f"💥 Error in street images upload task: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'total_files': len(file_mappings) if 'file_mappings' in locals() else 0
        }



@shared_task(bind=True, max_retries=3, soft_time_limit=900, time_limit=1000)
def process_terrain_layer(self, file_key, project_id, file_name, terrain_type='DEM', description=None, user_id=None):
    """
    Celery task to process a terrain layer asynchronously.
    """
    logger.info(f"Processing terrain layer from S3: {file_key} for project {project_id}")
    start_time = time.time()
    
    try:
        # Get project and user objects
        try:
            project = Project.objects.get(id=project_id)
            user = User.objects.get(id=user_id) if user_id else None
        except Project.DoesNotExist:
            error_msg = f"Project with ID {project_id} not found."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }
        except User.DoesNotExist:
            error_msg = f"User with ID {user_id} not found."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }

        # Check if terrain model name already exists
        if TerrainModel.objects.filter(project=project, file_name=file_name, is_active=True, deleted_at__isnull=True).exists():
            error_msg = f"Terrain model name '{file_name}' already exists in project."
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }

        # Process the terrain file
        processor = TerrainDataProcessor()
        terrain_model = processor.process_uploaded_file(
            file_key=file_key,
            project=project,
            file_name=file_name,
            terrain_type=terrain_type,
            description=description or '',
            created_by=user
        )

        if terrain_model:
            logger.info(f"Successfully processed terrain model {file_name} (ID: {terrain_model.id})")
            end_time = time.time()
            logger.info(f"Terrain model processing for '{file_name}' took {end_time - start_time:.2f} seconds.")
            return {
                "status": "success",
                "message": f"Terrain model '{file_name}' processed successfully.",
                "terrain_model_id": str(terrain_model.id),
                "file_name": terrain_model.file_name,
                "terrain_type": terrain_model.terrain_type,
                "is_published": terrain_model.is_published,
                "geoserver_url": terrain_model.geoserver_url or '',
                "s3_file_key": terrain_model.s3_file_key,
                "task_id": self.request.id
            }
        else:
            error_msg = f"Failed to process terrain model: Unknown error"
            logger.error(error_msg)
            return {
                "status": "error",
                "message": error_msg,
                "task_id": self.request.id
            }

    except SoftTimeLimitExceeded:
        logger.error(f"⏰ Soft time limit exceeded while processing terrain model '{file_name}'.")
        return {
            "status": "timeout",
            "message": f"Processing failed for terrain model '{file_name}' due to a timeout.",
            "task_id": self.request.id
        }
    except Exception as e:
        logger.exception(f"Error in process_terrain_layer task: {str(e)}")
        retry_count = self.request.retries
        
        # Retry logic with exponential backoff
        if retry_count < self.max_retries:
            retry_delay = 60 * (2 ** retry_count)
            logger.info(f"Retrying terrain task in {retry_delay} seconds (attempt {retry_count + 1}/{self.max_retries})")
            try:
                self.retry(countdown=retry_delay, exc=e)
            except Exception as retry_error:
                logger.error(f"Failed to retry task: {retry_error}")
        
        # Max retries exceeded
        error_msg = f"Failed to process terrain model after {self.max_retries} retries: {str(e)}"
        logger.error(error_msg)
        return {
            "status": "error",
            "message": error_msg,
            "task_id": self.request.id,
            "retries_attempted": retry_count
        }

def create_terrain_model_from_task(project, user, s3_key, original_filename, status_dict):
    """Create terrain model via direct processor call"""
    try:
        file_name = original_filename.split('.')[0].replace(' ', '_').lower()
        file_name = ''.join(c for c in file_name if c.isalnum() or c == '_')

        # Ensure unique file name
        base_file_name = file_name
        counter = 1
        while project.terrain_models.filter(file_name=file_name, is_active=True).exists():
            file_name = f"{base_file_name}_{counter}"
            counter += 1

        # Determine terrain type from filename
        terrain_type = 'DEM'  # Default
        filename_lower = original_filename.lower()
        if 'dsm' in filename_lower:
            terrain_type = 'DSM'
        elif 'dtm' in filename_lower:
            terrain_type = 'DTM'

        # Process using TerrainDataProcessor
        try:
            from project_api.terrain_utils import TerrainDataProcessor
            processor = TerrainDataProcessor()
            
            terrain_model = processor.process_uploaded_file(
                file_key=s3_key,
                project=project,
                file_name=file_name,
                terrain_type=terrain_type,
                description=f'Uploaded from {original_filename}',
                created_by=user
            )

            if terrain_model:
                status_dict.update({
                    'status': 'completed',
                    'layer_created': True,
                    'layer_type': 'terrain',
                    'layer_id': str(terrain_model.id),
                    'layer_name': terrain_model.file_name,
                    'layer_data': {
                        'id': str(terrain_model.id),
                        'file_name': terrain_model.file_name,
                        'terrain_type': terrain_model.terrain_type,
                        'is_published': terrain_model.is_published,
                        'geoserver_url': terrain_model.geoserver_url or '',
                        's3_file_key': terrain_model.s3_file_key
                    }
                })
                logger.info(f"✅ Terrain model created via processor: {file_name}")
                return True
            else:
                status_dict.update({
                    'status': 'failed',
                    'error': "Terrain processor returned None"
                })
                logger.error(f"❌ Terrain processor returned None for: {file_name}")
                return False

        except Exception as processor_error:
            logger.error(f"❌ Terrain processor error: {processor_error}")
            status_dict.update({
                'status': 'failed',
                'error': f"Terrain processing error: {str(processor_error)}"
            })
            return False

    except Exception as e:
        status_dict.update({
            'status': 'failed',
            'error': f"Terrain model creation error: {str(e)}"
        })
        logger.error(f"❌ Terrain model creation error: {e}")
        return False
