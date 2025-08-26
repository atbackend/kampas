from django.contrib import admin

# Register your models here.
from kampas_be.company_api.models import Company, Client


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'licence_type', 'is_active', 'is_verified', 'created_at', 'created_by')
    search_fields = ('company_name', 'mobile_no', 'city', 'state', 'country')
    list_filter = ('licence_type', 'is_active', 'is_verified')


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('owner_company', 'client_company', 'client_type', 'is_active', 'created_at', 'created_by')
    search_fields = ('owner_company', 'client_company', 'email', 'city', 'state', 'country')
    list_filter = ('client_type', 'is_active', 'owner_company', 'client_company')
