import random
import string
import logging
from django.db import models
from django.conf import settings
from project_api.geoserver_utils import get_geoserver_manager

logger = logging.getLogger(__name__)

def generate_unique_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=25))

class Company(models.Model):
    LICENCE_TYPE_CHOICES = [
        ('Individual', 'Individual'),
        ('Proffetional', 'Proffetional'),
        ('Enterprises', 'Enterprises'),
    ]
    id = models.CharField(max_length=25, primary_key=True, default=generate_unique_id, editable=False)
    company_name = models.CharField(max_length=200)
    website = models.URLField(blank=True, null=True)
    licence_type = models.CharField(max_length=20, choices=LICENCE_TYPE_CHOICES, default='Proffetional')
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    mobile_no = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True, null=True)
    primary_address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pin = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    primary_contact = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='created_companies', null=True, blank=True)
    modified_at = models.DateTimeField(auto_now=True)
    modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='modified_companies', null=True, blank=True)

    def __str__(self):
        return self.company_name
        
    def save(self, *args, **kwargs):
        # Check if this is a new company using the _state attribute
        is_new = self._state.adding
        
        logger.info(f"Saving company: {self.company_name}, is_new: {is_new}")
        
        # Call the parent save method to save the model instance
        super().save(*args, **kwargs)
        
        # If this is a new company, create GeoServer workspace and S3 folder
        if is_new:
            logger.info(f"Creating resources for new company: {self.id}")
            
            # Create GeoServer workspace
            try:
                logger.info("Attempting to create GeoServer workspace...")
                geoserver_manager = get_geoserver_manager()
                workspace_created = geoserver_manager.create_company_workspace(self.id)
                
                if workspace_created:
                    logger.info(f"Successfully created GeoServer workspace for company: {self.id}")
                else:
                    logger.error(f"Failed to create GeoServer workspace for company: {self.id}")
                    
            except ImportError as e:
                logger.error(f"Failed to import GeoServer utilities: {e}")
            except Exception as e:
                logger.error(f"Unexpected error creating GeoServer workspace: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Create S3 folder
            try:
                from kampas_be.storage_backends import create_company_folder
                logger.info("Attempting to create S3 company folder...")
                folder_created = create_company_folder(self.id)
                
                if folder_created:
                    logger.info(f"Successfully created S3 folder for company: {self.id}")
                else:
                    logger.error(f"Failed to create S3 folder for company: {self.id}")
                    
            except ImportError as e:
                logger.error(f"Failed to import S3 storage utilities: {e}")
            except Exception as e:
                logger.error(f"Unexpected error creating S3 folder: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")

    class Meta:
        verbose_name_plural = "Companies"


class Client(models.Model):
    CLIENT_TYPE_CHOICES = [
        ('Individual', 'Individual'),
        ('Business', 'Business'),
    ]
    id = models.CharField(max_length=25, primary_key=True, default=generate_unique_id, editable=False)
    owner_company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='owned_clients')
    client_company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='as_client')
    client_type = models.CharField(max_length=20, choices=CLIENT_TYPE_CHOICES, default='Individual')
    contact_person = models.CharField(max_length=100, blank=True)
    primary_contact_number = models.CharField(max_length=20, blank=True)
    secondary_contact_number = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pin = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='created_clients', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name='modified_clients', null=True, blank=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (
            ('owner_company', 'client_company'),
        )

    def __str__(self):
        return f"{self.owner_company.company_name} - {self.client_company.company_name}"


