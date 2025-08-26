import random
import string
import uuid
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.db import models as geomodels
from kampas_be.company_api.models import Company, Client
from kampas_be.auth_app.models import CustomUser
from kampas_be.kampas_be.storage_backends import create_project_folder
from kampas_be.project_api.geoserver_utils import get_geoserver_manager, GeoServerManager
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

def generate_unique_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=25))

# Project Model
# Represents a project within the system, associated with a company and managed by various user roles.
# It includes details like project name, client, description, and status.
# S3 folder creation is triggered upon project creation.
class Project(models.Model):
    STATUS_CHOICES = [
        ('In Progress', 'In Progress'),
        ('On Hold', 'On Hold'),
        ('Completed', 'Completed')
    ]

    UNIT_CHOICES = [
        ('Kilometer', 'Kilometer'),
        ('Square Kilometer', 'Square Kilometer'),
        ('Count', 'Count'),
    ]
    
    id = models.CharField(max_length=25, primary_key=True, default=generate_unique_id, editable=False)
    project_name = models.CharField(max_length=200)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='projects')
    project_head = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, related_name='headed_projects', null=True, blank=True)
    managers = models.ManyToManyField(CustomUser, related_name='managed_projects', blank=True)
    reviewers = models.ManyToManyField(CustomUser, related_name='reviewed_projects', blank=True)
    editors = models.ManyToManyField(CustomUser, related_name='edited_projects', blank=True)
    viewers = models.ManyToManyField(CustomUser, related_name='viewed_projects', blank=True)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unit = models.CharField(max_length=50, choices=UNIT_CHOICES, blank=True, null=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='In Progress')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, related_name='created_projects', null=True, blank=True)
    modified_at = models.DateTimeField(auto_now=True)
    modified_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, related_name='modified_projects', null=True, blank=True)



    def __str__(self):
        return self.project_name
        
    def save(self, *args, **kwargs):
        """Enhanced save method with proper GeoServer layer creation"""
        is_new = self._state.adding
        logger.info(f"Saving project: {self.project_name}, is_new: {is_new}")
        
        # Call the parent save method first
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(f"Creating resources for new project: {self.id}")
            
            # **HELPER FUNCTION TO SANITIZE IDENTIFIERS**
            def sanitize_identifier(name: str) -> str:
                """Sanitize project ID for use as SQL identifier"""
                import re
                sanitized = re.sub(r'[^0-9a-zA-Z_]', '_', str(name))
                if re.match(r'^\d', sanitized):
                    sanitized = f'prj_{sanitized}'
                return sanitized
            
            safe_project_id = sanitize_identifier(self.id)
            
            # Create GeoServer datastore and layer groups
            try:
                from project_api.geoserver_utils import get_geoserver_manager
                geoserver_manager = get_geoserver_manager()
                
                # Create project datastore
                datastore_created = geoserver_manager.create_project_store(self.company.id, self.id)
                
                if datastore_created:
                    logger.info(f"Successfully created GeoServer datastore for project: {self.id}")
                    
                    # **FIXED: Skip layer group creation during project creation**
                    # Layer groups will be created automatically when the first layer of each type is added
                    logger.info(f"GeoServer datastore created successfully. Layer groups will be created when layers are added.")
                else:
                    logger.error(f"Failed to create GeoServer datastore for project: {self.id}")
                    
            except Exception as e:
                logger.error(f"Error creating GeoServer resources: {e}")
            
            # Create S3 folder structure (your existing code)
            try:
                from kampas_be.storage_backends import create_project_folder
                folder_created = create_project_folder(self.id, self.company.id)
                if folder_created:
                    logger.info(f"Successfully created S3 folder structure")
            except Exception as e:
                logger.error(f"Error creating S3 structure: {e}")
            
            # Create street imagery layer (your existing code)
            try:
                from project_api.geoserver_utils import StreetImageryLayerManager
                street_layer_manager = StreetImageryLayerManager(company_id=self.company.id)
                layer_created = street_layer_manager.get_or_create_project_street_layer(str(self.id))
                if layer_created:
                    logger.info(f"Successfully created street imagery layer")
            except Exception as e:
                logger.error(f"Error creating street imagery layer: {e}")



    class Meta:
        verbose_name_plural = "Projects"
        unique_together = ['project_name', 'company']  # Unique project names within a company
        ordering = ['-created_at']


