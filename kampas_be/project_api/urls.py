from django.urls import path
from .views import (
    ProjectAdminAPIView, 
    ProjectS3DataAPIView, 
    ProjectS3FileDeleteAPIView,
    GroupTypeAPIView,
    GroupTagAPIView,
    CoordinateReferenceSystemAPIView,
    VectorLayerUploadAPIView,
    VectorLayerDetailAPIView,
    VectorLayerListAPIView,
    VectorLayerEmptyCreateAPIView,
    VectorLayerMergeAPIView,
    VectorLayerSplitAPIView,
    VectorFeatureListAPIView,
    VectorFeatureDetailAPIView,
    VectorFeatureFilterAPIView,
    RasterGroupTagAPIView,
    RasterLayerUploadAPIView,
    RasterLayerListAPIView,
    RasterLayerDetailAPIView,
    BulkFileUploadAPIView,
    StreetImageUploadAPIView,
    StreetImageListAPIView,
    StreetImageDetailAPIView,
    StreetImageGeoAPIView,
    StreetImageryLayerAPIView,
    TerrainModelListAPIView,
    TerrainModelUploadAPIView,
    TerrainModelDetailAPIView,
)

urlpatterns = [
    # Project endpoints
    path('', ProjectAdminAPIView.as_view(), name='project-list'),
    path('create-project/', ProjectAdminAPIView.as_view(), name='project-create'),
    path('<str:id>/', ProjectAdminAPIView.as_view(), name='project-detail-update'),
    # S3 Data endpoints
    path('<str:project_id>/data/', ProjectS3DataAPIView.as_view(), name='project-s3-data'),
   #path('project-data/<str:project_id>/delete/', ProjectS3DeleteAPIView.as_view(), name='project-s3-data-delete'),
    path('<str:project_id>/files/data/delete/', ProjectS3FileDeleteAPIView.as_view(), name='project-s3-files-delete'),
    #path('project-data/<str:project_id>/folders/delete/', ProjectS3FolderDeleteAPIView.as_view(), name='project-s3-folder-delete'),
    
    # GroupType endpoints
    path('project/<str:project_id>/group-types/', GroupTypeAPIView.as_view(), name='group-type-list-create'),
    path('project/<str:project_id>/group-types/<uuid:id>/', GroupTypeAPIView.as_view(), name='group-type-detail-update'),
    
    # GroupTag endpoints
    path('group-types/<uuid:group_type_id>/tags/', GroupTagAPIView.as_view(), name='group-tag-list-create'),
    path('group-types/<uuid:group_type_id>/tags/<uuid:id>/', GroupTagAPIView.as_view(), name='group-tag-detail-update'),
    
    # CoordinateReferenceSystem endpoints
    path('coordinate-systems/', CoordinateReferenceSystemAPIView.as_view(), name='crs-list-create'),
    path('coordinate-systems/<str:code>/', CoordinateReferenceSystemAPIView.as_view(), name='crs-detail-update'),

    # Simplified bulk upload endpoints
    path('<str:project_id>/file-upload/', BulkFileUploadAPIView.as_view(), name='file-upload'),

    # Vector Layer URLs
    path('<str:project_id>/vector-layers/', VectorLayerListAPIView.as_view(), name='vector-layer-list'),
    path('<str:project_id>/vector-layers/upload/', VectorLayerUploadAPIView.as_view(), name='vector-layer-upload'),
    path('<str:project_id>/vector-layers/<uuid:layer_id>/', VectorLayerDetailAPIView.as_view(), name='vector-layer-detail'),
    path('<str:project_id>/vector-layers/empty/', VectorLayerEmptyCreateAPIView.as_view(), name='vector-layer-empty-create'),
    path('<str:project_id>/vector-layers/merge/', VectorLayerMergeAPIView.as_view(), name='vector-layer-merge'),
    path('<str:project_id>/vector-layers/split/', VectorLayerSplitAPIView.as_view(), name='vector-layer-split'),
    path('<str:project_id>/vector-layers/<uuid:layer_id>/features/', VectorFeatureListAPIView.as_view(), name='vector-feature-list'),
    path('<str:project_id>/vector-layers/<uuid:layer_id>/features/<uuid:feature_id>/', VectorFeatureDetailAPIView.as_view(), name='vector-feature-detail'),
    path('<str:project_id>/features/filter/', VectorFeatureFilterAPIView.as_view(), name='vector-features-filter'),

    # Raster Layer URLs
    path('<str:project_id>/raster-group-tags/', RasterGroupTagAPIView.as_view(), name='raster-group-tag-list-create'),
    path('<str:project_id>/raster-group-tags/<uuid:tag_id>/', RasterGroupTagAPIView.as_view(), name='raster-group-tag-detail'),
    path('<str:project_id>/raster-layers/', RasterLayerListAPIView.as_view(), name='raster-layer-list'),
    path('<str:project_id>/raster-layers/upload/', RasterLayerUploadAPIView.as_view(), name='raster-layer-upload'),
    path('<str:project_id>/raster-layers/<uuid:layer_id>/', RasterLayerDetailAPIView.as_view(), name='raster-layer-detail'),

     # Street Images
    path('<str:project_id>/street-images/upload/', StreetImageUploadAPIView.as_view(), name='street-image-upload'),
    path('<str:project_id>/street-images/', StreetImageListAPIView.as_view(), name='street-image-list'),
    path('<str:project_id>/street-images/<uuid:image_id>/', StreetImageDetailAPIView.as_view(), name='street-image-detail'),
    path('<str:project_id>/street-images/geo/', StreetImageGeoAPIView.as_view(), name='street-image-geo'),
    path('<str:project_id>/street-images/layer/', StreetImageryLayerAPIView.as_view(), name='street-imagery-layer'),
    path('projects/<str:project_id>/street-images/<str:image_id>/', StreetImageDetailAPIView.as_view(), name='street-image-detail'),

    # Terrain Models
    path('<str:project_id>/terrain-models/', TerrainModelListAPIView.as_view(), name='terrain-model-list'),
    path('<str:project_id>/terrain-models/upload/', TerrainModelUploadAPIView.as_view(), name='terrain-model-upload'),
    path('<str:project_id>/terrain-models/<uuid:model_id>/', TerrainModelDetailAPIView.as_view(), name='terrain-model-detail'),
]