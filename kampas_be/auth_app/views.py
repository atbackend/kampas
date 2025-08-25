from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login, logout, get_user_model
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.shortcuts import get_object_or_404
from .models import *
from .serializers import *
import uuid
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema

# -----------------------------------------------------------------------------
# Authentication and User Management API Views
# -----------------------------------------------------------------------------
# This section contains all API views related to user registration, email verification,
# login, logout, user profile management, admin user management, password reset,
# and password change functionalities for the authentication app.
# -----------------------------------------------------------------------------

User = get_user_model()

# - UserRegistrationAPIView: Handles user registration and sends verification email.

class UserRegistrationAPIView(APIView):
    permission_classes = []

    @swagger_auto_schema(request_body=UserRegistrationSerializer)
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            self.send_verification_email(user)
            return Response({'message': 'Registration successful. Please check your email to verify your account.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_verification_email(self, user):
        subject = 'Verify Your Email Address'
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={user.email_verification_token}"
        html_message = render_to_string('auth_app/email_verification.html', {'user': user, 'verification_url': verification_url})
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)

# - EmailVerificationAPIView: Verifies user email using a token.

class EmailVerificationAPIView(APIView):
    permission_classes = []
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            user = CustomUser.objects.get(email_verification_token=token)
            user.is_email_verified = True
            # If user is admin, auto-approve and activate
            if user.role == 'admin':
                user.is_approved = True
                user.is_active = True
                user.save()
                return Response({
                    'message': 'Email verified successfully. Your admin account is now active and approved.',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)
            user.save()
            return Response({
                'message': 'Email verified successfully. Your account is pending admin approval.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# - PendingApprovalUsersAPIView: Lists users pending admin approval (admin only).

class PendingApprovalUsersAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        pending_users = CustomUser.objects.filter(company=request.user.company, is_email_verified=True, is_approved=False)
        serializer = UserSerializer(pending_users, many=True)
        return Response(serializer.data)

# - ApproveUserAPIView: Admin approves a user and sends approval email.

class ApproveUserAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, user_id):
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(CustomUser, id=user_id, company=request.user.company)
        if not user.is_email_verified:
            return Response({'error': 'User must verify email first'}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_approved:
            return Response({'error': 'User already approved'}, status=status.HTTP_400_BAD_REQUEST)
        user.is_approved = True
        user.is_active = True
        user.save()
        self.send_approval_email(user)
        return Response({'message': f'User {user.email} approved successfully'}, status=status.HTTP_200_OK)
    def send_approval_email(self, user):
        subject = 'Your Account Has Been Approved'
        html_message = render_to_string('auth_app/account_approved.html', {'user': user})
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)

# - RejectUserAPIView: Admin rejects a user and sends rejection email.

class RejectUserAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, user_id):
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(CustomUser, id=user_id, company=request.user.company)
        if user.is_approved:
            return Response({'error': 'Cannot reject approved user'}, status=status.HTTP_400_BAD_REQUEST)
        self.send_rejection_email(user)
        user.delete()
        return Response({'message': f'User {user.email} rejected and deleted'}, status=status.HTTP_200_OK)
    def send_rejection_email(self, user):
        subject = 'Account Application Rejected'
        html_message = render_to_string('auth_app/account_rejected.html', {'user': user})
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)

# - AssignRoleAPIView: Admin assigns a role to a user.

class AssignRoleAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, user_id):
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(CustomUser, id=user_id, company=request.user.company)
        role = request.data.get('role')
        if role not in dict(CustomUser.ROLE_CHOICES):
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
        user.role = role
        user.save()
        return Response({'message': f'Role {role} assigned to user {user.email}'}, status=status.HTTP_200_OK)

# - UserLoginAPIView: Authenticates user and returns JWT tokens.

