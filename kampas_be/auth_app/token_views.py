from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.response import Response
from rest_framework import status
from .serializers import UserSerializer
from rest_framework import serializers


# Custom JWT authentication views and serializers with additional user checks.
# - CustomTokenObtainPairSerializer: Extends the default JWT serializer to enforce email verification and approval.


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Call the parent validate method to get the token
        data = super().validate(attrs)
        
        # Get the user
        user = self.user
        
        # Check if user is email verified and approved
        if not user.is_email_verified:
            raise serializers.ValidationError("Please verify your email first")
        
        if not user.is_approved:
            raise serializers.ValidationError("Your account is pending approval")

        return data

# - CustomTokenObtainPairView: Uses the custom serializer for token obtain.

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# - CustomTokenRefreshView: Inherits default refresh behavior (can be extended for custom logic).

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        return response 