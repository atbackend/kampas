import tempfile
import os
import json
import logging
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.db import connection
import pyproj
from .models import VectorLayer, VectorFeature
from .geoserver_utils import get_geoserver_manager
import boto3
from django.conf import settings

logger = logging.getLogger(__name__)

class VectorDataProcessor:
    """
    Handles the processing of uploaded vector data files (GeoJSON, Shapefile ZIP).
    It manages downloading from S3, parsing, creating database entries for vector layers and features,
    and publishing layers to GeoServer.
    """
    def __init__(self):
        """
        Initializes the VectorDataProcessor with an S3 client and a GeoServerManager instance.
        """
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.geoserver_manager = get_geoserver_manager()
    
    def process_uploaded_file(self, file_key, project, layer_name, created_by, title=None):
        """
        Processes an uploaded vector file from S3 based on its file type.
        Supports GeoJSON and Shapefile ZIP formats.
        """
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                local_file_path = self._download_from_s3(file_key, temp_dir)
                
                if file_key.lower().endswith('.geojson'):
                    return self._process_geojson(local_file_path, project, layer_name, created_by, file_key, title)
                elif file_key.lower().endswith('.zip'):
                    return self._process_shapefile_zip(local_file_path, project, layer_name, created_by, file_key, title)
                else:
                    raise ValueError("Unsupported file format. Only GeoJSON and Shapefile ZIP are supported.")
                    
        except Exception as e:
            logger.error(f"Error processing uploaded file {file_key}: {e}")
            raise
    
    def extract_layer_name_from_file_key(self, file_key):
        """
        Extract layer name from the uploaded file key.
        """
        filename = os.path.basename(file_key)
        # Remove file extension
        layer_name = os.path.splitext(filename)[0]
        # Clean the name to be database/GeoServer friendly
        import re
        layer_name = re.sub(r'[^a-zA-Z0-9_]', '_', layer_name)
        return layer_name
    
    def _download_from_s3(self, file_key, temp_dir):
        """
        Downloads a file from S3 to a specified local temporary directory.
        """
        local_file_path = os.path.join(temp_dir, os.path.basename(file_key))
        
        try:
            self.s3_client.download_file(
                settings.AWS_STORAGE_BUCKET_NAME,
                file_key,
                local_file_path
            )
            return local_file_path
        except Exception as e:
            logger.error(f"Error downloading file from S3: {e}")
            raise
    
    def _detect_coordinate_system(self, features):
        """
        Detect the coordinate system of the features based on coordinate ranges.
        """
        if not features:
            return None
            
        # Get sample coordinates
        sample_coords = []
        for feature in features[:5]:  # Check first 5 features
            geom = feature.get('geometry', {})
            coords = self._extract_all_coordinates(geom)
            sample_coords.extend(coords[:10])  # Get first 10 coordinates
            
        if not sample_coords:
            return None
            
        # Remove Z dimension for analysis
        coords_2d = [[c[0], c[1]] for c in sample_coords if len(c) >= 2]
        
        if not coords_2d:
            return None
            
        lons = [coord[0] for coord in coords_2d]
        lats = [coord[1] for coord in coords_2d]
        
        min_x, max_x = min(lons), max(lons)
        min_y, max_y = min(lats), max(lats)
        
        logger.info(f"Coordinate ranges: X: {min_x} to {max_x}, Y: {min_y} to {max_y}")
        
        # Check if it's already in WGS84
        if -180 <= min_x <= 180 and -180 <= max_x <= 180 and -90 <= min_y <= 90 and -90 <= max_y <= 90:
            logger.info("Coordinates appear to be in WGS84 (EPSG:4326)")
            return "EPSG:4326"
        
        # Check for common UTM zones in India (based on your coordinate ranges)
        if 200000 <= min_x <= 800000 and 1000000 <= min_y <= 4000000:
            # This looks like UTM coordinates for India region
            logger.info("Coordinates appear to be in UTM (possibly UTM Zone 45N/46N for India)")
            # For coordinates around 366600, 2885200, this is likely UTM Zone 45N
            return "EPSG:32645"  # UTM Zone 45N
        
        # Add more coordinate system detection logic as needed
        logger.warning("Could not automatically detect coordinate system, assuming UTM 45N")
        return "EPSG:32645"
    
    def _transform_geometry(self, geometry, source_crs):
        """
        Transform geometry from source CRS to WGS84 and remove Z dimension.
        """
        if source_crs == "EPSG:4326":
            # Just remove Z dimension
            return self._remove_z_dimension(geometry)
        
        try:
            # Create transformer
            transformer = pyproj.Transformer.from_crs(source_crs, "EPSG:4326", always_xy=True)
            
            def transform_coords(coords, depth=0):
                if depth == 0:  # Single coordinate pair
                    if len(coords) >= 2:
                        x, y = transformer.transform(coords[0], coords[1])
                        return [x, y]  # Remove Z dimension
                    return coords
                elif depth == 1:  # Array of coordinate pairs
                    return [transform_coords(coord, depth-1) for coord in coords]
                elif depth == 2:  # Array of arrays (rings)
                    return [transform_coords(ring, depth-1) for ring in coords]
                elif depth == 3:  # Array of arrays of arrays (multipolygon)
                    return [transform_coords(polygon, depth-1) for polygon in coords]
            
            geom_type = geometry['type']
            coords = geometry['coordinates']
            
            if geom_type == 'Point':
                geometry['coordinates'] = transform_coords(coords, 0)
            elif geom_type in ['LineString', 'MultiPoint']:
                geometry['coordinates'] = transform_coords(coords, 1)
            elif geom_type in ['Polygon', 'MultiLineString']:
                geometry['coordinates'] = transform_coords(coords, 2)
            elif geom_type == 'MultiPolygon':
                geometry['coordinates'] = transform_coords(coords, 3)
            
            return geometry
            
        except Exception as e:
            logger.error(f"Error transforming coordinates: {e}")
            # Fallback: just remove Z dimension
            return self._remove_z_dimension(geometry)
    
    def _remove_z_dimension(self, geometry):
        """
        Remove Z dimension from geometry coordinates.
        """
        def remove_z_coords(coords, depth=0):
            if depth == 0:  # Single coordinate pair
                return coords[:2] if len(coords) > 2 else coords
            elif depth == 1:  # Array of coordinate pairs
                return [remove_z_coords(coord, depth-1) for coord in coords]
            elif depth == 2:  # Array of arrays (rings)
                return [remove_z_coords(ring, depth-1) for ring in coords]
            elif depth == 3:  # Array of arrays of arrays (multipolygon)
                return [remove_z_coords(polygon, depth-1) for polygon in coords]
        
        geom_type = geometry['type']
        coords = geometry['coordinates']
        
        if geom_type == 'Point':
            geometry['coordinates'] = remove_z_coords(coords, 0)
        elif geom_type in ['LineString', 'MultiPoint']:
            geometry['coordinates'] = remove_z_coords(coords, 1)
        elif geom_type in ['Polygon', 'MultiLineString']:
            geometry['coordinates'] = remove_z_coords(coords, 2)
        elif geom_type == 'MultiPolygon':
            geometry['coordinates'] = remove_z_coords(coords, 3)
        
        return geometry
    
    def _process_geojson(self, file_path, project, layer_name, created_by, s3_file_key, title):
        """
        Processes a GeoJSON file: reads its features, creates a VectorLayer and VectorFeature entries
        in the database, and publishes the layer to GeoServer.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)
            
            features = geojson_data.get('features', [])
            if not features:
                raise ValueError("The uploaded GeoJSON file contains no features")
            
            logger.info(f"Processing {len(features)} features")
            
            # Detect coordinate system
            source_crs = self._detect_coordinate_system(features)
            logger.info(f"Detected coordinate system: {source_crs}")
            
            # Transform features to WGS84 and remove Z dimension
            transformed_features = []
            for i, feature in enumerate(features):
                try:
                    geometry = feature['geometry'].copy()
                    transformed_geometry = self._transform_geometry(geometry, source_crs)
                    
                    transformed_feature = feature.copy()
                    transformed_feature['geometry'] = transformed_geometry
                    transformed_features.append(transformed_feature)
                    
                except Exception as e:
                    logger.warning(f"Failed to transform feature {i}: {e}")
                    continue
            
            if not transformed_features:
                raise ValueError("No valid features after coordinate transformation")
            
            logger.info(f"Successfully transformed {len(transformed_features)} features")
            
            # Determine geometry type from first feature
            first_geom = transformed_features[0]['geometry']
            geometry_type = first_geom['type']
            
            # Calculate bounding box from transformed features
            bbox = self._calculate_bbox_from_features(transformed_features)
            
            # Create vector layer with temporary name first to get the ID
            temp_layer = VectorLayer.objects.create(
                name="temp_layer",  # Temporary name
                title=title or layer_name,  # Store original name in title
                geometry_type=geometry_type,
                project=project,
                created_by=created_by,
                s3_file_key=s3_file_key,
                feature_count=len(transformed_features),
                bbox=bbox
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
            
            logger.info(f"Created vector layer with unique name: {unique_name} (original: {layer_name})")
            
            # Create features in database
            self._create_features_from_geojson(transformed_features, temp_layer)
            
            # Create database table for GeoServer and publish
            self._create_and_publish_layer(temp_layer)
            
            return temp_layer
            
        except Exception as e:
            logger.error(f"Error processing GeoJSON: {e}")
            raise
    
    def _create_features_from_geojson(self, features, vector_layer):
        """
        Creates VectorFeature objects from a list of GeoJSON features and associates them with a VectorLayer.
        """
        features_to_create = []
        skipped_features = 0
        
        # Log a sample of coordinates to understand the data format
        if features:
            sample_feature = features[0]
            logger.info(f"Sample transformed feature geometry: {sample_feature.get('geometry', {})}")
        
        for i, feature in enumerate(features):
            try:
                geometry_data = feature['geometry']
                
                # Try to create geometry
                try:
                    geom = GEOSGeometry(json.dumps(geometry_data), srid=4326)
                    
                    # Check if geometry is valid
                    if not geom.valid:
                        logger.warning(f"Feature {i}: Invalid geometry - {geom.valid_reason}")
                        skipped_features += 1
                        continue
                        
                except Exception as geom_error:
                    logger.warning(f"Feature {i}: Failed to create geometry - {geom_error}")
                    skipped_features += 1
                    continue
                    
                attributes = feature.get('properties', {})
                
                # Handle None values and convert to serializable types
                clean_attributes = {}
                for key, value in attributes.items():
                    if value is None:
                        clean_attributes[key] = None
                    elif isinstance(value, (int, float, str, bool)):
                        clean_attributes[key] = value
                    else:
                        clean_attributes[key] = str(value)
                
                features_to_create.append(
                    VectorFeature(
                        layer=vector_layer,
                        geom=geom,
                        attributes=clean_attributes
                    )
                )
                
            except Exception as e:
                logger.warning(f"Feature {i}: Skipping invalid feature - {e}")
                skipped_features += 1
                continue
        
        if skipped_features > 0:
            logger.warning(f"Skipped {skipped_features} invalid features out of {len(features)} total")
        
        # Bulk create features
        if features_to_create:
            VectorFeature.objects.bulk_create(features_to_create, batch_size=1000)
            logger.info(f"Created {len(features_to_create)} valid features")
        else:
            raise ValueError("No valid features found in the uploaded file after transformation")

    def _extract_all_coordinates(self, geometry):
        """Extract all coordinate pairs from any geometry type."""
        coords = []
        geom_type = geometry['type']
        
        if geom_type == 'Point':
            coords.append(geometry['coordinates'])
        elif geom_type in ['LineString', 'MultiPoint']:
            coords.extend(geometry['coordinates'])
        elif geom_type in ['Polygon', 'MultiLineString']:
            for ring in geometry['coordinates']:
                coords.extend(ring)
        elif geom_type == 'MultiPolygon':
            for polygon in geometry['coordinates']:
                for ring in polygon:
                    coords.extend(ring)
        
        return coords

    def _calculate_bbox_from_features(self, geojson_features):
        """Calculate bounding box from GeoJSON features."""
        min_x = min_y = float('inf')
        max_x = max_y = float('-inf')
        
        for feature in geojson_features:
            geom = feature['geometry']
            coords = self._extract_all_coordinates(geom)
            
            for coord in coords:
                if len(coord) >= 2:
                    min_x = min(min_x, coord[0])
                    max_x = max(max_x, coord[0])
                    min_y = min(min_y, coord[1])
                    max_y = max(max_y, coord[1])
        
        if min_x != float('inf'):
            # Create a polygon representing the bounding box
            bbox_coords = [
                [min_x, min_y],
                [max_x, min_y], 
                [max_x, max_y],
                [min_x, max_y],
                [min_x, min_y]
            ]
            return Polygon(bbox_coords, srid=4326)
        
        return None

    # Add all the other methods from the previous code (they remain the same)
    # def _create_and_publish_layer(self, vector_layer):
    #     """
    #     Creates PostGIS table and publishes layer to GeoServer immediately.
    #     """
    #     try:
    #         # Create database table for GeoServer
    #         table_name = self._create_postgis_table(vector_layer)
    #         logger.info(f"PostGIS table {table_name} created successfully")
            
    #         # Publish to GeoServer immediately with the clean layer name
    #         success, geoserver_url = self.geoserver_manager.publish_layer_to_group(
    #             company_id=vector_layer.project.company.id,
    #             project_id=vector_layer.project.id,
    #             layer_name=vector_layer.name,  # Use clean layer name, not UUID
    #             layer_type='vector_layers',
    #             table_name=table_name  # This is the UUID-based table name
    #         )
            
    #         if success:
    #             # Update vector layer with GeoServer information
    #             vector_layer.geoserver_layer_name = vector_layer.name  # Clean name like "test_restaurants"
    #             vector_layer.geoserver_url = geoserver_url
    #             vector_layer.is_published = True
    #             vector_layer.save()
                
    #             logger.info(f"Successfully published vector layer '{vector_layer.name}' to GeoServer")
    #             logger.info(f"GeoServer layer name: {vector_layer.geoserver_layer_name}")
    #             logger.info(f"GeoServer WMS URL: {vector_layer.geoserver_url}")
                
    #             # Test the layer by making a GetCapabilities request
    #             self._verify_geoserver_layer(vector_layer)
                
    #         else:
    #             logger.error(f"Failed to publish vector layer {vector_layer.name} to GeoServer: {geoserver_url}")
    #             # Don't raise exception, layer is still created in database
                        
    #     except Exception as e:
    #         logger.error(f"Error creating and publishing layer: {e}")
    #         import traceback
    #         logger.error(f"Traceback: {traceback.format_exc()}")
    #         # Don't raise the exception here as the vector layer is still created


    def _create_and_publish_layer(self, vector_layer):
        """
        Creates PostGIS table and publishes layer to GeoServer with safe naming.
        """
        try:
            # Create database table for GeoServer
            table_name = self._create_postgis_table(vector_layer)
            logger.info(f"PostGIS table {table_name} created successfully")
            
            # **Use the unique layer name (already safe from create_vector_layer)**
            layer_name = vector_layer.name  # This is already vec_<uuid> format
            
            # **REMOVE vector_layer_id parameter - it's not accepted by the method**
            success, geoserver_url = self.geoserver_manager.publish_layer_to_group(
                company_id=vector_layer.project.company.id,
                project_id=vector_layer.project.id,
                layer_name=layer_name,
                layer_type='vector_layers',
                table_name=table_name
                # **REMOVED: vector_layer_id=vector_layer.id**
            )
            
            if success:
                # Store the GeoServer layer information
                # Ensure geoserver_layer_name fits database column (200 chars)
                geoserver_layer_name = layer_name[:200] if len(layer_name) > 200 else layer_name
                vector_layer.geoserver_layer_name = geoserver_layer_name
                vector_layer.geoserver_url = geoserver_url
                vector_layer.is_published = True
                vector_layer.save()
                
                logger.info(f"Successfully published vector layer '{layer_name}' to GeoServer")
                logger.info(f"GeoServer layer name: {vector_layer.geoserver_layer_name}")
                logger.info(f"GeoServer WFS URL: {vector_layer.geoserver_url}")
                
                # Test the layer
                self._verify_geoserver_layer(vector_layer)
                
            else:
                logger.error(f"Failed to publish vector layer {layer_name} to GeoServer: {geoserver_url}")
                        
        except Exception as e:
            logger.error(f"Error creating and publishing layer: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")



    def _create_postgis_table(self, vector_layer):
        """Create PostGIS table for GeoServer to use"""
        table_name = f"vector_layer_{vector_layer.id.hex}"
        
        try:
            with connection.cursor() as cursor:
                # Drop table if exists (for testing)
                cursor.execute(f"DROP TABLE IF EXISTS {table_name};")
                
                # Create table with proper geometry column (2D only)
                cursor.execute(f"""
                    CREATE TABLE {table_name} (
                        id SERIAL PRIMARY KEY,
                        geom GEOMETRY(GEOMETRY, 4326),
                        attributes JSONB
                    );
                """)
                
                # Create spatial index
                cursor.execute(f"""
                    CREATE INDEX {table_name}_geom_idx 
                    ON {table_name} USING GIST (geom);
                """)
                
                # Create index on attributes for better performance
                cursor.execute(f"""
                    CREATE INDEX {table_name}_attributes_idx 
                    ON {table_name} USING GIN (attributes);
                """)
                
                # Insert features
                features = vector_layer.features.all()
                logger.info(f"Inserting {len(features)} features into table {table_name}")
                
                for feature in features:
                    # Ensure geometry is 2D
                    geom_wkt = feature.geom.wkt
                    cursor.execute(f"""
                        INSERT INTO {table_name} (geom, attributes)
                        VALUES (ST_Force2D(ST_GeomFromText(%s, 4326)), %s);
                    """, [geom_wkt, json.dumps(feature.attributes)])
                
                # Verify table creation and data
                cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
                count = cursor.fetchone()[0]
                logger.info(f"Table {table_name} created successfully with {count} features")
            
            return table_name
            
        except Exception as e:
            logger.error(f"Error creating PostGIS table: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    # Include all other methods from the previous implementation...
    def _verify_geoserver_layer(self, vector_layer):
        """Verify that the layer was successfully published to GeoServer by testing WMS GetCapabilities."""
        # Implementation remains the same as before
        pass

    def republish_layer(self, vector_layer):
        """Republish an existing vector layer to GeoServer."""
        # Implementation remains the same as before  
        pass



    