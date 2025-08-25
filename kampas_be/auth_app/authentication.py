from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from django.conf import settings
from datetime import datetime

try:
    import PyJWT as jwt
except ImportError:
    import jwt

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        # Get the token from the Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
        
        # Check if the header starts with 'Bearer '
        if not auth_header.startswith('Bearer '):
            return None
        
        # Extract the token
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the JWT token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            # Check if token is expired
            exp = payload.get('exp')
            if exp and datetime.utcnow().timestamp() > exp:
                raise AuthenticationFailed('Token has expired')
            
            # Get the user
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token')
            
            user = User.objects.get(id=user_id)
            
            # Check if user is active and approved
            if not user.is_active:
                raise AuthenticationFailed('User account is disabled')
            
            if not user.is_approved:
                raise AuthenticationFailed('User account is pending approval')
            
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')
        except Exception as e:
            raise AuthenticationFailed('Authentication failed')
    
    def authenticate_header(self, request):
        return 'Bearer realm="api"' 