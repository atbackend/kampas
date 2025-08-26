from rest_framework import serializers
from .models import Company, Client
from kampas_be.auth_app.models import CustomUser

# -----------------------------------------------------------------------------
# CompanySerializer handles serialization and validation for the Company model.
# - Provides custom output for contact_person and email fields.
# - Sets created_by, modified_by, contact_person, and email from the request user if not provided.
# - Ensures audit fields are set automatically.
# -----------------------------------------------------------------------------
class CompanySerializer(serializers.ModelSerializer):
    # Custom output fields
    contact_person = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    modified_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Company
        fields = [
            'id', 'company_name', 'website', 'licence_type', 'contact_person', 'mobile_no', 'email',
            'primary_address', 'city', 'state', 'pin', 'country', 'primary_contact', 'is_active',
            'is_verified',
            'created_at', 'created_by', 'modified_at', 'modified_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'modified_at', 'modified_by']

    def get_contact_person(self, obj):
        if obj.contact_person:
            # Handle both CustomUser objects and string values
            if hasattr(obj.contact_person, 'first_name') and hasattr(obj.contact_person, 'last_name'):
                return f"{obj.contact_person.first_name} {obj.contact_person.last_name}".strip()
            return str(obj.contact_person).strip()
        return None

    def get_email(self, obj):
        if obj.email:
            # Handle both CustomUser objects and string values
            if hasattr(obj.email, 'email'):
                return obj.email.email
            return str(obj.email)
        return None

    def create(self, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        # Set defaults from user if not provided
        if user and user.is_authenticated:
            validated_data.setdefault('created_by', user)
            validated_data.setdefault('modified_by', user)
            validated_data.setdefault('contact_person', user)
            validated_data.setdefault('email', user)
            if not validated_data.get('mobile_no'):
                validated_data['mobile_no'] = user.phone if hasattr(user, 'phone') else ''
        
        # The company creation will automatically trigger:
        # 1. GeoServer workspace creation (handled in Company.save())
        # 2. S3 company folder creation (handled in Company.save())
        
        return super().create(validated_data)


    def update(self, instance, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        # Set modified_by
        if user and user.is_authenticated:
            validated_data['modified_by'] = user
            # If mobile_no is empty, set from user
            if not validated_data.get('mobile_no') and (not instance.mobile_no or instance.mobile_no == ''):
                validated_data['mobile_no'] = user.phone if hasattr(user, 'phone') else ''
            # If email is empty, set from user
            if not validated_data.get('email') and (not instance.email):
                validated_data['email'] = user
            # If contact_person is empty, set from user
            if not validated_data.get('contact_person') and (not instance.contact_person):
                validated_data['contact_person'] = user
        return super().update(instance, validated_data)

# -----------------------------------------------------------------------------
# ClientSerializer handles serialization and validation for the Client model.
# - Only company admins can create clients.
# - The company field is always set to the admin's own company on create.
# - created_by and modified_by are set automatically from the request user.
# - Email uniqueness is enforced per company.
# -----------------------------------------------------------------------------
class ClientSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    modified_by = serializers.PrimaryKeyRelatedField(read_only=True)
    client_company_name = serializers.SerializerMethodField()
    client_company = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'owner_company', 'client_company', 'client_company_name', 'client_type', 'contact_person',
            'primary_contact_number', 'secondary_contact_number', 'email', 'address',
            'city', 'state', 'pin', 'country', 'is_active',
            'created_by', 'created_at', 'modified_by', 'modified_at'
        ]
        read_only_fields = ['id', 'owner_company', 'client_company', 'created_by', 'created_at', 'modified_by', 'modified_at']

    def get_client_company_name(self, obj):
        if obj.client_company:
            return obj.client_company.company_name
        return None

    def create(self, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        if not user or not user.is_authenticated or not user.is_admin:
            raise serializers.ValidationError('Only company admins can create clients.')

        client_company_name = self.initial_data.get('client_company_name')

        # Set owner_company to the admin's company
        owner_company_obj = user.company
        if not owner_company_obj:
            raise serializers.ValidationError("Authenticated user must be associated with a company to create clients.")

        client_company_obj = None

        if client_company_name:
            try:
                client_company_obj = Company.objects.get(company_name=client_company_name)
            except Company.DoesNotExist:
                client_company_obj = Company.objects.create(
                    company_name=client_company_name,
                    created_by=user,
                    modified_by=user,
                    contact_person=validated_data.get('contact_person'),
                    email=validated_data.get('email'),
                    primary_contact=validated_data.get('contact_person', '') or '',
                    mobile_no=validated_data.get('primary_contact_number', '') or validated_data.get('secondary_contact_number', ''),
                    primary_address=validated_data.get('address', ''),
                    city=validated_data.get('city', ''),
                    state=validated_data.get('state', ''),
                    pin=validated_data.get('pin', ''),
                    country=validated_data.get('country', '')
                )

        # Check for unique_together constraint
        if Client.objects.filter(owner_company=owner_company_obj, client_company=client_company_obj).exists():
            raise serializers.ValidationError("A client relationship with this owner and client company already exists.")

        validated_data['owner_company'] = owner_company_obj
        validated_data['client_company'] = client_company_obj
        validated_data['created_by'] = user
        validated_data['modified_by'] = user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        if user and user.is_authenticated:
            validated_data['modified_by'] = user

        client_company_name = self.initial_data.get('client_company_name', None)

        owner_company_obj = instance.owner_company # Owner company cannot be changed on update
        client_company_obj = instance.client_company

        if client_company_name:
            try:
                client_company_obj = Company.objects.get(company_name=client_company_name)
            except Company.DoesNotExist:
                client_company_obj = Company.objects.create(
                    company_name=client_company_name,
                    created_by=user,
                    modified_by=user,
                    contact_person=validated_data.get('contact_person'),
                    email=validated_data.get('email'),
                    primary_contact=validated_data.get('contact_person', '') or '',
                    mobile_no=validated_data.get('primary_contact_number', '') or validated_data.get('secondary_contact_number', ''),
                    primary_address=validated_data.get('address', ''),
                    city=validated_data.get('city', ''),
                    state=validated_data.get('state', ''),
                    pin=validated_data.get('pin', ''),
                    country=validated_data.get('country', '')
                )

        # Check for unique_together constraint on update
        if Client.objects.filter(owner_company=owner_company_obj, client_company=client_company_obj).exclude(pk=instance.pk).exists():
            raise serializers.ValidationError("A client relationship with this owner and client company already exists.")

        validated_data['owner_company'] = owner_company_obj
        validated_data['client_company'] = client_company_obj

        return super().update(instance, validated_data)
