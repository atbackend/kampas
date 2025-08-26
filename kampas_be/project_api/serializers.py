from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer, GeoFeatureModelSerializer
from .models import Project, GroupType, GroupTag, CoordinateReferenceSystem, VectorLayer, VectorFeature, RasterGroupTag, RasterLayer, StreetImage, TerrainModel
from kampas_be.company_api.models import Client, Company  
from kampas_be.auth_app.models import CustomUser
from kampas_be.company_api.serializers import ClientSerializer
from kampas_be.project_api.vector_utils import VectorDataProcessor

# -----------------------------------------------------------------------------
# ProjectSerializer handles serialization and validation for the Project model.
# - Provides custom output for related fields.
# - Sets created_by, modified_by from the request user.
# - Ensures audit fields are set automatically.
# -----------------------------------------------------------------------------
# ProjectSerializer handles serialization and validation for the Project model.
# - Provides custom output for related fields.
# - Sets created_by, modified_by from the request user.
# - Ensures audit fields are set automatically.
class ProjectSerializer(serializers.ModelSerializer):
    client_details = ClientSerializer(source='client', read_only=True)
    client_company_name = serializers.CharField(source='client.company.company_name', read_only=True)
    project_head_name = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    modified_by = serializers.PrimaryKeyRelatedField(read_only=True)
    company_name = serializers.CharField(source='company.company_name', read_only=True)
    manager_names = serializers.SerializerMethodField()
    reviewer_names = serializers.SerializerMethodField()
    editor_names = serializers.SerializerMethodField()
    viewer_names = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'project_name', 'client', 'client_details', 'client_company_name', 
            'company', 'company_name', 'project_head', 'project_head_name',
            'managers', 'manager_names', 'reviewers', 'reviewer_names',
            'editors', 'editor_names', 'viewers', 'viewer_names',
            'description', 'quantity', 'unit', 'start_date', 'end_date', 
            'status', 'is_active', 'created_at', 'created_by', 
            'modified_at', 'modified_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'modified_at', 'modified_by']


    def get_project_head_name(self, obj):
        if obj.project_head:
            return f"{obj.project_head.first_name} {obj.project_head.last_name}".strip()
        return None

    def get_manager_names(self, obj):
        return [f"{user.first_name} {user.last_name}".strip() for user in obj.managers.all()]

    def get_reviewer_names(self, obj):
        return [f"{user.first_name} {user.last_name}".strip() for user in obj.reviewers.all()]

    def get_editor_names(self, obj):
        return [f"{user.first_name} {user.last_name}".strip() for user in obj.editors.all()]

    def get_viewer_names(self, obj):
        return [f"{user.first_name} {user.last_name}".strip() for user in obj.viewers.all()]

    def validate(self, attrs):
        # Get the user making the request
        user = self.context['request'].user
        
        # Get company from attrs, instance, or requesting user
        company = attrs.get('company') or getattr(self.instance, 'company', None) or user.company

        # Ensure project is created for user's own company
        if 'company' in attrs and attrs['company'].id != user.company.id:
            raise serializers.ValidationError("You can only create projects for your own company.")

        # Ensure client belongs to the user's company
        # if 'client' in attrs:
        #     client_company = attrs['client'].company
        #     if client_company.id != user.company.id:
        #         raise serializers.ValidationError("Client must belong to your company.")

        # Ensure project_head belongs to the company and has appropriate role
        if 'project_head' in attrs:
            project_head = attrs['project_head']
            project_head_company = project_head.company
            target_company = attrs.get('company', company)
            
            if project_head_company.id != target_company.id:
                raise serializers.ValidationError("Project head must belong to the same company as the project.")
                
            if not (project_head.role == 'manager' or project_head.role == 'admin'):
                raise serializers.ValidationError("Project head must have a manager or admin role.")

        # Ensure managers, editors, and viewers belong to the same company
        if company:
            for field_name in ['managers', 'reviewers', 'editors']:
                if field_name in attrs:
                    for user in attrs[field_name]:
                        if user.company != company:
                            raise serializers.ValidationError(f"{user.email} in {field_name} does not belong to the project's company.")
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data.setdefault('created_by', user)
        validated_data.setdefault('modified_by', user)
        validated_data.setdefault('company', user.company)

        # Pop many-to-many fields
        m2m_fields = {}
        for field in ['managers', 'reviewers', 'editors', 'viewers']:
            m2m_fields[field] = validated_data.pop(field, [])

        project = Project.objects.create(**validated_data)

        for field, users in m2m_fields.items():
            getattr(project, field).set(users)

        return project

    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['modified_by'] = user

        # Pop many-to-many fields
        m2m_fields = {}
        for field in ['managers', 'reviewers', 'editors', 'viewers']:
            m2m_fields[field] = validated_data.pop(field, None)

        # Regular field update
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update M2M fields
        for field, users in m2m_fields.items():
            if users is not None:
                getattr(instance, field).set(users)

        return instance


