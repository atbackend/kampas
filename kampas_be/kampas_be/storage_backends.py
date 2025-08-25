from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging

logger = logging.getLogger(__name__)

class StaticStorage(S3Boto3Storage):
    location = getattr(settings, 'STATIC_LOCATION', 'static')
    default_acl = 'public-read'

class MediaStorage(S3Boto3Storage):
    location = getattr(settings, 'MEDIA_LOCATION', 'media')
    default_acl = 'private'
    file_overwrite = False

class ProjectDataStorage(S3Boto3Storage):
    location = getattr(settings, 'PROJECT_DATA_LOCATION', 'project_data')
    default_acl = 'private'
    file_overwrite = False

def create_company_folder(company_id):
    """
    Create a folder structure in S3 for a new company.
    
    Args:
        company_id (str): The ID of the company to create a folder for.
        
    Returns:
        bool: True if the folder was successfully created, False otherwise.
    """
    logger.info(f"Starting S3 folder creation for company: {company_id}")
    
    # Check if S3 is enabled
    use_s3 = getattr(settings, 'USE_S3', False)
    logger.info(f"USE_S3 setting: {use_s3}")
    
    if not use_s3:
        logger.info(f"S3 not enabled, skipping folder creation for company {company_id}")
        return True
    
    # Check if all required settings are present
    required_settings = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_STORAGE_BUCKET_NAME'
    ]
    
    for setting in required_settings:
        if not hasattr(settings, setting) or not getattr(settings, setting):
            logger.error(f"Missing required setting: {setting}")
            return False
    
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        logger.info("S3 client initialized successfully")
        
        # Verify bucket exists and is accessible
        try:
            s3_client.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
            logger.info(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} is accessible")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.error(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} does not exist")
            elif error_code == '403':
                logger.error(f"Access denied to bucket {settings.AWS_STORAGE_BUCKET_NAME}")
            else:
                logger.error(f"Error accessing bucket {settings.AWS_STORAGE_BUCKET_NAME}: {e}")
            return False
        
        # Create company folder
        company_folder_key = f"{company_id}/"
        
        logger.info(f"Creating company folder with key: {company_folder_key}")
        
        s3_client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=company_folder_key,
            Body='',
            ContentType='application/x-directory'
        )
        logger.info(f"Successfully created company folder: {company_folder_key}")
        
        return True
        
    except NoCredentialsError:
        logger.error("AWS credentials not found or invalid")
        return False
    except ClientError as e:
        logger.error(f"AWS ClientError while creating folder for company {company_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error creating folder for company {company_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def create_project_folder(project_id, company_id):
    """
    Create a folder structure in S3 for a new project under the company folder with required subfolders:
    - vector_layers
    - raster_layers
    - terrain_models
    - street_imagery
    - point_clouds
    
    Args:
        project_id (str): The ID of the project to create folders for.
        company_id (str): The ID of the company that owns the project.
        
    Returns:
        bool: True if the folder structure was successfully created, False otherwise.
    """
    logger.info(f"Starting S3 folder creation for project: {project_id} under company: {company_id}")
    
    # Check if S3 is enabled
    use_s3 = getattr(settings, 'USE_S3', False)
    logger.info(f"USE_S3 setting: {use_s3}")
    
    if not use_s3:
        logger.info(f"S3 not enabled, skipping folder creation for project {project_id}")
        return True
    
    # Check if all required settings are present
    required_settings = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY', 
        'AWS_STORAGE_BUCKET_NAME'
    ]
    
    for setting in required_settings:
        if not hasattr(settings, setting) or not getattr(settings, setting):
            logger.error(f"Missing required setting: {setting}")
            return False
    
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        logger.info("S3 client initialized successfully")
        
        # Verify bucket exists and is accessible
        try:
            s3_client.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
            logger.info(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} is accessible")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.error(f"Bucket {settings.AWS_STORAGE_BUCKET_NAME} does not exist")
            elif error_code == '403':
                logger.error(f"Access denied to bucket {settings.AWS_STORAGE_BUCKET_NAME}")
            else:
                logger.error(f"Error accessing bucket {settings.AWS_STORAGE_BUCKET_NAME}: {e}")
            return False
        
        # Create project folder under company folder
        # Structure: {company_id}/{project_id}/
        project_base_path = f"{company_id}/{project_id}"
        main_folder_key = f"{project_base_path}/"
        
        logger.info(f"Creating main project folder with key: {main_folder_key}")
        
        s3_client.put_object(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=main_folder_key,
            Body='',
            ContentType='application/x-directory'
        )
        logger.info(f"Successfully created main project folder: {main_folder_key}")
        
        # Define required subfolders
        subfolders = [
            'vector_layers',    # For vector data (shapefiles, geojson, etc.)
            'raster_layers',    # For raster data (tiff, png, etc.)
            'terrain_models',   # For terrain models (DEM, DSM, etc.)
            'street_imagery',   # For street imagery (photos, 360 images, etc.)
            'point_clouds'      # For point cloud data (las, ply, etc.)
        ]
        
        # Create each subfolder
        created_folders = []
        for subfolder in subfolders:
            subfolder_key = f"{project_base_path}/{subfolder}/"
            
            logger.info(f"Creating subfolder with key: {subfolder_key}")
            
            s3_client.put_object(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Key=subfolder_key,
                Body='',
                ContentType='application/x-directory'
            )
            created_folders.append(subfolder)
            logger.info(f"Successfully created subfolder: {subfolder_key}")
        
        logger.info(f"Successfully created complete folder structure for project {project_id}: {created_folders}")
        
        # Verify the folders were created by listing them
        try:
            response = s3_client.list_objects_v2(
                Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                Prefix=f"{project_base_path}/",
                Delimiter='/'
            )
            
            if 'CommonPrefixes' in response:
                verified_folders = [prefix['Prefix'] for prefix in response['CommonPrefixes']]
                logger.info(f"Verification: Found created folders: {verified_folders}")
            else:
                logger.warning("Verification: No folders found after creation")
                
        except Exception as e:
            logger.error(f"Error during folder verification: {e}")
        
        return True
        
    except NoCredentialsError:
        logger.error("AWS credentials not found or invalid")
        return False
    except ClientError as e:
        logger.error(f"AWS ClientError while creating folder structure for project {project_id}: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error creating folder structure for project {project_id}: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False




def check_company_folder_exists(company_id):
    """
    Check if a company folder exists in S3.
    
    Args:
        company_id (str): The ID of the company to check.
        
    Returns:
        bool: True if the folder exists, False otherwise.
    """
    if not getattr(settings, 'USE_S3', False):
        return True  # Consider local storage as always existing
    
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        
        # Check if the folder exists
        company_folder_key = f"{company_id}/"
        
        response = s3_client.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Prefix=company_folder_key,
            MaxKeys=1
        )
        
        return 'Contents' in response
        
    except Exception as e:
        logger.error(f"Error checking company folder: {e}")
        return False



