import random
import string
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from company_api.models import Company

def generate_unique_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=25))


class CustomUserManager(BaseUserManager):
    use_in_migrations = True
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        
        created_by = extra_fields.pop('created_by', None)
        modified_by = extra_fields.pop('modified_by', None)

        if created_by:
            user.created_by = created_by
        if modified_by:
            user.modified_by = modified_by

        user.save(using=self._db)
        return user
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_active', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    id = models.CharField(max_length=25, primary_key=True, default=generate_unique_id, editable=False)
    email = models.EmailField(unique=True, blank=False)
    first_name = models.CharField(max_length=30, blank=False)
    last_name = models.CharField(max_length=30, blank=False)
    phone = models.CharField(max_length=15, blank=True)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='users', null=True, blank=True)
    registered_admin = models.BooleanField(default=False, help_text="Is this user the registered admin for the company?")
    primary_admin = models.BooleanField(default=False, help_text="Is this user the primary admin for the company?")
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('user', 'User'),
        ('guest', 'Guest')
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='user')
    is_email_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(default=uuid.uuid4, editable=False)
    password_reset_token = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, related_name='created_users', null=True, blank=True)
    modified_by = models.ForeignKey('self', on_delete=models.SET_NULL, related_name='modified_users', null=True, blank=True)
    username = None
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ["first_name", "last_name"]
    objects = CustomUserManager()
    def __str__(self):
        return f"{self.email} - {self.role}"
