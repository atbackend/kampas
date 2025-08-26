"""
URL configuration for kampas_be project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from kampas_be.auth_app.token_views import CustomTokenObtainPairView, CustomTokenRefreshView
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from kampas_be.project_api.views import TaskStatusAPIView, UploadTaskStatusAPIView




swagger_schema_view = get_schema_view(
    openapi.Info(
        title="Kampas API",
        default_version='v1',
        description="API documentation for Kampas Backend",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="backend.dev@ansimap.com"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    authentication_classes=[],  # disables BasicAuth in Swagger UI
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('kampas_be.auth_app.urls')),
    path('api/company/', include('kampas_be.company_api.urls')),
    path('api/projects/', include('kampas_be.project_api.urls')),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('swagger/', swagger_schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', swagger_schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('tasks/<str:task_id>/status/', TaskStatusAPIView.as_view(), name='task-status'),
    path('upload-tasks/<str:task_id>/status/', UploadTaskStatusAPIView.as_view(), name='upload-task-status'),
]
