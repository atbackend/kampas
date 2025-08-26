import os
import json
import logging
import tempfile
import uuid
from typing import Dict, List, Tuple, Optional, Any
import boto3
import rasterio
import numpy as np
from rasterio.warp import transform_bounds
from django.conf import settings
from django.utils import timezone

from kampas_be.project_api.models import TerrainModel, Project
from kampas_be.project_api.geoserver_utils import get_geoserver_manager

logger = logging.getLogger(__name__)

class TerrainDataProcessor:
    """Class for processing terrain data files from S3"""

    def __init__(self):
        """Initialize with S3 client and GeoServer manager"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.geoserver_manager = get_geoserver_manager()

    def process_uploaded_file(self, file_key: str, project: Project, file_name: str,
                            terrain_type: str = 'DEM', description: str = "", created_by=None) -> TerrainModel:
        """Process an uploaded terrain file from S3"""
        try:
            logger.info(f"Processing terrain file from S3: {file_key}")

            # Download file from S3 to temporary location for metadata extraction
            local_file_path = self._download_from_s3(file_key)
            if not local_file_path:
                raise Exception(f"Failed to download file from S3: {file_key}")

            # Extract metadata and validate as terrain data
            try:
                metadata = self._extract_terrain_metadata(local_file_path)
                if not self._is_elevation_data(local_file_path):
                    logger.warning(f"File {file_key} may not contain elevation data")
                
                logger.info(f"Extracted metadata: CRS={metadata.get('crs')}, Size={metadata.get('width')}x{metadata.get('height')}")
            except Exception as e:
                os.remove(local_file_path)
                raise Exception(f"Failed to extract terrain metadata: {str(e)}")

            # Determine file type from extension
            file_extension = os.path.splitext(file_key)[1].lower().lstrip('.')
            if file_extension not in ['tif', 'tiff', 'asc', 'xyz']:
                file_extension = 'tif'  # Default

            # Create terrain model with temporary name first to get the ID
            temp_terrain_model = TerrainModel.objects.create(
                project=project,
                file_name="temp_terrain",  # Temporary name
                terrain_type=terrain_type,
                file_type=file_extension,
                description=description,
                s3_file_key=file_key,
                uploaded_by=created_by,
                crs=metadata.get('crs'),
                bounding_box=metadata.get('bounding_box'),
                pixel_size=metadata.get('pixel_size'),
                width=metadata.get('width'),
                height=metadata.get('height'),
                min_elevation=metadata.get('min_elevation'),
                max_elevation=metadata.get('max_elevation')
            )

            # **FIX: Generate unique name using the ID to avoid conflicts**
            # Store original name in description and use consistent naming for file_name
            unique_name = f"terrain_layer_{temp_terrain_model.id.hex}"
            
            # Ensure it fits database field constraints (database column is 200 chars)
            # Django model says 255 but actual DB column is 200
            db_max_length = 200  # Actual database column limit
            if len(unique_name) > db_max_length:
                unique_name = unique_name[:db_max_length]
                logger.warning(f"Truncated terrain layer name to fit database column: {unique_name}")
            
            # Update with the unique name and store original name in description
            temp_terrain_model.file_name = unique_name
            temp_terrain_model.description = f"{description} (Original: {file_name})" if description else f"Original: {file_name}"
            temp_terrain_model.save()
            
            logger.info(f"Created terrain model with unique name: {unique_name} (original: {file_name})")

            # Publish to GeoServer and add to layer group
            self._create_and_publish_layer(temp_terrain_model, local_file_path)

            # Clean up temp file
            os.remove(local_file_path)

            return temp_terrain_model

        except Exception as e:
            logger.error(f"Error processing terrain file: {str(e)}")
            raise

    def _download_from_s3(self, file_key: str) -> Optional[str]:
        """Download file from S3 to a temporary location for processing"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.tif')
            temp_file_path = temp_file.name
            temp_file.close()

            self.s3_client.download_file(
                settings.AWS_STORAGE_BUCKET_NAME,
                file_key,
                temp_file_path
            )

            logger.info(f"Downloaded {file_key} to temporary file: {temp_file_path}")
            return temp_file_path

        except Exception as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            return None

    def _extract_terrain_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from a terrain file"""
        with rasterio.open(file_path) as dataset:
            # Get CRS
            crs = None
            if dataset.crs:
                crs = dataset.crs.to_string()

            # Get bounding box
            bounds = dataset.bounds
            bounding_box = [bounds.left, bounds.bottom, bounds.right, bounds.top]

            # Transform bounds to WGS84 if not already
            if crs and 'EPSG:4326' not in crs:
                try:
                    bounding_box = list(transform_bounds(dataset.crs, 'EPSG:4326',
                                                       bounds.left, bounds.bottom,
                                                       bounds.right, bounds.top))
                except Exception as e:
                    logger.warning(f"Could not transform bounds to EPSG:4326: {str(e)}")

            # Get pixel size (resolution)
            pixel_size = [abs(dataset.transform[0]), abs(dataset.transform[4])]

            # Get dimensions
            width = dataset.width
            height = dataset.height

            # Get elevation statistics
            min_elevation = None
            max_elevation = None

            try:
                # Read the first band for elevation data
                band = dataset.read(1, masked=True)
                if not band.mask.all():
                    valid_data = band.compressed()
                    if len(valid_data) > 0:
                        min_elevation = float(valid_data.min())
                        max_elevation = float(valid_data.max())
            except Exception as e:
                logger.warning(f"Could not compute elevation statistics: {str(e)}")

            return {
                'crs': crs,
                'bounding_box': bounding_box,
                'pixel_size': pixel_size,
                'width': width,
                'height': height,
                'band_count': dataset.count,
                'min_elevation': min_elevation,
                'max_elevation': max_elevation
            }

    def _is_elevation_data(self, file_path: str) -> bool:
        """Determine if the file contains elevation data"""
        try:
            with rasterio.open(file_path) as dataset:
                # Check if single band (typical for elevation)
                if dataset.count != 1:
                    logger.info("Terrain file is not single band - may not be elevation data")
                    return False

                # Check data type - elevation data is usually integer or float
                dtype = dataset.dtypes[0]
                if np.dtype(dtype).kind not in ['u', 'i', 'f']:  # unsigned, signed int, or float
                    logger.info(f"Data type {dtype} is not typical for elevation data")
                    return False

                # Check descriptions for non-RGB content
                descriptions = dataset.descriptions
                if descriptions:
                    for desc in descriptions:
                        if desc and desc.lower() in ['red', 'green', 'blue', 'rgb', 'nir']:
                            logger.info(f"File appears to be RGB/multispectral, not elevation: {descriptions}")
                            return False

                logger.info("File appears to contain elevation data")
                return True

        except Exception as e:
            logger.error(f"Error checking if file is elevation data: {e}")
            return False

    def _create_and_publish_layer(self, terrain_model: TerrainModel, local_file_path: str):
        """Create and publish terrain layer to GeoServer"""
        try:
            # Ensure company workspace exists
            company_id = terrain_model.project.company.id
            if not self.geoserver_manager.create_company_workspace(company_id):
                logger.error(f"Failed to create workspace for company {company_id}")
                return

            # **FIX: Use consistent naming like vector layers to prevent duplicates**
            # Use the same name for both store and layer: terrain_layer_<id>
            layer_name = f"terrain_layer_{terrain_model.id.hex}"
            store_name = layer_name  # Use same name for store and layer

            workspace = company_id

            # Publish to GeoServer
            success, message = self.geoserver_manager.publish_terrain_layer(
                workspace=workspace,
                store_name=store_name,
                layer_name=layer_name,
                file_path=local_file_path,
                terrain_type=terrain_model.terrain_type,
                title=terrain_model.file_name
            )

            if success:
                # Update terrain model with GeoServer info
                terrain_model.geoserver_layer_name = layer_name
                
                # **FIX: Ensure geoserver_url fits database column (200 chars)**
                geoserver_url = f"{self.geoserver_manager.base_url}/{workspace}/wms"
                if len(geoserver_url) > 200:
                    # Truncate to 200 chars and add ellipsis
                    truncated_url = geoserver_url[:197] + "..."
                    terrain_model.geoserver_url = truncated_url
                    logger.warning(f"Truncated geoserver_url to fit database column: {truncated_url}")
                else:
                    terrain_model.geoserver_url = geoserver_url
                
                terrain_model.is_published = True
                terrain_model.save()

                logger.info(f"Successfully published terrain layer {layer_name} to GeoServer")

                # Add to terrain layer group
                self._add_to_layer_group(terrain_model, workspace)
            else:
                logger.error(f"Failed to publish terrain layer {layer_name}: {message}")

        except Exception as e:
            logger.error(f"Error creating and publishing terrain layer: {e}")

    def _add_to_layer_group(self, terrain_model: TerrainModel, workspace: str):
        """Add terrain layer to the appropriate layer group"""
        try:
            project_id = terrain_model.project.id
            group_name = f"{project_id}_terrain_models"
            layer_name = terrain_model.geoserver_layer_name

            success = self.geoserver_manager.create_layer_group_with_layer(
                company_id=workspace,
                project_id=project_id,
                group_name='terrain_models',
                layer_name=layer_name
            )

            if success:
                logger.info(f"Added terrain layer {layer_name} to group {group_name}")
            else:
                logger.warning(f"Failed to add terrain layer {layer_name} to group {group_name}")

        except Exception as e:
            logger.warning(f"Error adding terrain layer to group: {e}")