# GroupType Model
# Defines categories for organizing GroupTags within a project.
# Examples: "Capture Date", "Zone".
class GroupType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g., "Capture Date", "Zone"
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='group_types')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.project.project_name}"


# GroupTag Model
# Represents specific tags within a GroupType, used for further categorization.
# Examples: "Zone 1", "2023-01-15".
class GroupTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g., "Zone 1"
    group_type = models.ForeignKey(GroupType, on_delete=models.CASCADE, related_name='tags')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.group_type.name}"


# CoordinateReferenceSystem Model
# Stores information about different Coordinate Reference Systems (CRS).
# Used to define the spatial reference for geographic data.
class CoordinateReferenceSystem(models.Model):
    code = models.CharField(max_length=50, unique=True)  # e.g., "EPSG:32643"
    name = models.CharField(max_length=100, blank=True)  # e.g., "UTM Zone 43N"
    proj_string = models.TextField(blank=True)           # Optional: full proj4 string
    
    def __str__(self):
        return f"{self.code} - {self.name}"



# Vector Layer Model for GeoServer Integration
# VectorLayer Model
# Represents a vector data layer, integrating with GeoServer for publishing.
# Stores metadata, geometry type, and publishing status.
class VectorLayer(models.Model):
    GEOMETRY_TYPE_CHOICES = [
        ('Point', 'Point'),
        ('LineString', 'LineString'),
        ('Polygon', 'Polygon'),
        ('MultiPoint', 'MultiPoint'),
        ('MultiLineString', 'MultiLineString'),
        ('MultiPolygon', 'MultiPolygon'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)  # Layer name in database
    title = models.CharField(max_length=255, blank=True)  # Display title
    geometry_type = models.CharField(max_length=20, choices=GEOMETRY_TYPE_CHOICES)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='vector_layers')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    description = models.TextField(blank=True)
    crs = models.CharField(max_length=50, default="EPSG:4326")
    
    # GeoServer related fields
    geoserver_layer_name = models.CharField(max_length=255, blank=True)  # Layer name in GeoServer
    geoserver_url = models.CharField(max_length=500, blank=True, null=True)  # Full GeoServer layer URL
    is_published = models.BooleanField(default=False)  # Whether published in GeoServer
    
    # File and metadata
    s3_file_key = models.CharField(max_length=500, blank=True, null=True)
    feature_count = models.IntegerField(default=0)
    bbox = gis_models.PolygonField(srid=4326, null=True, blank=True)
    
    # Timestamps and tags
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    group_tags = models.ManyToManyField(GroupTag, blank=True, related_name='vector_layers')
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when layer was marked for deletion")
    
    class Meta:
        unique_together = ('project', 'name')
        ordering = ['-created_at']
        verbose_name_plural = "Vector Layers"
    
    def __str__(self):
        return f"{self.title or self.name} ({self.geometry_type}) - {self.project.project_name}"
    
    @property
    def display_name(self):
        return self.title or self.name

    @property
    def is_permanently_deletable(self):
        """Check if layer can be permanently deleted (7+ days after soft delete)"""
        if not self.deleted_at:
            return False
        return timezone.now() > (self.deleted_at + timedelta(days=7))
    
    @property
    def days_until_permanent_deletion(self):
        """Returns days remaining until permanent deletion"""
        if not self.deleted_at:
            return None
        deletion_date = self.deleted_at + timedelta(days=7)
        remaining = deletion_date - timezone.now()
        return max(0, remaining.days)

