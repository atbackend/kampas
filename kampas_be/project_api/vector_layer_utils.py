import logging
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from .models import VectorLayer, VectorFeature, Project
from .vector_utils import VectorDataProcessor

logger = logging.getLogger(__name__)

# def create_vector_layer(name, geometry_type, project, created_by, description=None):
#     """
#     Create a new vector layer in the database.
    
#     Args:
#         name (str): The name of the layer
#         geometry_type (str): The geometry type (Point, LineString, Polygon, etc.)
#         project (Project): The project the layer belongs to
#         created_by (CustomUser): The user creating the layer
#         description (str, optional): Layer description
        
#     Returns:
#         VectorLayer: The created vector layer
#     """
#     return VectorLayer.objects.create(
#         name=name,
#         geometry_type=geometry_type,
#         project=project,
#         created_by=created_by,
#         description=description or ''
#     )

def create_vector_layer(name, geometry_type, project, created_by, description=None):
    """Create a new vector layer with unique naming that matches table name"""
    
    # Create the layer first to get the ID
    temp_layer = VectorLayer.objects.create(
        name="temp_layer",  # Temporary name
        geometry_type=geometry_type,
        project=project,
        created_by=created_by,
        description=description or ''
    )
    
    # **GENERATE UNIQUE NAME THAT MATCHES TABLE NAME**
    # This will be used for both database layer name AND GeoServer layer name
    unique_name = f"vector_layer_{temp_layer.id.hex}"
    
    # Ensure it fits database field constraints (database column is 200 chars)
    # Django model says 255 but actual DB column is 200
    db_max_length = 200  # Actual database column limit
    if len(unique_name) > db_max_length:
        unique_name = unique_name[:db_max_length]
        logger.warning(f"Truncated layer name to fit database column: {unique_name}")
    
    # Update with the unique name that matches table naming
    temp_layer.name = unique_name
    temp_layer.save()
    
    logger.info(f"Created vector layer with unique name: {unique_name}")
    return temp_layer


def update_vector_layer(layer_id, **kwargs):
    """
    Update a vector layer's metadata.
    
    Args:
        layer_id (UUID): The ID of the layer to update
        **kwargs: Fields to update (name, title, description, etc.)
        
    Returns:
        VectorLayer: The updated vector layer
    """
    layer = VectorLayer.objects.get(id=layer_id)
    for field, value in kwargs.items():
        setattr(layer, field, value)
    layer.save()
    return layer