class UserLoginAPIView(APIView):
    permission_classes = []
    @swagger_auto_schema(request_body=UserLoginSerializer)
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = CustomUser.objects.filter(email=email).first()
        if not user or not user.check_password(password):
            return Response({'error': 'Invalid email or password'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_email_verified:
            return Response({'error': 'Please verify your email first'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_approved:
            return Response({'error': 'Your account is pending approval'}, status=status.HTTP_403_FORBIDDEN)
        if not user.is_active:
            return Response({'error': 'Your account is not active'}, status=status.HTTP_403_FORBIDDEN)
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login successful',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)

# - LogoutAPIView: Handles user logout and token blacklisting.

class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
                return Response({'message': 'Logout successfully'}, status=status.HTTP_200_OK)
            except Exception:
                return Response({'error': 'Invalid refresh token'}, status=status.HTTP_400_BAD_REQUEST)
        # If not using blacklist, just instruct client to delete token
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)

# - UserProfileAPIView: Allows users to view and update their profile.

class UserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(request_body=UserUpdateSerializer)
    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Profile updated successfully', 'user': UserSerializer(request.user).data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# - AdminUserCreateAPIView: Admin creates or updates users and sends account creation email.

class AdminUserCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin and not request.user.role == 'manager':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Filter users based on company for both admin and manager
        users = CustomUser.objects.filter(company=request.user.company)
            
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_admin:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        serializer = AdminUserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save(company=request.user.company, created_by=request.user, modified_by=request.user)
            self.send_account_created_email(user)
            return Response({'message': 'User created successfully', 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, user_id):
        if not request.user.registered_admin:
            return Response({'error': 'Permission denied. Only the registered admin can update admin roles.'}, status=status.HTTP_403_FORBIDDEN)
        user = get_object_or_404(CustomUser, id=user_id, company=request.user.company)
        # Prevent changes to the registered_admin
        if user.registered_admin:
            return Response({'error': 'Cannot modify the registered admin.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Handle primary_admin and is_admin logic
            if 'primary_admin' in request.data:
                user.primary_admin = request.data['primary_admin']
                if user.primary_admin:
                    user.is_admin = True  # primary_admin must always be admin
                elif not user.primary_admin:
                    # Optionally, allow demotion from primary_admin, but do not remove is_admin unless explicitly requested
                    if 'is_admin' in request.data and not request.data['is_admin']:
                        user.is_admin = False
            # Optionally handle is_admin separately, but never allow removing is_admin from registered_admin or primary_admin
            if 'is_admin' in request.data:
                if user.primary_admin or user.registered_admin:
                    user.is_admin = True  # Cannot remove is_admin from primary_admin or registered_admin
                else:
                    user.is_admin = request.data['is_admin']
            # Handle role logic
            if 'role' in request.data:
                if request.data['role'] not in dict(CustomUser.ROLE_CHOICES):
                    return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
                user.role = request.data['role']
            user.save()
            return Response({'message': 'User updated successfully', 'user': UserSerializer(user).data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_account_created_email(self, user):
        subject = 'Your Account Has Been Created'
        html_message = render_to_string('auth_app/account_created.html', {'user': user})
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)

# - ForgotPasswordAPIView: Sends password reset email to user.

class ForgotPasswordAPIView(APIView):
    permission_classes = []

    @swagger_auto_schema(request_body=PasswordResetRequestSerializer)
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            user = CustomUser.objects.filter(email=email).first()
            if not user:
                return Response({'error': 'No user found with this email'}, status=status.HTTP_400_BAD_REQUEST)
            reset_token = uuid.uuid4()
            user.password_reset_token = reset_token
            user.save()
            self.send_reset_email(user, reset_token)
            return Response({'message': 'Password reset email sent. Please check your inbox.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def send_reset_email(self, user, token):
        subject = 'Reset Your Password'
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        html_message = render_to_string('auth_app/password_reset_email.html', {'user': user, 'reset_url': reset_url})
        plain_message = strip_tags(html_message)
        send_mail(subject, plain_message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message, fail_silently=False)

# - ResetPasswordAPIView: Resets user password using a token.

class ResetPasswordAPIView(APIView):
    permission_classes = []

    @swagger_auto_schema(request_body=PasswordResetConfirmSerializer)
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data.get('token')
            new_password = serializer.validated_data.get('new_password')
            user = CustomUser.objects.filter(password_reset_token=token).first()
            if not user:
                return Response({'error': 'Invalid or expired reset token'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.password_reset_token = None
            user.save()
            return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# - ChangePasswordAPIView: Allows authenticated users to change their password.

class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(request_body=ChangePasswordSerializer)
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password']
            user = request.user
            if not user.check_password(old_password):
                return Response({'error': 'Old password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)