# VectorFeature Model
# Represents an individual geographic feature within a VectorLayer.
# Stores the geometry and a flexible JSON field for attributes.
class VectorFeature(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    layer = models.ForeignKey(VectorLayer, on_delete=models.CASCADE, related_name='features')
    geom = gis_models.GeometryField(srid=4326)
    attributes = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Feature {self.id} - {self.layer.name}"



# RasterGroupTag Model
# Represents specific tags for raster layers, used for categorization.
class RasterGroupTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # e.g., "Orthomosaic", "DEM"
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='raster_group_tags')
    created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.project.project_name}"


# RasterLayer Model
# Represents a raster data layer, integrating with GeoServer for publishing.
# Stores metadata, band information, and publishing status.
class RasterLayer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='raster_layers')
    file_name = models.CharField(max_length=255)  # Layer name (e.g., Ortho_May2025)
    description = models.TextField(blank=True)
     
    s3_file_key = models.CharField(max_length=500, help_text="S3 key/path for the raster file")  # Store S3 path only
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
     
    # Raster metadata
    crs = models.CharField(max_length=100, blank=True, null=True)          # e.g., EPSG:4326
    bounding_box = models.JSONField(blank=True, null=True)                 # [minx, miny, maxx, maxy]
    pixel_size = models.JSONField(blank=True, null=True)                   # [x_res, y_res]
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    band_count = models.IntegerField(blank=True, null=True)
    band_descriptions = models.JSONField(blank=True, null=True)            # e.g., ["Red", "Green", "Blue", "NIR"]
     
    # Web Visualization
    geoserver_layer_name = models.CharField(max_length=255, blank=True, null=True)  # Registered GeoServer name
    geoserver_url = models.CharField(max_length=500, blank=True, null=True)  # Full GeoServer layer URL
    is_published = models.BooleanField(default=False)

    # Grouping
    group_tag = models.ManyToManyField(RasterGroupTag, blank=True)
    
    # Status tracking
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when layer was marked for deletion")

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ('project', 'file_name')
        verbose_name_plural = "Raster Layers"
    
    def __str__(self):
        return f"{self.file_name} - {self.project.project_name}"
    

    @property
    def s3_url(self):
        """Generate full S3 URL for the raster file"""
        if self.s3_file_key:
            return f"s3://{settings.AWS_STORAGE_BUCKET_NAME}/{self.s3_file_key}"
        return None

    @property
    def is_permanently_deletable(self):
        """Check if layer can be permanently deleted (7+ days after soft delete)"""
        if not self.deleted_at:
            return False
        from datetime import timedelta
        from django.utils import timezone
        return timezone.now() > (self.deleted_at + timedelta(days=7))

    @property
    def days_until_permanent_deletion(self):
        """Returns days remaining until permanent deletion"""
        if not self.deleted_at:
            return None
        from datetime import timedelta
        from django.utils import timezone
        deletion_date = self.deleted_at + timedelta(days=7)
        remaining = deletion_date - timezone.now()
        return max(0, remaining.days)