def check_project_folder_exists(project_id, company_id):
    """
    Check if a project folder exists in S3.
    
    Args:
        project_id (str): The ID of the project to check.
        company_id (str): The ID of the company.
        
    Returns:
        bool: True if the folder exists, False otherwise.
    """
    if not getattr(settings, 'USE_S3', False):
        return True  # Consider local storage as always existing
    
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        
        # Check if the project folder exists
        project_folder_key = f"{company_id}/{project_id}/"
        
        response = s3_client.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Prefix=project_folder_key,
            MaxKeys=1
        )
        
        return 'Contents' in response
        
    except Exception as e:
        logger.error(f"Error checking project folder: {e}")
        return False



    
def upload_layer_to_s3(file_obj, company_id, project_id, layer_type, filename):
    """
    Upload a layer file to the appropriate S3 folder based on company, project, and layer type.

    Args:
        file_obj: The file object to upload
        company_id (str): The ID of the company
        project_id (str): The ID of the project
        layer_type (str): The type of layer (vector_layers, raster_layers, etc.)
        filename (str): The name of the file
        
    Returns:
        tuple: (bool, str) - Success status and S3 key or error message
    """
    logger.info(f"Starting layer upload to S3: {filename} for project {project_id}")

    # Check if S3 is enabled
    use_s3 = getattr(settings, 'USE_S3', False)

    if not use_s3:
        logger.info(f"S3 not enabled, skipping upload for {filename}")
        return True, "S3 not enabled"

    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        
        # Construct the S3 key
        s3_key = f"{company_id}/{project_id}/{layer_type}/{filename}"
        
        logger.info(f"Uploading file to S3 key: {s3_key}")
        
        # Upload the file
        s3_client.upload_fileobj(
            file_obj,
            settings.AWS_STORAGE_BUCKET_NAME,
            s3_key,
            ExtraArgs={
                'ContentType': 'application/octet-stream'
            }
        )
        
        logger.info(f"Successfully uploaded {filename} to S3")
        return True, s3_key
        
    except NoCredentialsError:
        logger.error("AWS credentials not found or invalid")
        return False, "Invalid AWS credentials"
    except ClientError as e:
        logger.error(f"AWS ClientError while uploading {filename}: {e}")
        return False, str(e)
    except Exception as e:
        logger.error(f"Unexpected error uploading {filename}: {e}")
        return False, str(e)

