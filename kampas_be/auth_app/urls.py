from django.urls import path
from .views import *
from .token_views import CustomTokenObtainPairView
from .views import UserProfileAPIView, LogoutAPIView, AdminUserCreateAPIView
from rest_framework_simplejwt.tokens import RefreshToken

urlpatterns = [
    path('register/', UserRegistrationAPIView.as_view(), name='user-register'),
    path('verify-email/', EmailVerificationAPIView.as_view(), name='email-verification'),
    path('login/', UserLoginAPIView.as_view(), name='user-login'),  # Use your custom login
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('profile/', UserProfileAPIView.as_view(), name='user-profile'),
    path('users/create-user/', AdminUserCreateAPIView.as_view(), name='admin-create-user'),
    path('users/', AdminUserCreateAPIView.as_view(), name='admin-get-users'),
    path('users/pend-for-approval/', PendingApprovalUsersAPIView.as_view(), name='pending-approvals'),
    path('users/approve/<str:user_id>/', ApproveUserAPIView.as_view(), name='approve-user'),
    path('users/reject/<str:user_id>/', RejectUserAPIView.as_view(), name='reject-user'),
    path('users/assign-role/<str:user_id>/', AssignRoleAPIView.as_view(), name='assign-role'),
    path('forgot-password/', ForgotPasswordAPIView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordAPIView.as_view(), name='reset-password'),
    path('users/update-user/<str:user_id>/', AdminUserCreateAPIView.as_view(), name='admin-update-user'),
    path('profile/change-password/', ChangePasswordAPIView.as_view(), name='change-password'),
]