class StreetImage(models.Model):
    """Enhanced model for street imagery with geographic location"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey('Project', on_delete=models.CASCADE, related_name='street_images')
    
    # File information
    unique_filename = models.CharField(max_length=255, unique=True)
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)  # Full S3 URL
    file_size = models.BigIntegerField(null=True, blank=True)
    
    # **KEY ADDITION: Geographic coordinates**
    latitude = models.FloatField(null=True, blank=True, help_text="Latitude in decimal degrees")
    longitude = models.FloatField(null=True, blank=True, help_text="Longitude in decimal degrees")
    location = geomodels.PointField(srid=4326, null=True, blank=True, help_text="Geographic point location")

    # Camera information
    camera_make = models.CharField(max_length=100, null=True, blank=True, help_text="Camera manufacturer")
    camera_model = models.CharField(max_length=100, null=True, blank=True, help_text="Camera model")
    camera_serial = models.CharField(max_length=100, null=True, blank=True, help_text="Camera serial number")
    lens_make = models.CharField(max_length=100, null=True, blank=True, help_text="Lens manufacturer")
    lens_model = models.CharField(max_length=100, null=True, blank=True, help_text="Lens model")
    
    # Camera settings
    focal_length = models.FloatField(null=True, blank=True, help_text="Focal length in mm")
    focal_length_35mm = models.FloatField(null=True, blank=True, help_text="35mm equivalent focal length")
    f_number = models.FloatField(null=True, blank=True, help_text="Aperture f-number")
    exposure_time = models.CharField(max_length=20, null=True, blank=True, help_text="Exposure time (e.g., 1/125)")
    iso_speed = models.IntegerField(null=True, blank=True, help_text="ISO speed rating")
    exposure_mode = models.CharField(max_length=50, null=True, blank=True, help_text="Exposure mode")
    white_balance = models.CharField(max_length=50, null=True, blank=True, help_text="White balance setting")
    flash = models.CharField(max_length=50, null=True, blank=True, help_text="Flash setting")
    
    # Image dimensions and quality
    image_width = models.IntegerField(null=True, blank=True, help_text="Image width in pixels")
    image_height = models.IntegerField(null=True, blank=True, help_text="Image height in pixels")
    orientation = models.IntegerField(null=True, blank=True, help_text="Image orientation (1-8)")
    color_space = models.CharField(max_length=20, null=True, blank=True, help_text="Color space")
    compression = models.CharField(max_length=50, null=True, blank=True, help_text="Compression type")
    
    # Sensor information
    sensor_width = models.FloatField(null=True, blank=True, help_text="Sensor width in mm")
    sensor_height = models.FloatField(null=True, blank=True, help_text="Sensor height in mm")
    pixel_x_dimension = models.IntegerField(null=True, blank=True, help_text="Pixel X dimension")
    pixel_y_dimension = models.IntegerField(null=True, blank=True, help_text="Pixel Y dimension")
    
    # Image metadata
    image_type = models.CharField(max_length=20, choices=[
        ('front_view', 'Front View'), 
        ('panorama', '360 Panorama'),
        ('side_view', 'Side View'),
        ('rear_view', 'Rear View')
    ], default='front_view')
    
    # EXIF and camera metadata
    captured_at = models.DateTimeField(null=True, blank=True)
    altitude = models.FloatField(null=True, blank=True)
    altitude_ref = models.CharField(max_length=20, null=True, blank=True, help_text="Altitude reference (sea level/below)")

    # Camera orientation (if available)
    yaw = models.FloatField(null=True, blank=True, help_text="Camera yaw/heading in degrees")
    pitch = models.FloatField(null=True, blank=True, help_text="Camera pitch/tilt in degrees")
    roll = models.FloatField(null=True, blank=True, help_text="Camera roll in degrees")
    
    # GPS accuracy and additional metadata
    gps_accuracy = models.FloatField(null=True, blank=True, help_text="GPS accuracy in meters")
    gps_speed = models.FloatField(null=True, blank=True, help_text="GPS speed in km/h")
    gps_track = models.FloatField(null=True, blank=True, help_text="Direction of movement")
    gps_img_direction = models.FloatField(null=True, blank=True, help_text="Image direction")
    gps_img_direction_ref = models.CharField(max_length=10, null=True, blank=True, help_text="Image direction reference")
    
    # Software and processing
    software = models.CharField(max_length=100, null=True, blank=True, help_text="Software used")
    date_time_original = models.DateTimeField(null=True, blank=True, help_text="Original date/time")
    date_time_digitized = models.DateTimeField(null=True, blank=True, help_text="Digitized date/time")
    
    # Processing and status
    processing_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        indexes = [
            models.Index(fields=["project"]),
            geomodels.Index(fields=["location"]),
            models.Index(fields=["captured_at"]),
            models.Index(fields=["processing_status"]),
            models.Index(fields=["camera_make", "camera_model"]),
        ]
        ordering = ['-captured_at', '-uploaded_at']
        unique_together = ['project', 'latitude', 'longitude', 'unique_filename']

    def save(self, *args, **kwargs):
        # Auto-create Point geometry from lat/lon
        if self.latitude is not None and self.longitude is not None:
            from django.contrib.gis.geos import Point
            self.location = Point(self.longitude, self.latitude, srid=4326)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.original_filename} ({self.camera_make} {self.camera_model}) at ({self.latitude}, {self.longitude})"
    
    @property
    def s3_key(self):
        """Extract S3 key from file_path URL"""
        if self.file_path and '.com/' in self.file_path:
            return self.file_path.split('.com/')[-1]
        return None
    
    @property
    def camera_info(self):
        """Get formatted camera information"""
        parts = []
        if self.camera_make:
            parts.append(self.camera_make)
        if self.camera_model:
            parts.append(self.camera_model)
        return " ".join(parts) if parts else "Unknown Camera"
    
    @property
    def camera_settings(self):
        """Get formatted camera settings"""
        settings = []
        if self.f_number:
            settings.append(f"f/{self.f_number}")
        if self.exposure_time:
            settings.append(f"{self.exposure_time}")
        if self.iso_speed:
            settings.append(f"ISO {self.iso_speed}")
        if self.focal_length:
            settings.append(f"{self.focal_length}mm")
        return " | ".join(settings) if settings else "No settings available"




class TerrainModel(models.Model):
    TERRAIN_TYPE_CHOICES = [
        ('DEM', 'Digital Elevation Model'),
        ('DSM', 'Digital Surface Model'),
        ('DTM', 'Digital Terrain Model'),
    ]
    FILE_TYPE_CHOICES = [
        ('tif', 'GeoTIFF'),
        ('tiff', 'GeoTIFF'),
        ('asc', 'ASCII Grid'),
        ('xyz', 'XYZ Grid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='terrain_models')
    file_name = models.CharField(max_length=255)  # Layer name (e.g., DEM_May2025)
    terrain_type = models.CharField(max_length=10, choices=TERRAIN_TYPE_CHOICES, default='DEM')
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, default='tif')
    description = models.TextField(blank=True)
    s3_file_key = models.CharField(max_length=500, help_text="S3 key/path for the terrain file")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Terrain metadata
    crs = models.CharField(max_length=100, blank=True, null=True)
    bounding_box = models.JSONField(blank=True, null=True)  # [minx, miny, maxx, maxy]
    pixel_size = models.JSONField(blank=True, null=True)  # [x_res, y_res]
    width = models.IntegerField(blank=True, null=True)
    height = models.IntegerField(blank=True, null=True)
    min_elevation = models.FloatField(blank=True, null=True)
    max_elevation = models.FloatField(blank=True, null=True)
    elevation_unit = models.CharField(max_length=20, default='meters')

    # GeoServer integration
    geoserver_layer_name = models.CharField(max_length=255, blank=True, null=True)
    geoserver_url = models.CharField(max_length=500, blank=True, null=True)
    is_published = models.BooleanField(default=False)

    # Grouping and status
    group_tag = models.ManyToManyField(RasterGroupTag, blank=True)
    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        unique_together = ('project', 'file_name')
        verbose_name_plural = "Terrain Models"

    def __str__(self):
        return f"{self.file_name} ({self.file_type.upper()} - {self.terrain_type}) - {self.project.project_name}"

    @property
    def s3_url(self):
        """Generate full S3 URL for the terrain file"""
        if self.s3_file_key:
            return f"s3://{settings.AWS_STORAGE_BUCKET_NAME}/{self.s3_file_key}"
        return None

    @property
    def is_permanently_deletable(self):
        """Check if terrain can be permanently deleted (7+ days after soft delete)"""
        if not self.deleted_at:
            return False
        return timezone.now() > (self.deleted_at + timedelta(days=7))

    @property
    def days_until_permanent_deletion(self):
        """Returns days remaining until permanent deletion"""
        if not self.deleted_at:
            return None
        deletion_date = self.deleted_at + timedelta(days=7)
        remaining = deletion_date - timezone.now()
        return max(0, remaining.days)