# def delete_project_data(project_id, waiting_period_days=7):
#     """
#     Mark project data for deletion after waiting period
#     In a real implementation, you would use S3 lifecycle policies or a scheduled task
#     """
#     if not getattr(settings, 'USE_S3', False):
#         return True
    
#     try:
#         logger.info(f"Project {project_id} data marked for deletion after {waiting_period_days} days")
#         return True
#     except Exception as e:
#         logger.error(f"Error marking project {project_id} data for deletion: {e}")
#         return False

def list_project_files(project_id, folder_type=None):
    """
    List files in a project's S3 folder, optionally filtered by folder type
    
    Args:
        project_id: The project ID
        folder_type: Optional filter for specific folder type 
                    (vector_layers, raster_layers, terrain_models, street_imagery, point_clouds)
    """
    if not getattr(settings, 'USE_S3', False):
        return []
    
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1')
        )
        
        # Base prefix for the project
        base_prefix = f"{settings.PROJECT_DATA_LOCATION}/{project_id}/"
        
        # If folder_type is specified, filter by that folder
        prefix = base_prefix
        if folder_type:
            valid_folder_types = ['vector_layers', 'raster_layers', 'terrain_models', 'street_imagery', 'point_clouds']
            if folder_type in valid_folder_types:
                prefix = f"{base_prefix}{folder_type}/"
        
        response = s3_client.list_objects_v2(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Prefix=prefix
        )
        
        # Organize files by folder type
        files_by_folder = {}
        files = []
        
        if 'Contents' in response:
            for obj in response['Contents']:
                # Skip folder objects (keys ending with '/')
                if obj['Key'].endswith('/'):
                    continue
                
                # Extract folder type from the key
                key_parts = obj['Key'].replace(base_prefix, '').split('/')
                if len(key_parts) >= 2:
                    current_folder = key_parts[0]
                    file_name = key_parts[-1]
                    
                    file_info = {
                        'key': obj['Key'],
                        'name': file_name,
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'],
                        'url': f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{obj['Key']}"
                    }
                    
                    # Add to the appropriate folder list
                    if current_folder not in files_by_folder:
                        files_by_folder[current_folder] = []
                    
                    files_by_folder[current_folder].append(file_info)
                    files.append(file_info)
        
        # If folder_type is specified, return just those files
        if folder_type:
            return files
        
        # Otherwise return organized structure
        return {
            'all_files': files,
            'by_folder': files_by_folder
        }
    except ClientError as e:
        logger.error(f"Error listing files for project {project_id}: {e}")
        return []

def mark_file_for_deletion(project_id, file_key, waiting_period_days=7):
    """
    Mark a specific file for deletion after a waiting period (soft delete).
    In a real implementation, use S3 object tagging or a scheduled task.
    """
    if not getattr(settings, 'USE_S3', False):
        return True
    try:
        logger.info(f"File {file_key} in project {project_id} marked for deletion after {waiting_period_days} days")
        return True
    except Exception as e:
        logger.error(f"Error marking file {file_key} for deletion: {e}")
        return False

# def mark_folder_for_deletion(project_id, folder_key, waiting_period_days=7):
#     """
#     Mark a specific folder for deletion after a waiting period (soft delete).
#     In a real implementation, use S3 object tagging or a scheduled task.
#     """
#     if not getattr(settings, 'USE_S3', False):
#         return True
#     try:
#         logger.info(f"Folder {folder_key} in project {project_id} marked for deletion after {waiting_period_days} days")
#         return True
#     except Exception as e:
#         logger.error(f"Error marking folder {folder_key} for deletion: {e}")
#         return False
