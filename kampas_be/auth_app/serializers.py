from rest_framework import serializers
from .models import *
from django.conf import settings
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
import re

# -----------------------------------------------------------------------------
# Utility constants and functions for registration validation
# -----------------------------------------------------------------------------

# List of generic email domains not allowed for company registration
GENERIC_DOMAINS = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'
]

def extract_domain(email):
    """
    Extracts the domain part from an email address.
    """
    return email.split('@')[-1].lower()

def is_generic_domain(domain):
    """
    Checks if the given domain is a generic email provider.
    """
    return domain in GENERIC_DOMAINS

def normalize_company_name(name):
    """
    Normalizes the company name by removing non-alphanumeric characters and lowercasing.
    """
    # Remove non-alphanumeric, lowercase, and collapse spaces
    return re.sub(r'[^a-z0-9]', '', name.lower())

# -----------------------------------------------------------------------------
# CompanySerializer: Basic serializer for Company model (minimal fields)
# -----------------------------------------------------------------------------
class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'company_name', 'licence_type', 'created_at']

# -----------------------------------------------------------------------------
# UserRegistrationSerializer: Handles user registration and company creation
# - Validates password match, email uniqueness, and company domain logic
# - Notifies existing admin if duplicate registration is attempted
# -----------------------------------------------------------------------------
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False)
    company_name = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'email', 'password', 'confirm_password', 'company_name']

    def validate(self, attrs):
        # Validate password
        password = attrs.get('password')
        if not password:
            raise serializers.ValidationError("Password is required")
            
        # Check password complexity
        if len(password) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError("Password must contain at least one number")
        if not any(char.isupper() for char in password):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        if not any(char.islower() for char in password):
            raise serializers.ValidationError("Password must contain at least one lowercase letter")
        if not any(char in "!@#$%^&*(),.?\":{}|<>" for char in password):
            raise serializers.ValidationError("Password must contain at least one special character")

        # Ensure password and confirm_password match
        if 'confirm_password' in attrs and attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")

        # Validate email
        email = attrs.get('email')
        if not email:
            raise serializers.ValidationError("Email is required")

        # Check email format
        email_regex = r'^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
        if not re.match(email_regex, email):
            raise serializers.ValidationError("Invalid email format")

        # Ensure email is unique
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email already registered")

        company_name = attrs['company_name']
        domain = extract_domain(email)

        # Disallow generic email domains
        if is_generic_domain(domain):
            raise serializers.ValidationError("Please use your organization email address, not a generic provider.")

        normalized_company_name = normalize_company_name(company_name)
        from django.db import models as dj_models

        # Check for existing company by name or domain
        existing_company = Company.objects.filter(
            dj_models.Q(company_name__iexact=company_name) | 
            dj_models.Q(company_name__icontains=domain) | 
            dj_models.Q(company_name__icontains=normalized_company_name)
        ).first()

        if existing_company:
            # If company exists and has users, notify admin and block registration
            if CustomUser.objects.filter(company=existing_company).exists():
                admin_user = CustomUser.objects.filter(company=existing_company, is_admin=True).first()
                if admin_user:
                    self.send_admin_notification(admin_user, email)
                raise serializers.ValidationError("Your organisation is already registered. Please contact the administrator.")

        # Ensure company name and email domain match (allowing for partial matches)
        # For example, 'Ansimap Private Limited' and 'ansimap.com'
        if normalized_company_name not in domain and domain.split('.')[0] not in normalized_company_name:
            raise serializers.ValidationError("Company name and email domain do not appear to match. Please use your organization email and company name.")

        return attrs

    def create(self, validated_data):
        """
        Creates a new user and company if needed.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['modified_by'] = request.user
        company_name = validated_data.pop('company_name')
        # Set sensible defaults for missing fields
        licence_type = 'Proffetional'
        role = 'admin'
        phone = ''
        validated_data.pop('confirm_password', None)
        domain = extract_domain(validated_data['email'])
        # Create or get the company
        company, created = Company.objects.get_or_create(
            company_name=company_name,
            defaults={
                'licence_type': licence_type,
                'email': validated_data['email'],
                'contact_person': f"{validated_data['first_name']} {validated_data['last_name']}"
            }
        )
        # Create the user as admin
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            company=company,
            role=role,
            phone=phone,
            is_active=False
        )
        user.is_admin = True
        if created:
            user.registered_admin = True
        user.save()
        return user

    def send_admin_notification(self, admin_user, attempted_email):
        """
        Sends an email notification to the existing company admin about a duplicate registration attempt.
        """
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags
        subject = "Attempted Registration with Your Organization Domain"
        html_message = render_to_string('auth_app/duplicate_registration_attempt.html', {
            'admin_user': admin_user,
            'attempted_email': attempted_email,
        })
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [admin_user.email], html_message=html_message, fail_silently=False)

# -----------------------------------------------------------------------------
# UserLoginSerializer: Handles user authentication and login validation
# -----------------------------------------------------------------------------
class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password")
            
            if not user.is_email_verified:
                raise serializers.ValidationError("Please verify your email first")
            
            if not user.is_approved:
                raise serializers.ValidationError("Your account is pending approval")
            
            attrs['user'] = user
        else:
            raise serializers.ValidationError("Must include email and password")
        
        return attrs

# -----------------------------------------------------------------------------
# UserSerializer: Serializes user details, including company and audit fields
# -----------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    company = CompanySerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    modified_by = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 
                 'company', 'role', 'phone', 'is_admin', 'is_active', 'is_email_verified', 'is_approved',
                 'registered_admin', 'primary_admin', 'created_at', 'created_by', 'modified_at', 'modified_by']
        read_only_fields = ['id', 'is_admin', 'is_active', 'is_email_verified', 'is_approved', 'registered_admin', 'primary_admin', 'created_at', 'created_by', 'modified_at', 'modified_by']
    
    def get_full_name(self, obj):
        """
        Returns the user's full name.
        """
        return f"{obj.first_name} {obj.last_name}"

# -----------------------------------------------------------------------------
# EmailVerificationSerializer: Validates email verification tokens
# -----------------------------------------------------------------------------
class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    
    def validate_token(self, value):
        try:
            user = CustomUser.objects.get(email_verification_token=value)
            if user.is_email_verified:
                raise serializers.ValidationError("Email already verified")
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("Invalid verification token")
        
        return value

# -----------------------------------------------------------------------------
# AdminUserCreateSerializer: Allows creation of admin users for a company
# -----------------------------------------------------------------------------
class AdminUserCreateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    primary_admin = serializers.BooleanField(default=False)
    
    class Meta:
        model = CustomUser
        fields = [
            'first_name', 'last_name', 'email', 'password', 'role', 'phone',
            'primary_admin'
        ]
        extra_kwargs = {'password': {'write_only': True, 'min_length': 8}}
        
    def validate(self, attrs):
        email = attrs.get('email')
        
        # Ensure email is unique
        if CustomUser.objects.filter(email=email).exists():
            raise serializers.ValidationError("Email already registered")
            
        # Check if email domain is generic
        domain = extract_domain(email)
        if is_generic_domain(domain):
            raise serializers.ValidationError("Please use your organization email address, not a generic provider.")
            
        return attrs
    def create(self, validated_data):
        """
        Creates a new admin user for the specified company.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
            validated_data['modified_by'] = request.user
        
        company = validated_data.pop('company') # Get company from validated_data
        is_primary = validated_data.get('primary_admin', False)

        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            company=company,
            role=validated_data['role'],
            phone=validated_data.get('phone', ''),
            primary_admin=is_primary,
            is_admin=is_primary,
            is_email_verified=True,
            is_approved=True,
            is_active=True,
            created_by=validated_data.get('created_by'),
            modified_by=validated_data.get('modified_by')
        )
        return user

# -----------------------------------------------------------------------------
# UserUpdateSerializer: Allows updating user profile fields
# -----------------------------------------------------------------------------
class UserUpdateSerializer(serializers.ModelSerializer):
    primary_admin = serializers.BooleanField(required=False)
    is_active = serializers.BooleanField(required=False)
    
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'phone', 'primary_admin', 'role', 'is_active']
        
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['modified_by'] = request.user
        return super().update(instance, validated_data)

# -----------------------------------------------------------------------------
# PasswordResetRequestSerializer: Handles password reset email requests
# -----------------------------------------------------------------------------
class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    
    def validate_email(self, value):
        if not CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError(_('No user found with this email'))
        return value

# -----------------------------------------------------------------------------
# PasswordResetConfirmSerializer: Handles password reset confirmation and validation
# -----------------------------------------------------------------------------
class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError(_('Passwords do not match'))
        return attrs

# -----------------------------------------------------------------------------
# ChangePasswordSerializer: Handles password change for authenticated users
# -----------------------------------------------------------------------------
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField()

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords do not match")
        return attrs