# Vector Layer Management

This document explains the vector layer management functionality implemented in the project, including models, serializers, API views, and example usage for testing.

## Models

Two models handle vector data management:

- **VectorLayer**: Represents a vector data layer with GeoServer integration. Includes metadata and publishing status.

  ```python
  # project_api/models.py
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
      name = models.CharField(max_length=255)
      title = models.CharField(max_length=255, blank=True)
      geometry_type = models.CharField(max_length=20, choices=GEOMETRY_TYPE_CHOICES)
      project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='vector_layers')
      created_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
      description = models.TextField(blank=True)
      crs = models.CharField(max_length=50, default="EPSG:4326")
      
      # GeoServer fields
      geoserver_layer_name = models.CharField(max_length=255, blank=True)
      geoserver_url = models.URLField(blank=True)
      is_published = models.BooleanField(default=False)
      
      # File storage
      s3_file_key = models.CharField(max_length=500, blank=True, null=True)
      feature_count = models.IntegerField(default=0)
      bbox = gis_models.PolygonField(srid=4326, null=True, blank=True)
      
      # Metadata
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      group_tags = models.ManyToManyField(GroupTag, blank=True, related_name='vector_layers')
      is_active = models.BooleanField(default=True)
      
      class Meta:
          unique_together = ('project', 'name')
          ordering = ['-created_at']
      
      def __str__(self):
          return f"{self.title or self.name} ({self.geometry_type}) - {self.project.project_name}"
      
      @property
      def display_name(self):
          return self.title or self.name
```

- **VectorFeature**: Stores individual geographic features with geometry and attributes.

  ```python
  # project_api/models.py
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
```

## Serializers

Serializers for vector data:

- `VectorLayerSerializer`: Handles full CRUD operations for `VectorLayer`.

  ```python
  # project_api/serializers.py
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
  ```

- `VectorLayerListSerializer`: A simplified serializer for listing `VectorLayer` instances.

  ```python
  # project_api/serializers.py
  class VectorLayerListSerializer(serializers.ModelSerializer):
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
  ```

- `VectorFeatureSerializer`: Handles `VectorFeature` serialization, using `GeoFeatureModelSerializer` for geometry.

  ```python
  # project_api/serializers.py
  from rest_framework_gis.serializers import GeoFeatureModelSerializer
  
  class VectorFeatureSerializer(GeoFeatureModelSerializer):
      class Meta:
          model = VectorFeature
          geo_field = 'geom'
          fields = '__all__'
          read_only_fields = ['id', 'created_at', 'updated_at']
  ```

## API Views

API views for vector layer and feature management:

- **VectorLayerAPIView**: Manages `VectorLayer` instances.
  - `GET /api/project/<project_id>/vector-layers/`: List all vector layers for a project.
  - `POST /api/project/<project_id>/vector-layers/`: Create a new vector layer.

- **VectorLayerDetailAPIView**: Handles specific `VectorLayer` instance operations.
  - `GET /api/project/<project_id>/vector-layers/<uuid:layer_id>/`: Retrieve a specific vector layer.
  - `PATCH /api/project/<project_id>/vector-layers/<uuid:layer_id>/`: Update an existing vector layer.
  - `DELETE /api/project/<project_id>/vector-layers/<uuid:layer_id>/`: Delete a vector layer.

- **VectorLayerUploadAPIView**: Handles file uploads for creating vector layers.
  - `POST /api/project/<project_id>/vector-layers/upload/`: Upload a file (e.g., Shapefile, GeoJSON) to create a new vector layer.

- **VectorFeatureAPIView**: Manages `VectorFeature` instances within a `VectorLayer`.
  - `GET /api/vector-layers/<uuid:layer_id>/features/`: List all features for a specific vector layer.
  - `POST /api/vector-layers/<uuid:layer_id>/features/`: Create a new vector feature.

- **VectorFeatureDetailAPIView**: Handles specific `VectorFeature` instance operations.
  - `GET /api/vector-layers/<uuid:layer_id>/features/<uuid:feature_id>/`: Retrieve a specific vector feature.
  - `PATCH /api/vector-layers/<uuid:layer_id>/features/<uuid:feature_id>/`: Update an existing vector feature.
  - `DELETE /api/vector-layers/<uuid:layer_id>/features/<uuid:feature_id>/`: Delete a vector feature.

