from django.contrib import admin
from django.contrib.gis import admin as gis_admin
from .models import Project, GroupType, GroupTag, CoordinateReferenceSystem, VectorLayer, VectorFeature, RasterGroupTag, RasterLayer, StreetImage, TerrainModel

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('project_name', 'client', 'company', 'project_head', 'status', 'is_active', 'created_at', 'created_by')
    search_fields = ('project_name', 'description')
    list_filter = ('status', 'is_active', 'company')
    filter_horizontal = ('managers', 'reviewers', 'editors', 'viewers')
    raw_id_fields = ('client', 'project_head', 'created_by', 'modified_by')
    readonly_fields = ('id', 'created_at', 'created_by', 'modified_at', 'modified_by')


@admin.register(GroupTag)
class GroupTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'group_type')
    search_fields = ('name',)
    list_filter = ('group_type',)

@admin.register(GroupType)
class GroupTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'project')
    search_fields = ('name',)
    list_filter = ('project',)

@admin.register(CoordinateReferenceSystem)
class CoordinateReferenceSystemAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'proj_string')
    search_fields = ('code', 'name')
    list_filter = ('code',)


# GIS Admin
@admin.register(VectorLayer)
class VectorLayerAdmin(admin.ModelAdmin):
    list_display = ['name', 'title', 'geometry_type', 'project', 'is_published', 'feature_count', 'created_at']
    list_filter = ['geometry_type', 'is_published', 'created_at']
    search_fields = ['name', 'title', 'project__project_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'feature_count']
    
    # Don't display the bbox field in admin to avoid projection errors
    exclude = ['bbox']

@admin.register(VectorFeature)
class VectorFeatureAdmin(gis_admin.ModelAdmin):
    list_display = ('id', 'layer', 'created_at', 'updated_at')
    list_filter = ('layer', 'created_at', 'updated_at')
    search_fields = ('layer__name', 'attributes__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    # geom is automatically handled by OSMGeoAdmin

@admin.register(RasterGroupTag)
class RasterGroupTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'created_at')
    search_fields = ('name',)
    list_filter = ('project',)

@admin.register(RasterLayer)
class RasterLayerAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'project', 'is_published', 'band_count', 'uploaded_at']
    list_filter = ['is_published', 'uploaded_at', 'band_count']
    search_fields = ['file_name', 'project__project_name']
    readonly_fields = ['id', 'uploaded_at', 'width', 'height', 'band_count']
    
    # Don't display the bounding_box field in admin to avoid potential errors
    exclude = ['bounding_box']


@admin.register(StreetImage)
class StreetImageAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'camera_make', 'camera_model', 
        'latitude', 'longitude', 'captured_at'
    ]
    list_filter = [
        'camera_make', 'camera_model', 'processing_status', 
        'image_type'
    ]
    search_fields = [
        'original_filename', 'camera_make', 'camera_model', 
        'lens_make', 'lens_model'
    ]
    readonly_fields = [
        'id', 'camera_make', 'camera_model', 'focal_length', 
        'f_number', 'iso_speed', 'captured_at'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('original_filename', 'file_path', 'image_type', 'notes')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude', 'altitude', 'location')
        }),
        ('Camera Information', {
            'fields': ('camera_make', 'camera_model', 'camera_serial', 'lens_make', 'lens_model')
        }),
        ('Camera Settings', {
            'fields': ('focal_length', 'f_number', 'exposure_time', 'iso_speed', 'white_balance', 'flash')
        }),
        ('Image Properties', {
            'fields': ('image_width', 'image_height', 'orientation', 'color_space')
        }),
        ('Dates', {
            'fields': ('id', 'captured_at', 'date_time_original')
        }),
    )

@admin.register(TerrainModel)
class TerrainModelAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'terrain_type', 'file_type', 'project', 'is_published', 'uploaded_at']
    list_filter = ['terrain_type', 'file_type', 'is_published', 'uploaded_at']
    search_fields = ['file_name', 'project__project_name']
    readonly_fields = ['id', 'uploaded_at', 'width', 'height', 'min_elevation', 'max_elevation']
    exclude = ['bounding_box']  # Avoid JSON field display issues
