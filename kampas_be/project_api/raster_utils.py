import os
import json
import logging
import tempfile
import uuid
from typing import Dict, List, Tuple, Optional, Any
import boto3
import rasterio
from rasterio.warp import transform_bounds
from django.conf import settings
from django.utils import timezone
from project_api.models import RasterLayer, Project
from project_api.geoserver_utils import get_geoserver_manager

logger = logging.getLogger(__name__)

class RasterDataProcessor:
    """Class for processing raster data files (GeoTIFF) from S3"""

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
                            description: str = "", created_by=None) -> RasterLayer:
        """Process an uploaded GeoTIFF file from S3"""
        try:
            logger.info(f"Processing raster file from S3: {file_key}")
            
            # Download file from S3 to temporary location for metadata extraction
            local_file_path = self._download_from_s3(file_key)
            if not local_file_path:
                raise Exception(f"Failed to download file from S3: {file_key}")

            # Extract metadata from GeoTIFF
            try:
                metadata = self._extract_raster_metadata(local_file_path)
                logger.info(f"Extracted metadata: CRS={metadata.get('crs')}, Size={metadata.get('width')}x{metadata.get('height')}")
            except Exception as e:
                os.remove(local_file_path)
                raise Exception(f"Failed to extract metadata: {str(e)}")

            # Create raster layer entry (store only S3 key, not the file)
            # Create raster layer with temporary name first to get the ID
            temp_raster_layer = RasterLayer.objects.create(
                project=project,
                file_name="temp_raster",  # Temporary name
                description=description,
                s3_file_key=file_key,
                uploaded_by=created_by,
                crs=metadata.get('crs'),
                bounding_box=metadata.get('bounding_box'),
                pixel_size=metadata.get('pixel_size'),
                width=metadata.get('width'),
                height=metadata.get('height'),
                band_count=metadata.get('band_count'),
                band_descriptions=metadata.get('band_descriptions')
            )

            # **FIX: Generate unique name using the ID to avoid conflicts**
            # Store original name in description and use consistent naming for file_name
            unique_name = f"raster_layer_{temp_raster_layer.id.hex}"
            
            # Ensure it fits database field constraints (database column is 200 chars)
            # Django model says 255 but actual DB column is 200
            db_max_length = 200  # Actual database column limit
            if len(unique_name) > db_max_length:
                unique_name = unique_name[:db_max_length]
                logger.warning(f"Truncated raster layer name to fit database column: {unique_name}")
            
            # Update with the unique name and store original name in description
            temp_raster_layer.file_name = unique_name
            temp_raster_layer.description = f"{description} (Original: {file_name})" if description else f"Original: {file_name}"
            temp_raster_layer.save()
            
            logger.info(f"Created raster layer with unique name: {unique_name} (original: {file_name})")

            # Publish to GeoServer and add to layer group
            self._create_and_publish_layer(temp_raster_layer, local_file_path)

            # Clean up temp file
            os.remove(local_file_path)

            return temp_raster_layer

        except Exception as e:
            logger.error(f"Error processing raster file: {str(e)}")
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

    def _extract_raster_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract metadata from a GeoTIFF file"""
        with rasterio.open(file_path) as dataset:
            # Get CRS
            crs = None
            if dataset.crs:
                crs = dataset.crs.to_string()

            # Get bounding box
            bounds = dataset.bounds
            bounding_box = [bounds.left, bounds.bottom, bounds.right, bounds.top]

            # If CRS is not EPSG:4326, transform bounds to WGS84 for standardization
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

            # Get band information
            band_count = dataset.count
            band_descriptions = []
            for i in range(1, band_count + 1):
                try:
                    band = dataset.read(i, masked=True)
                    band_info = {
                        'index': i,
                        'dtype': str(band.dtype),
                        'nodata': dataset.nodata
                    }

                    # Get basic statistics if possible
                    if not band.mask.all():
                        valid_data = band.compressed()
                        if len(valid_data) > 0:
                            band_info.update({
                                'min': float(valid_data.min()),
                                'max': float(valid_data.max()),
                                'mean': float(valid_data.mean())
                            })

                    # Try to get band description
                    desc = dataset.descriptions[i-1] if dataset.descriptions and i-1 < len(dataset.descriptions) else None
                    if desc:
                        band_info['description'] = desc
                    else:
                        band_info['description'] = f"Band {i}"

                    band_descriptions.append(band_info)
                except Exception as e:
                    logger.warning(f"Could not process band {i}: {str(e)}")
                    band_descriptions.append({
                        'index': i,
                        'description': f"Band {i}",
                        'dtype': 'unknown'
                    })

            return {
                'crs': crs,
                'bounding_box': bounding_box,
                'pixel_size': pixel_size,
                'width': width,
                'height': height,
                'band_count': band_count,
                'band_descriptions': band_descriptions
            }

    def _create_and_publish_layer(self, raster_layer: RasterLayer, local_file_path: str):
        """Create and publish raster layer to GeoServer with retry logic and unique naming"""
        try:
            # Ensure company workspace exists
            company_id = raster_layer.project.company.id
            if not self.geoserver_manager.create_company_workspace(company_id):
                logger.error(f"Failed to create workspace for company {company_id}")
                return

            workspace = company_id
            
            # **FIX: Use consistent naming like vector layers to prevent duplicates**
            # Use the same name for both store and layer: raster_layer_<id>
            layer_name = f"raster_layer_{raster_layer.id.hex}"
            store_name = layer_name  # Use same name for store and layer
            
            logger.info(f"Using consistent naming: layer={layer_name}, store={store_name}")

            # Publish to GeoServer with retry logic
            max_retries = 3
            retry_count = 0
            while retry_count < max_retries:
                try:
                    success, message = self.geoserver_manager.publish_raster_layer(
                        workspace=workspace,
                        store_name=store_name,
                        layer_name=layer_name,
                        file_path=local_file_path,
                        title=raster_layer.file_name
                    )

                    if success:
                        # Update raster layer with GeoServer info
                        raster_layer.geoserver_layer_name = layer_name
                        
                        # **FIX: Ensure geoserver_url fits database column (200 chars)**
                        geoserver_url = f"{self.geoserver_manager.base_url}/{workspace}/wms"
                        if len(geoserver_url) > 200:
                            # Truncate to 200 chars and add ellipsis
                            truncated_url = geoserver_url[:197] + "..."
                            raster_layer.geoserver_url = truncated_url
                            logger.warning(f"Truncated geoserver_url to fit database column: {truncated_url}")
                        else:
                            raster_layer.geoserver_url = geoserver_url
                        
                        raster_layer.is_published = True
                        raster_layer.save()
                        logger.info(f"Successfully published raster layer {layer_name} to GeoServer")

                        # Add to raster layer group
                        self._add_to_layer_group(raster_layer, workspace)
                        break
                    else:
                        logger.error(f"Failed to publish raster layer {layer_name}: {message}")
                        retry_count += 1
                        if retry_count < max_retries:
                            logger.info(f"Retrying publication attempt {retry_count + 1}/{max_retries}")
                            import time
                            time.sleep(2)

                except Exception as e:
                    logger.error(f"Error during GeoServer publication attempt {retry_count + 1}: {e}")
                    retry_count += 1
                    if retry_count < max_retries:
                        logger.info(f"Retrying publication attempt {retry_count + 1}/{max_retries}")
                        import time
                        time.sleep(2)

            if retry_count >= max_retries:
                logger.error(f"Failed to publish raster layer {layer_name} after {max_retries} attempts")

        except Exception as e:
            logger.error(f"Error creating and publishing raster layer: {e}")

    def _check_layer_exists(self, workspace: str, layer_name: str) -> bool:
        """Check if a layer already exists in GeoServer workspace"""
        try:
            import requests
            url = f"{self.geoserver_manager.base_url}/rest/workspaces/{workspace}/layers/{layer_name}"
            response = requests.get(url, auth=self.geoserver_manager.auth)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Error checking layer existence: {e}")
            return False

    def _add_to_layer_group(self, raster_layer: RasterLayer, workspace: str):
        """Add raster layer to the appropriate layer group"""
        try:
            project_id = raster_layer.project.id
            group_name = f"{project_id}_raster_layers"
            layer_name = raster_layer.geoserver_layer_name

            success = self.geoserver_manager.create_layer_group_with_layer(
                company_id=workspace,
                project_id=project_id,
                group_name='raster_layers',
                layer_name=layer_name
            )

            if success:
                logger.info(f"Added raster layer {layer_name} to group {group_name}")
            else:
                logger.warning(f"Failed to add raster layer {layer_name} to group {group_name}")

        except Exception as e:
            logger.warning(f"Error adding raster layer to group: {e}")

    def delete_layer_from_geoserver(self, raster_layer: RasterLayer):
        """Delete raster layer from GeoServer"""
        try:
            if raster_layer.is_published and raster_layer.geoserver_layer_name:
                workspace = raster_layer.project.company.id
                store_name = f"raster_store_{raster_layer.id.hex}"

                success = self.geoserver_manager.delete_raster_layer(
                    workspace=workspace,
                    store_name=store_name,
                    layer_name=raster_layer.geoserver_layer_name
                )

                if success:
                    logger.info(f"Successfully deleted raster layer {raster_layer.geoserver_layer_name} from GeoServer")
                    return True
                else:
                    logger.error(f"Failed to delete raster layer {raster_layer.geoserver_layer_name} from GeoServer")
                    return False
            else:
                logger.info(f"Raster layer {raster_layer.file_name} is not published in GeoServer")
                return True

        except Exception as e:
            logger.error(f"Error deleting raster layer from GeoServer: {e}")
            return False

    def republish_layer(self, raster_layer: RasterLayer):
        """Republish an existing raster layer to GeoServer"""
        try:
            if not raster_layer.s3_file_key:
                logger.error(f"No S3 file key found for raster layer {raster_layer.id}")
                return False

            local_file_path = self._download_from_s3(raster_layer.s3_file_key)
            if not local_file_path:
                logger.error(f"Failed to download file from S3 for republishing: {raster_layer.s3_file_key}")
                return False

            self._create_and_publish_layer(raster_layer, local_file_path)

            os.remove(local_file_path)
            return raster_layer.is_published

        except Exception as e:
            logger.error(f"Error republishing raster layer: {e}")
            return False