def update_feature_geometry(feature_id, new_geom, new_attributes=None):
    """
    Update a feature's geometry and optionally its attributes.
    
    Args:
        feature_id (UUID): The ID of the feature to update
        new_geom (GEOSGeometry): The new geometry
        new_attributes (dict, optional): New attributes to update or add
        
    Returns:
        VectorFeature: The updated feature
    """
    feature = VectorFeature.objects.get(id=feature_id)
    feature.geom = new_geom
    
    if new_attributes:
        # Update existing attributes with new values
        attributes = feature.attributes.copy()
        attributes.update(new_attributes)
        feature.attributes = attributes
    
    feature.save()
    
    # If this is part of a published layer, update the PostGIS table
    if feature.layer.is_published:
        table_name = f"vector_layer_{feature.layer.id.hex}"
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE {table_name} 
                    SET geom = ST_Force2D(ST_GeomFromText(%s, 4326)), 
                        attributes = %s
                    WHERE id = %s;
                """, [feature.geom.wkt, feature.attributes, feature.id.hex])
        except Exception as e:
            logger.error(f"Error updating feature in PostGIS table: {e}")
    
    return feature

def merge_vector_layers(layer1_id, layer2_id, new_layer_name, created_by):
    """
    Merge two vector layers into a new layer.
    
    Args:
        layer1_id (UUID): The ID of the first layer
        layer2_id (UUID): The ID of the second layer
        new_layer_name (str): The name for the new merged layer
        created_by (CustomUser): The user creating the merged layer
        
    Returns:
        VectorLayer: The new merged layer
    """
    layer1 = VectorLayer.objects.get(id=layer1_id)
    layer2 = VectorLayer.objects.get(id=layer2_id)

    if layer1.geometry_type != layer2.geometry_type:
        raise ValueError("Geometry types do not match for merging.")

    # Create new layer
    temp_layer = VectorLayer.objects.create(
        name="temp_layer",  # Temporary name
        title=f"Merged: {layer1.name} + {layer2.name}",
        geometry_type=layer1.geometry_type,
        project=layer1.project,
        created_by=created_by,
        description=f"Merged layer from {layer1.name} and {layer2.name}"
    )
    
    # Generate unique name using the ID to avoid conflicts
    unique_name = f"vector_layer_{temp_layer.id.hex}"
    
    # Ensure it fits database field constraints (database column is 200 chars)
    # Django model says 255 but actual DB column is 200
    db_max_length = 200  # Actual database column limit
    if len(unique_name) > db_max_length:
        unique_name = unique_name[:db_max_length]
        logger.warning(f"Truncated layer name to fit database column: {unique_name}")
    
    # Update with the unique name
    temp_layer.name = unique_name
    temp_layer.save()
    
    logger.info(f"Created merged vector layer with unique name: {unique_name} (original: {new_layer_name})")
    
    # Copy features from both layers
    features_to_create = []
    for feature in VectorFeature.objects.filter(layer__in=[layer1, layer2]):
        features_to_create.append(
            VectorFeature(
                layer=temp_layer,
                geom=feature.geom,
                attributes=feature.attributes
            )
        )

    # Bulk create features
    if features_to_create:
        VectorFeature.objects.bulk_create(features_to_create, batch_size=1000)
        temp_layer.feature_count = len(features_to_create)
        temp_layer.save()

    # Create PostGIS table and publish to GeoServer
    processor = VectorDataProcessor()
    processor._create_and_publish_layer(temp_layer)

    return temp_layer

def split_layer_by_attribute(layer_id, attribute_key, attribute_value, new_layer_name, created_by):
    """
    Split a layer by creating a new layer with features matching an attribute value.
    
    Args:
        layer_id (UUID): The ID of the layer to split
        attribute_key (str): The attribute key to filter by
        attribute_value: The attribute value to match
        new_layer_name (str): The name for the new layer
        created_by (CustomUser): The user creating the new layer
        
    Returns:
        VectorLayer: The new layer containing the filtered features
    """
    original = VectorLayer.objects.get(id=layer_id)
    
    # Create new layer
    temp_layer = VectorLayer.objects.create(
        name="temp_layer",  # Temporary name
        title=f"Split from {original.name}",
        geometry_type=original.geometry_type,
        project=original.project,
        created_by=created_by,
        description=f"Split from {original.name} where {attribute_key}={attribute_value}"
    )
    
    # Generate unique name using the ID to avoid conflicts
    unique_name = f"vector_layer_{temp_layer.id.hex}"
    
    # Ensure it fits database field constraints (database column is 200 chars)
    # Django model says 255 but actual DB column is 200
    db_max_length = 200  # Actual database column limit
    if len(unique_name) > db_max_length:
        unique_name = unique_name[:db_max_length]
        logger.warning(f"Truncated layer name to fit database column: {unique_name}")
    
    # Update with the unique name
    temp_layer.name = unique_name
    temp_layer.save()
    
    logger.info(f"Created split vector layer with unique name: {unique_name} (original: {new_layer_name})")
    
    # Find features with matching attribute
    matching_features = []
    for feature in original.features.all():
        if attribute_key in feature.attributes and feature.attributes[attribute_key] == attribute_value:
            matching_features.append(
                VectorFeature(
                    layer=temp_layer,
                    geom=feature.geom,
                    attributes=feature.attributes
                )
            )

    # Bulk create features
    if matching_features:
        VectorFeature.objects.bulk_create(matching_features, batch_size=1000)
        temp_layer.feature_count = len(matching_features)
        temp_layer.save()
    else:
        logger.warning(f"No features matched the attribute filter {attribute_key}={attribute_value}")

    # Create PostGIS table and publish to GeoServer
    processor = VectorDataProcessor()
    processor._create_and_publish_layer(temp_layer)

    return temp_layer

def create_empty_layer(name, geometry_type, project, created_by, description=None):
    """
    Create an empty vector layer.
    
    Args:
        name (str): The name of the layer
        geometry_type (str): The geometry type (Point, LineString, Polygon, etc.)
        project (Project): The project the layer belongs to
        created_by (CustomUser): The user creating the layer
        description (str, optional): Layer description
        
    Returns:
        VectorLayer: The created empty vector layer
    """
    layer = create_vector_layer(name, geometry_type, project, created_by, description)
    
    # Create empty PostGIS table
    processor = VectorDataProcessor()
    table_name = f"vector_layer_{layer.id.hex}"
    
    try:
        with connection.cursor() as cursor:
            # Create table with proper geometry column
            cursor.execute(f"""
                CREATE TABLE {table_name} (
                    id SERIAL PRIMARY KEY,
                    geom GEOMETRY({geometry_type}, 4326),
                    attributes JSONB
                );
            """)
            
            # Create spatial index
            cursor.execute(f"""
                CREATE INDEX {table_name}_geom_idx 
                ON {table_name} USING GIST (geom);
            """)
            
            # Create index on attributes
            cursor.execute(f"""
                CREATE INDEX {table_name}_attributes_idx 
                ON {table_name} USING GIN (attributes);
            """)
            
        # Publish to GeoServer
        success, geoserver_url = processor.geoserver_manager.publish_layer_to_group(
            company_id=layer.project.company.id,
            project_id=layer.project.id,
            layer_name=layer.name,
            layer_type='vector_layers',
            table_name=table_name
        )
        
        if success:
            # Ensure geoserver_layer_name fits database column (200 chars)
            geoserver_layer_name = layer.name[:200] if len(layer.name) > 200 else layer.name
            layer.geoserver_layer_name = geoserver_layer_name
            layer.geoserver_url = geoserver_url
            layer.is_published = True
            layer.save()
            logger.info(f"Successfully published empty layer '{layer.name}' to GeoServer")
        else:
            logger.error(f"Failed to publish empty layer {layer.name} to GeoServer")
            
    except Exception as e:
        logger.error(f"Error creating empty layer: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    return layer

def filter_features(layer_name=None, geom_bbox=None, attributes=None, project_id=None, company_id=None):
    """
    Filter features by layer name, bounding box, and/or attributes.
    
    Args:
        layer_name (str, optional): Filter by layer name
        geom_bbox (tuple, optional): Bounding box (minx, miny, maxx, maxy)
        attributes (dict, optional): Filter by attribute key-value pairs
        project_id (str, optional): Filter by project ID
        company_id (str, optional): Filter by company ID (for security)
        
    Returns:
        QuerySet: Filtered VectorFeature queryset
    """
    try:
        # Start with active layers only
        qs = VectorFeature.objects.filter(
            layer__is_active=True,
            layer__deleted_at__isnull=True
        )
        
        # Filter by company if provided (for security)
        if company_id:
            qs = qs.filter(layer__project__company_id=company_id)
        
        # Filter by project if provided
        if project_id:
            qs = qs.filter(layer__project_id=project_id)
        
        # Filter by layer name if provided
        if layer_name:
            qs = qs.filter(layer__name=layer_name)
        
        # Filter by bounding box if provided
        if geom_bbox and len(geom_bbox) == 4:
            try:
                minx, miny, maxx, maxy = geom_bbox
                bbox_wkt = f"POLYGON(({minx} {miny}, {minx} {maxy}, {maxx} {maxy}, {maxx} {miny}, {minx} {miny}))"
                bbox_geom = GEOSGeometry(bbox_wkt, srid=4326)
                qs = qs.filter(geom__intersects=bbox_geom)
            except Exception as e:
                logger.warning(f"Invalid bounding box: {geom_bbox}, error: {e}")
        
        # Filter by attributes if provided
        if attributes and isinstance(attributes, dict):
            for key, val in attributes.items():
                # Use the contains operator for JSONB fields
                filter_dict = {f"attributes__{key}": val}
                qs = qs.filter(**filter_dict)
        
        # Order by creation date for consistent results
        qs = qs.order_by('-created_at')
        
        return qs
        
    except Exception as e:
        logger.error(f"Error filtering features: {e}")
        return VectorFeature.objects.none()

def get_feature_geojson(features_qs):
    """
    Convert features queryset to GeoJSON format.
    
    Args:
        features_qs: VectorFeature queryset
        
    Returns:
        dict: GeoJSON FeatureCollection
    """
    try:
        features_list = []
        
        for feature in features_qs:
            feature_dict = {
                "type": "Feature",
                "id": str(feature.id),
                "geometry": feature.geom.geojson if feature.geom else None,
                "properties": {
                    "layer_name": feature.layer.name,
                    "layer_id": str(feature.layer.id),
                    "project_id": feature.layer.project.id,
                    "created_at": feature.created_at.isoformat(),
                    **feature.attributes  # Include all custom attributes
                }
            }
            features_list.append(feature_dict)
        
        return {
            "type": "FeatureCollection",
            "features": features_list,
            "count": len(features_list)
        }
        
    except Exception as e:
        logger.error(f"Error converting features to GeoJSON: {e}")
        return {
            "type": "FeatureCollection", 
            "features": [],
            "count": 0,
            "error": str(e)
        }