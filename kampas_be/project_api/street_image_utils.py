# project_api/street_image_utils.py
import os
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS, GPSTAGS
import piexif
import exifread
import io
from django.contrib.gis.geos import Point
from django.utils import timezone
from pytz import timezone as pytz_timezone
import boto3
from django.conf import settings
from django.db import connection
from kampas_be.project_api.geoserver_utils import GeoServerManager, StreetImageryLayerManager
from .models import StreetImage

logger = logging.getLogger(__name__)

class StreetImageProcessor:
    """Handle street image processing with EXIF extraction and S3 operations"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # Initialize GeoServer manager
        self.geoserver = GeoServerManager()
        
        # Ensure street imagery table exists
        # self.geoserver.ensure_street_imagery_table_exists()
    
    def extract_exif_metadata(self, image_file) -> Dict[str, Any]:
        """Extract EXIF metadata from image file"""
        try:
            image = Image.open(image_file)
            exif_dict = image.getexif()
            
            metadata = {
                'captured_at': None,
                'location': None,
                'altitude': None,
                'yaw': None,
                'pitch': None,
                'roll': None,
                'focal_length': None,
                'f_number': None,
                'exposure_time': None,
                'iso_speed': None,
                'camera_make': None,
                'camera_model': None,
            }
            
            if not exif_dict:
                logger.warning("No EXIF data found in image")
                return metadata
            
            # Extract basic EXIF data
            for tag_id, value in exif_dict.items():
                tag = TAGS.get(tag_id, tag_id)
                
                if tag == 'DateTime':
                    try:
                        metadata['captured_at'] = datetime.strptime(str(value), '%Y:%m:%d %H:%M:%S')
                    except (ValueError, TypeError):
                        pass
                
                elif tag == 'Make':
                    metadata['camera_make'] = str(value)
                
                elif tag == 'Model':
                    metadata['camera_model'] = str(value)
                
                elif tag == 'FocalLength':
                    try:
                        if isinstance(value, tuple) and len(value) == 2:
                            metadata['focal_length'] = float(value[0]) / float(value[1])
                        else:
                            metadata['focal_length'] = float(value)
                    except (ValueError, TypeError, ZeroDivisionError):
                        pass
                
                elif tag == 'FNumber':
                    try:
                        if isinstance(value, tuple) and len(value) == 2:
                            metadata['f_number'] = float(value[0]) / float(value[1])
                        else:
                            metadata['f_number'] = float(value)
                    except (ValueError, TypeError, ZeroDivisionError):
                        pass
                
                elif tag == 'ExposureTime':
                    try:
                        if isinstance(value, tuple) and len(value) == 2:
                            metadata['exposure_time'] = f"{value[0]}/{value[1]}"
                        else:
                            metadata['exposure_time'] = str(value)
                    except (ValueError, TypeError):
                        pass
                
                elif tag == 'ISOSpeedRatings':
                    try:
                        metadata['iso_speed'] = int(value)
                    except (ValueError, TypeError):
                        pass
            
            # Extract GPS information
            gps_info = self._extract_gps_info(exif_dict)
            if gps_info:
                metadata.update(gps_info)
            
            # Extract orientation data (yaw, pitch, roll) if available
            orientation_data = self._extract_orientation_data(exif_dict)
            if orientation_data:
                metadata.update(orientation_data)
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting EXIF metadata: {e}")
            return {
                'captured_at': None,
                'location': None,
                'altitude': None,
                'yaw': None,
                'pitch': None,
                'roll': None,
                'focal_length': None,
                'f_number': None,
                'exposure_time': None,
                'iso_speed': None,
                'camera_make': None,
                'camera_model': None,
            }
    
    def _extract_gps_info(self, exif_dict) -> Optional[Dict[str, Any]]:
        """Fixed GPS extraction with proper error handling"""
        try:
            gps_info = exif_dict.get_ifd(ExifTags.IFD.GPSInfo)
            if not gps_info:
                return None
            
            def convert_to_degrees(value):
                """Convert GPS coordinates with proper type checking"""
                try:
                    # **FIX: Handle different data types**
                    if isinstance(value, (int, float)):
                        return float(value)
                    elif isinstance(value, (list, tuple)) and len(value) >= 3:
                        d = float(value[0]) if value[0] else 0.0
                        m = float(value[1]) if value[1] else 0.0  
                        s = float(value[2]) if value[2] else 0.0
                        return d + (m / 60.0) + (s / 3600.0)
                    else:
                        logger.warning(f"Unexpected GPS coordinate format: {value} (type: {type(value)})")
                        return None
                except (ValueError, TypeError, IndexError, ZeroDivisionError) as e:
                    logger.warning(f"Error converting GPS coordinates {value}: {e}")
                    return None
            
            lat = None
            lon = None
            
            # **FIXED: Handle GPS latitude extraction**
            if 2 in gps_info and 1 in gps_info:  # GPSLatitude and GPSLatitudeRef
                try:
                    lat_value = gps_info[2]
                    lat_ref = gps_info[1]
                    
                    lat = convert_to_degrees(lat_value)
                    if lat is not None and isinstance(lat_ref, str) and lat_ref.upper() == 'S':
                        lat = -lat
                except Exception as e:
                    logger.warning(f"Error processing latitude: {e}")
                    lat = None
            
            # **FIXED: Handle GPS longitude extraction**  
            if 4 in gps_info and 3 in gps_info:  # GPSLongitude and GPSLongitudeRef
                try:
                    lon_value = gps_info[4]
                    lon_ref = gps_info[3]
                    
                    lon = convert_to_degrees(lon_value)
                    if lon is not None and isinstance(lon_ref, str) and lon_ref.upper() == 'W':
                        lon = -lon
                except Exception as e:
                    logger.warning(f"Error processing longitude: {e}")
                    lon = None
            
            result = {}
            if lat is not None and lon is not None:
                from django.contrib.gis.geos import Point
                result['location'] = Point(lon, lat, srid=4326)
                result['latitude'] = lat
                result['longitude'] = lon
                logger.info(f"Successfully extracted GPS coordinates: ({lat}, {lon})")
            else:
                logger.warning("No valid GPS coordinates found in EXIF data")
            
            return result if result else None
            
        except Exception as e:
            logger.error(f"Error extracting GPS info: {e}")
            return None

        
    def _extract_orientation_data(self, exif_dict) -> Optional[Dict[str, Any]]:
        """Extract orientation data (yaw, pitch, roll) from EXIF data"""
        try:
            # Note: Standard EXIF doesn't have yaw/pitch/roll fields
            # Some cameras store this in MakerNote or custom fields
            # This is a basic implementation that can be extended
            
            orientation_data = {}
            
            # Look for common orientation tags (these are manufacturer-specific)
            for tag_id, value in exif_dict.items():
                tag = TAGS.get(tag_id, tag_id)
                
                # Some cameras store orientation in custom fields
                if isinstance(tag, str):
                    if 'yaw' in tag.lower() or 'heading' in tag.lower():
                        try:
                            orientation_data['yaw'] = float(value)
                        except (ValueError, TypeError):
                            pass
                    
                    elif 'pitch' in tag.lower():
                        try:
                            orientation_data['pitch'] = float(value)
                        except (ValueError, TypeError):
                            pass
                    
                    elif 'roll' in tag.lower():
                        try:
                            orientation_data['roll'] = float(value)
                        except (ValueError, TypeError):
                            pass
            
            return orientation_data if orientation_data else None
            
        except Exception as e:
            logger.error(f"Error extracting orientation data: {e}")
            return None
    
    def upload_to_s3(self, file_obj, s3_key: str, content_type: str = 'image/jpeg') -> bool:
        """Upload image file to S3"""
        try:
            file_obj.seek(0)  # Reset file pointer
            
            self.s3_client.upload_fileobj(
                file_obj,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ACL': 'private'  # Keep images private by default
                }
            )
            
            logger.info(f"Successfully uploaded image to S3: {s3_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            return False
    
    def get_s3_url(self, s3_key: str) -> str:
        """Generate S3 URL for the uploaded image"""
        return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{s3_key}"
    
    def process_uploaded_image(self, image_file, project, unique_filename: str, 
                              original_filename: str, uploaded_by, 
                              image_type: str = 'front_view') -> 'StreetImage':
        """Process uploaded street image with EXIF extraction and S3 upload"""
        from .models import StreetImage  # Import here to avoid circular import
        
        try:
            # Extract EXIF metadata
            logger.info(f"Extracting EXIF metadata from {original_filename}")
            metadata = self.extract_exif_metadata(image_file)
            
            # Generate S3 key
            s3_key = f"{project.company.id}/{project.id}/street_imagery/{unique_filename}"
            
            # Determine content type
            file_extension = os.path.splitext(original_filename)[1].lower()
            content_type_map = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.tiff': 'image/tiff',
                '.tif': 'image/tiff'
            }
            content_type = content_type_map.get(file_extension, 'image/jpeg')
            
            # Upload to S3
            logger.info(f"Uploading {original_filename} to S3")
            image_file.seek(0)  # Reset file pointer
            file_size = len(image_file.read())
            
            if not self.upload_to_s3(image_file, s3_key, content_type):
                raise Exception("Failed to upload image to S3")
            
            # Generate S3 URL
            file_path = self.get_s3_url(s3_key)
            
            # Create StreetImage instance
            street_image = StreetImage.objects.create(
                project=project,
                unique_filename=unique_filename,
                original_filename=original_filename,
                file_path=file_path,
                file_size=file_size,
                image_type=image_type,
                captured_at=metadata.get('captured_at'),
                location=metadata.get('location'),
                altitude=metadata.get('altitude'),
                yaw=metadata.get('yaw'),
                pitch=metadata.get('pitch'),
                roll=metadata.get('roll'),
                focal_length=metadata.get('focal_length'),
                f_number=metadata.get('f_number'),
                exposure_time=metadata.get('exposure_time'),
                iso_speed=metadata.get('iso_speed'),
                camera_make=metadata.get('camera_make'),
                camera_model=metadata.get('camera_model'),
                uploaded_by=uploaded_by,
                processing_status='completed'
            )
            
            logger.info(f"Successfully created StreetImage: {street_image.id}")
            return street_image
            
        except Exception as e:
            logger.error(f"Error processing street image: {e}")
            raise


    def process_street_image_from_s3(self, s3_key: str, project, unique_filename: str,
                                original_filename: str, uploaded_by, 
                                image_type: str = 'front_view', notes: str = '',
                                file_size: int = 0) -> 'StreetImage':
        """Process street image that's already uploaded to S3"""
        
        try:
            # Download image from S3 for EXIF processing
            response = self.s3_client.get_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key
            )
            
            # Extract EXIF metadata
            image_data = response['Body']
            metadata = self.extract_exif_metadata(image_data)
            
            # Generate S3 URL
            file_path = self.get_s3_url(s3_key)
            
            # Create StreetImage instance
            street_image = StreetImage.objects.create(
                project=project,
                unique_filename=unique_filename,
                original_filename=original_filename,
                file_path=file_path,
                file_size=file_size or response.get('ContentLength', 0),
                image_type=image_type,
                captured_at=metadata.get('captured_at'),
                location=metadata.get('location'),
                altitude=metadata.get('altitude'),
                yaw=metadata.get('yaw'),
                pitch=metadata.get('pitch'),
                roll=metadata.get('roll'),
                focal_length=metadata.get('focal_length'),
                f_number=metadata.get('f_number'),
                exposure_time=metadata.get('exposure_time'),
                iso_speed=metadata.get('iso_speed'),
                camera_make=metadata.get('camera_make'),
                camera_model=metadata.get('camera_model'),
                notes=notes,
                uploaded_by=uploaded_by,
                processing_status='completed'
            )
            
            # Add street image to GeoServer layer
            if street_image.location:
                self.add_to_street_imagery_layer(street_image)
            
            logger.info(f"Successfully created StreetImage from S3: {street_image.id}")
            return street_image
            
        except Exception as e:
            logger.error(f"Error processing street image from S3: {e}")
            raise
            
    def add_to_street_imagery_layer(self, street_image):
        """Add street image to GeoServer street imagery layer as a point feature"""
        try:
            # Only add images with valid location data
            if not street_image.location:
                logger.warning(f"Cannot add street image {street_image.id} to layer: No location data")
                return False

            # Skip images with default coordinates (0,0)
            if street_image.latitude == 0.0 and street_image.longitude == 0.0:
                logger.warning(f"Skipping street image {street_image.id} with default coordinates (0,0)")
                return False

            # Use StreetImageryLayerManager for project-specific layer management
            layer_manager = StreetImageryLayerManager(company_id=street_image.project.company.id)
            
            # Ensure project-specific layer exists
            layer_created = layer_manager.get_or_create_project_street_layer(str(street_image.project.id))
            
            if layer_created:
                # Add point to project-specific layer
                success = layer_manager.add_street_image_to_project_layer(street_image, str(street_image.project.id))
                if success:
                    logger.info(f"Added street image {street_image.id} to project street imagery layer")
                    return True
                else:
                    logger.error(f"Failed to add street image {street_image.id} to project layer")
                    return False
            else:
                logger.error(f"Failed to create/verify project street imagery layer for project {street_image.project.id}")
                return False

        except Exception as e:
            logger.error(f"Error adding street image to layer: {e}")
            return False