# GroupTypeSerializer handles serialization for the GroupType model.
class GroupTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupType
        fields = ['id', 'name', 'project', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)


# GroupTagSerializer handles serialization for the GroupTag model.
class GroupTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupTag
        fields = ['id', 'name', 'group_type', 'created_by', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']
    
    def create(self, validated_data):
        # Set the created_by field to the current user
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)


# CoordinateReferenceSystemSerializer handles serialization for the CoordinateReferenceSystem model.
class CoordinateReferenceSystemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoordinateReferenceSystem
        fields = ['code', 'name', 'proj_string']





class VectorLayerSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = VectorLayer
        fields = [
            'id', 'name', 'title', 'display_name', 'geometry_type', 'project', 
            'created_by', 'created_by_name', 'description', 'crs',
            'geoserver_layer_name', 'geoserver_url', 'is_published',
            's3_file_key', 'feature_count', 'created_at', 'updated_at', 
            'group_tags', 'is_active'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'feature_count', 
            'geoserver_layer_name', 'geoserver_url', 'is_published'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Ensure project belongs to user's company
        if 'project' in attrs:
            project = attrs['project']
            if project.company != user.company:
                raise serializers.ValidationError("Project must belong to your company.")
        
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

class VectorLayerListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing layers"""
    created_by_name = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = VectorLayer
        fields = [
            'id', 'name', 'title', 'display_name', 'geometry_type',
            'geoserver_url', 'feature_count', 'created_by_name', 'created_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
        return None

class LayerUploadSerializer(serializers.Serializer):
    """Serializer for handling layer file uploads"""
    file_key = serializers.CharField(max_length=500)
    layer_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_file_key(self, value):
        """Validate file extension"""
        allowed_extensions = ['.geojson', '.zip']
        if not any(value.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Only GeoJSON (.geojson) and Shapefile ZIP (.zip) files are supported."
            )
        return value
    
    def validate_layer_name(self, value):
        """Validate layer name format if provided"""
        if value:  # Only validate if provided
            import re
            if not re.match(r'^[a-zA-Z0-9_]+$', value):
                raise serializers.ValidationError(
                    "Layer name can only contain letters, numbers, and underscores."
                )
        return value
    
    def validate(self, attrs):
        """Extract layer name from file if not provided"""
        if not attrs.get('layer_name'):
            # Extract layer name from file_key
            processor = VectorDataProcessor()
            attrs['layer_name'] = processor.extract_layer_name_from_file_key(attrs['file_key'])
        
        return attrs

class VectorLayerUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating layer metadata (not spatial data)"""
    class Meta:
        model = VectorLayer
        fields = ['name', 'title', 'description', 'group_tags']
    
    def validate_name(self, value):
        """Validate layer name format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "Layer name can only contain letters, numbers, and underscores."
            )
        return value

class VectorFeatureSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = VectorFeature
        geo_field = 'geom'  # Changed from 'geometry' to 'geom' to match your model
        fields = '__all__'

class RasterGroupTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = RasterGroupTag
        fields = '__all__'

class RasterLayerSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    s3_url = serializers.ReadOnlyField()  # Add the property as a read-only field
    display_name = serializers.ReadOnlyField(source='file_name')
    
    class Meta:
        model = RasterLayer
        fields = [
            'id', 'project', 'file_name', 'description', 's3_file_key', 's3_url',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at', 'crs', 'bounding_box',
            'pixel_size', 'width', 'height', 'band_count', 'band_descriptions',
            'geoserver_layer_name', 'geoserver_url', 'is_published', 'group_tag',
            'is_active', 'deleted_at', 'project_name', 'display_name'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'crs', 'bounding_box', 'pixel_size', 'width',
            'height', 'band_count', 'band_descriptions', 'geoserver_layer_name',
            'geoserver_url', 'is_published', 's3_url'
        ]
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
        return None
    
    def get_project_name(self, obj):
        if obj.project:
            return obj.project.project_name
        return None

class RasterLayerCreateSerializer(serializers.Serializer):
    """Serializer for handling raster layer file uploads"""
    file_key = serializers.CharField(max_length=500, help_text="S3 key for the uploaded raster file")
    file_name = serializers.CharField(max_length=255, help_text="Name for the raster layer")
    description = serializers.CharField(required=False, allow_blank=True, help_text="Optional description")
    
    def validate_file_key(self, value):
        """Validate file extension"""
        allowed_extensions = ['.tif', '.tiff', '.geotiff', '.jp2', '.png', '.jpg', '.jpeg']
        if not any(value.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Unsupported file format. Supported formats: TIFF, GeoTIFF, JPEG2000, PNG, JPEG"
            )
        return value
    
    def validate_file_name(self, value):
        """Validate file name format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "File name can only contain letters, numbers, and underscores."
            )
        return value

class RasterLayerUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating raster layer metadata (not file data)"""
    class Meta:
        model = RasterLayer
        fields = ['file_name', 'description', 'group_tag']
    
    def validate_file_name(self, value):
        """Validate file name format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "File name can only contain letters, numbers, and underscores."
            )
        return value




class StreetImageSerializer(serializers.ModelSerializer):
    """Serializer for StreetImage model"""
    location_lat = serializers.SerializerMethodField()
    location_lng = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    geoserver_layer_url = serializers.SerializerMethodField()

    class Meta:
        model = StreetImage
        fields = [
            'id', 'project', 'unique_filename', 'original_filename', 'file_path',
            'file_size', 'latitude', 'longitude', 'location', 'image_type',
            'captured_at', 'altitude', 'processing_status', 'notes',
            'uploaded_by_name', 'uploaded_at', 'updated_at', 'is_active',
            'is_published', 'geoserver_layer_url', 'location_lat', 'location_lng'
        ]
        read_only_fields = [
            'id', 'unique_filename', 'file_path', 'file_size', 'uploaded_at',
            'updated_at', 'processing_status', 'geoserver_layer_url'
        ]
    def get_location_lat(self, obj):
        return obj.location.y if obj.location else None
    
    def get_location_lng(self, obj):
        return obj.location.x if obj.location else None

    
    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None
        
    def get_geoserver_layer_url(self, obj):
        """Get the GeoServer WFS layer URL for the street imagery layer"""
        from django.conf import settings
        company_id = obj.project.company.id
        project_id = obj.project.id
        layer_name = f"{project_id}_street_imagery"
        
        # **CONSTRUCT WFS URL INSTEAD OF WMS**
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        wfs_url = f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"
        
        return wfs_url

class StreetImageGeoSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for StreetImage model"""
    uploaded_by_name = serializers.SerializerMethodField()
    geoserver_layer_url = serializers.SerializerMethodField()
    
    class Meta:
        model = StreetImage
        geo_field = 'location'
        fields = [
            'id', 'unique_filename', 'original_filename', 'file_path',
            'image_type', 'captured_at', 'altitude', 'uploaded_by_name', 
            'uploaded_at', 'geoserver_layer_url'
        ]
    
    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None
        
    def get_geoserver_layer_url(self, obj):
        """Get the GeoServer layer URL for the street imagery layer"""
        from django.conf import settings
        company_id = obj.project.company.id
        project_id = obj.project.id
        layer_name = f"{project_id}_street_imagery"
        
        # Construct the GeoServer URL
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        layer_url = f"{geoserver_url}/{company_id}/wms?service=WMS&version=1.1.0&request=GetMap&layers={layer_name}"
        
        return layer_url

class StreetImageryLayerSerializer(serializers.Serializer):
    """Serializer for street imagery layer information"""
    layer_name = serializers.CharField(read_only=True)
    layer_url = serializers.CharField(read_only=True)
    project_id = serializers.UUIDField(read_only=True)
    company_id = serializers.UUIDField(read_only=True)
    image_count = serializers.IntegerField(read_only=True)
    
    def to_representation(self, instance):
        """Custom representation for the street imagery layer"""
        from django.conf import settings
        from django.db import connection
        
        project_id = instance.id
        company_id = instance.company.id
        layer_name = f"{project_id}_street_imagery"
        
        # Get the image count from the database
        # with connection.cursor() as cursor:
        #     cursor.execute(
        #         "SELECT COUNT(*) FROM street_imagery WHERE project_id = %s",
        #         [project_id]
        #     )
        #     image_count = cursor.fetchone()[0]
        
        # Construct the GeoServer URL
        geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        wfs_capabilities_url = f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetCapabilities"
        wfs_features_url = f"{geoserver_url}/{company_id}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={company_id}:{layer_name}&outputFormat=application/json"
        
        return {
            'layer_name': layer_name,
            'wfs_capabilities_url': wfs_capabilities_url,  # **WFS Capabilities**
            'wfs_features_url': wfs_features_url,          # **WFS GetFeature**
            'wfs_layer_url': wfs_features_url,             # **Main WFS URL**
            'project_id': project_id,
            'company_id': company_id,
            # 'image_count': image_count
        }


class StreetImageUploadSerializer(serializers.Serializer):
    files = serializers.ListField(child=serializers.DictField())
    # Make coordinates optional but recommended
    latitude = serializers.FloatField(
        required=False,  # Change to False
        min_value=-90, max_value=90,
        help_text="Latitude in decimal degrees (recommended if image lacks GPS)"
    )
    longitude = serializers.FloatField(
        required=False,  # Change to False
        min_value=-180, max_value=180,
        help_text="Longitude in decimal degrees (recommended if image lacks GPS)"
    )
    image_type = serializers.ChoiceField(
        choices=['front_view', 'panorama', 'side_view', 'rear_view'],
        default='front_view'
    )
    notes = serializers.CharField(required=False, allow_blank=True)




class TerrainModelSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    s3_url = serializers.ReadOnlyField()
    display_name = serializers.ReadOnlyField(source='file_name')

    class Meta:
        model = TerrainModel
        fields = [
            'id', 'project', 'file_name', 'terrain_type', 'file_type', 'description',
            's3_file_key', 's3_url', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'crs', 'bounding_box', 'pixel_size', 'width', 'height', 'min_elevation',
            'max_elevation', 'elevation_unit', 'geoserver_layer_name', 'geoserver_url',
            'is_published', 'group_tag', 'is_active', 'deleted_at', 'project_name',
            'display_name'
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'crs', 'bounding_box', 'pixel_size', 'width',
            'height', 'min_elevation', 'max_elevation', 'geoserver_layer_name',
            'geoserver_url', 'is_published', 's3_url'
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name}".strip()
        return None

    def get_project_name(self, obj):
        if obj.project:
            return obj.project.project_name
        return None

class TerrainModelCreateSerializer(serializers.Serializer):
    """Serializer for handling terrain model file uploads"""
    file_key = serializers.CharField(max_length=500, help_text="S3 key for the uploaded terrain file")
    file_name = serializers.CharField(max_length=255, help_text="Name for the terrain model")
    terrain_type = serializers.ChoiceField(choices=TerrainModel.TERRAIN_TYPE_CHOICES, default='DEM')
    description = serializers.CharField(required=False, allow_blank=True, help_text="Optional description")

    def validate_file_key(self, value):
        """Validate file extension for terrain files"""
        allowed_extensions = ['.tif', '.tiff', '.asc', '.xyz', '.dem', '.dtm', '.dsm']
        if not any(value.lower().endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Unsupported file format. Supported formats: TIFF, ASCII Grid, XYZ, DEM"
            )
        return value

    def validate_file_name(self, value):
        """Validate file name format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "File name can only contain letters, numbers, and underscores."
            )
        return value

class TerrainModelUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating terrain model metadata"""
    class Meta:
        model = TerrainModel
        fields = ['file_name', 'terrain_type', 'description', 'group_tag']

    def validate_file_name(self, value):
        """Validate file name format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError(
                "File name can only contain letters, numbers, and underscores."
            )
        return value