- **VectorLayerOperationsAPIView**: Provides advanced operations on vector layers.
  - `POST /api/vector-layers/operations/merge/`: Merge two vector layers into a new one.
  - `POST /api/vector-layers/operations/split/`: Split a vector layer based on an attribute value.
  - `POST /api/vector-layers/operations/filter/`: Filter vector features based on layer name, bounding box, and attributes.
  - `POST /api/vector-layers/operations/publish/`: Publish a vector layer to GeoServer.
  - `POST /api/vector-layers/operations/unpublish/`: Unpublish a vector layer from GeoServer.
  - `POST /api/vector-layers/operations/download/`: Download a vector layer in a specified format.

## Permissions

Permissions are enforced based on the user's role within the associated project:

- **VectorLayer Creation/Update**: Only `admin`, `project_head`, or `managers` can create/update vector layers.
- **VectorLayer Deletion**: Only `admin` or `project_head` can delete vector layers.
- **VectorFeature CRUD**: Only `admin`, `project_head`, `managers`, or `editors` can perform CRUD operations on vector features.
- **Viewing Layers/Features**: `admin`, `project_head`, `managers`, `editors`, `viewers`, and `reviewers` can view layers and features.

## Example Usage for Testing

Before testing, ensure you have a `Project` created.

### 1. Create a Vector Layer

**Endpoint**: `POST /api/project/<project_id>/vector-layers/`

**Request Body**:

```json
{
  "name": "Roads",
  "title": "Main Roads Network",
  "geometry_type": "LineString",
  "description": "Major roads in the project area",
  "crs": "EPSG:4326",
  "group_tags": []
}
```

Replace `<project_id>` with an actual project ID.

### 2. Upload a Vector Layer (e.g., Shapefile)

**Endpoint**: `POST /api/project/<project_id>/vector-layers/upload/`

**Request Body (multipart/form-data)**:

```
--<BOUNDARY>
Content-Disposition: form-data; name="file"; filename="roads.zip"
Content-Type: application/zip

<binary content of roads.zip (containing .shp, .shx, .dbf, .prj files)>
--<BOUNDARY>
Content-Disposition: form-data; name="name"

UploadedRoads
--<BOUNDARY>
Content-Disposition: form-data; name="geometry_type"

LineString
--<BOUNDARY>
Content-Disposition: form-data; name="crs"

EPSG:4326
--<BOUNDARY>--
```

Replace `<project_id>` with an actual project ID. The `roads.zip` should contain the necessary Shapefile components.

### 3. Add Vector Features to a Layer

**Endpoint**: `POST /api/vector-layers/<layer_id>/features/`

**Request Body**:

```json
{
  "geom": {
    "type": "LineString",
    "coordinates": [
      [-74.00, 40.71],
      [-73.99, 40.72]
    ]
  },
  "attributes": {
    "name": "Broadway",
    "lanes": 4
  }
}
```

Replace `<layer_id>` with the ID of the `Roads` layer created in step 1 or 2.

### 4. Publish a Vector Layer to GeoServer

**Endpoint**: `POST /api/vector-layers/operations/publish/`

**Request Body**:

```json
{
  "layer_id": "<uuid_of_layer_to_publish>"
}
```

This will publish the layer to the configured GeoServer instance.

### 5. Unpublish a Vector Layer from GeoServer

**Endpoint**: `POST /api/vector-layers/operations/unpublish/`

**Request Body**:

```json
{
  "layer_id": "<uuid_of_published_layer>"
}
```

This will remove the layer from GeoServer.

### 6. Download a Vector Layer

**Endpoint**: `POST /api/vector-layers/operations/download/`

**Request Body**:

```json
{
  "layer_id": "<uuid_of_layer_to_download>",
  "format": "Shapefile" 
}
```

Supported formats: `Shapefile`, `GeoJSON`, `KML`, `CSV`.

### 7. Merge Layers

**Endpoint**: `POST /api/vector-layers/operations/merge/`

**Request Body**:

```json
{
  "layer1_id": "<uuid_of_layer1>",
  "layer2_id": "<uuid_of_layer2>",
  "new_layer_name": "Merged_Roads_Trails",
  "new_layer_title": "Combined Road and Trail Network"
}
```

Ensure `layer1_id` and `layer2_id` belong to the same project and have compatible `geometry_type`.

### 8. Split a Layer

**Endpoint**: `POST /api/vector-layers/operations/split/`

**Request Body**:

```json
{
  "layer_id": "<uuid_of_layer_to_split>",
  "attribute_key": "road_type",
  "new_layer_prefix": "RoadType"
}
```

This will create new layers based on unique values of the `road_type` attribute.