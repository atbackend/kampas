from django.urls import path
from .views import CompanyUpdateAPIView, ClientAdminAPIView

urlpatterns = [
    path('profile/', CompanyUpdateAPIView.as_view(), name='company-view'),
    path('clients/', ClientAdminAPIView.as_view(), name='client-list-create'),  # GET (list), POST
    path('clients/<str:id>/', ClientAdminAPIView.as_view(), name='client-detail-update'),  # GET (detail), PATCH
]
