from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = (
        'email', 'first_name', 'last_name', 'role', 'company', 'is_admin', 'is_active', 
        'is_email_verified', 'is_approved', 'registered_admin', 'primary_admin', 'created_by', 'modified_by'
    )
    list_filter = ('role', 'company', 'is_admin', 'is_active', 'is_email_verified')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('is_active', 'is_admin', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'is_email_verified', 'is_approved', 'registered_admin', 'primary_admin')}),
        ('Company info', {'fields': ('company', 'role')}),
        ('Audit info', {'fields': ('created_by', 'modified_by')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'phone', 'company', 'role', 'is_admin', 'is_active'),
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)