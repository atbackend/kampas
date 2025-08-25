# project_api/file_upload_utils.py
import os
import uuid
import mimetypes
import random
import string
from typing import List, Tuple, Dict, Any

import boto3
from django.conf import settings
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)

class FileUploadProcessor:
    """Handle multiple file uploads with UUID renaming and S3 organization"""
    
    # Define file type to folder mapping
    FOLDER_MAPPING = {
        'vector_layers': ['.geojson', '.shp', '.zip', '.kml', '.gpx'],
        'raster_layers': ['.tif', '.tiff', '.geotiff', '.jp2'],
        'terrain_models': ['.dem', '.dtm', '.dsm', '.asc', '.xyz', '.tif', '.tiff'],
        'street_imagery': ['.jpg', '.jpeg', '.png', '.tiff', '.raw', '.cr2', '.nef'],
        'point_clouds': ['.las', '.laz', '.ply', '.pcd', '.xyz', '.pts', '.e57']
    }
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
    def get_s3_client(self):
        """Return the S3 client instance"""
        return self.s3_client
    
    def generate_unique_filename(self, original_filename: str, length: int = 25) -> str:
        """Generate a unique filename with UUID-like random string"""
        # Clean the filename first (remove path if present)
        clean_filename = os.path.basename(original_filename)
        file_extension = os.path.splitext(clean_filename)[1].lower()
        
        # Generate random string of specified length
        random_string = ''.join(random.choices(
            string.ascii_lowercase + string.digits, 
            k=length
        ))
        
        return f"{random_string}{file_extension}"
    
    def determine_file_category(self, filename: str) -> str:
        """Determine which folder category a file belongs to"""
        clean_filename = os.path.basename(filename)
        file_extension = os.path.splitext(clean_filename)[1].lower()
        
        for folder, extensions in self.FOLDER_MAPPING.items():
            if file_extension in extensions:
                return folder
        
        # Default fallback
        return 'other_files'
    
    def generate_s3_key(self, company_id: str, project_id: str, 
                       folder_category: str, filename: str) -> str:
        """Generate the full S3 key path"""
        return f"{company_id}/{project_id}/{folder_category}/{filename}"
    
    def get_file_mime_type(self, filename: str) -> str:
        """Get MIME type of file"""
        clean_filename = os.path.basename(filename)
        mime_type, _ = mimetypes.guess_type(clean_filename)
        return mime_type or 'application/octet-stream'
    
    def get_presigned_upload_url(self, s3_key: str, mime_type: str, expires_in: int = 3600) -> Dict[str, Any]:
        """Generate presigned URL for direct S3 upload with debugging"""
        try:
            logger.info(f"Generating presigned URL for key: {s3_key}")
            logger.info(f"Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
            logger.info(f"MIME type: {mime_type}")
            
            presigned_data = self.s3_client.generate_presigned_post(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key,
                Fields={
                    'Content-Type': mime_type,
                },
                Conditions=[
                    {'Content-Type': mime_type},
                    ['content-length-range', 1, 100 * 1024 * 1024 * 1024],
                    {'bucket': settings.AWS_STORAGE_BUCKET_NAME},
                    {'key': s3_key}
                    # Removed problematic starts-with condition for file field
                ],
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned URL: {presigned_data['url']}")
            logger.info(f"Form fields key: {presigned_data['fields'].get('key')}")
            
            return {
                'url': presigned_data['url'],
                'fields': presigned_data['fields'],
                's3_key': s3_key
            }
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
    
    def verify_file_upload(self, s3_key: str) -> bool:
        """Verify that file was successfully uploaded to S3"""
        try:
            response = self.s3_client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key
            )
            logger.debug(f"✓ File found in S3: {s3_key} (Size: {response['ContentLength']} bytes)")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.debug(f"File not found in S3: {s3_key}")
                return False
            else:
                logger.error(f"✗ Error checking S3 file {s3_key}: {e}")
                return False
        except Exception as e:
            logger.error(f"✗ Unexpected error checking S3 file {s3_key}: {e}")
            return False
    
    def get_s3_file_size(self, s3_key: str) -> int:
        """Get actual file size from S3"""
        try:
            response = self.s3_client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key
            )
            return response['ContentLength']
        except Exception as e:
            logger.warning(f"Could not get file size for {s3_key}: {e}")
            return 0

    
    def verify_file_upload_with_details(self, s3_key: str) -> bool:
        """Enhanced verification with comprehensive logging"""
        try:
            logger.info(f"🔍 S3 Check Details:")
            logger.info(f"   Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
            logger.info(f"   Key: {s3_key}")
            logger.info(f"   Region: {settings.AWS_S3_REGION_NAME}")
            
            response = self.s3_client.head_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=s3_key
            )
            
            file_size = response['ContentLength']
            last_modified = response['LastModified']
            content_type = response.get('ContentType', 'unknown')
            
            logger.info(f"✅ SUCCESS: File found in S3")
            logger.info(f"   📊 Size: {file_size:,} bytes")
            logger.info(f"   📅 Modified: {last_modified}")
            logger.info(f"   📄 Type: {content_type}")
            
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            if error_code == '404':
                logger.warning(f"❌ File NOT FOUND in S3")
                logger.warning(f"   🔍 Bucket: {settings.AWS_STORAGE_BUCKET_NAME}")
                logger.warning(f"   🔍 Key: {s3_key}")
                logger.warning(f"   🔍 Error: {error_message}")
            else:
                logger.error(f"❌ S3 Error ({error_code}): {error_message}")
                logger.error(f"   🔍 Key: {s3_key}")
                
            return False
            
        except Exception as e:
            logger.error(f"❌ Unexpected S3 error: {e}")
            logger.error(f"   🔍 Key: {s3_key}")
            return False

    def debug_s3_bucket_contents(self, prefix: str):
        """Debug method to list S3 bucket contents"""
        try:
            logger.info(f"🔍 Listing S3 bucket contents with prefix: {prefix}")
            
            response = self.s3_client.list_objects_v2(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Prefix=prefix,
                MaxKeys=10
            )
            
            if 'Contents' in response:
                logger.info(f"📁 Found {len(response['Contents'])} objects:")
                for obj in response['Contents']:
                    logger.info(f"   📄 {obj['Key']} ({obj['Size']} bytes)")
            else:
                logger.warning(f"📁 No objects found with prefix: {prefix}")
                
        except Exception as e:
            logger.error(f"❌ Error listing S3 contents: {e}")

