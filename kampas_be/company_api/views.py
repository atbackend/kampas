from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Company, Client
from .serializers import CompanySerializer, ClientSerializer
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework.exceptions import PermissionDenied

# Create your views here.
# -----------------------------------------------------------------------------
# CompanyUpdateAPIView
# - Allows company admins to update their own company details.
# - Only authenticated users with admin privileges and an associated company can perform updates.
# - PATCH method: Partially updates the company instance with provided data.
# -----------------------------------------------------------------------------
class CompanyUpdateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        if not user.is_admin or not user.company:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        company = user.company
        serializer = CompanySerializer(company, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Company updated successfully', 'company': serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# -----------------------------------------------------------------------------
# ClientAdminAPIView
# - Allows company admins to manage (view, create, update) clients within their own company.
# - Only authenticated users with admin privileges and an associated company can access these endpoints.
# - GET method: Retrieve a specific client by ID or list all clients for the admin's company.
# - POST method: Create a new client for the admin's company.
# - PATCH method: Partially update an existing client belonging to the admin's company.
# -----------------------------------------------------------------------------
class ClientAdminAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id=None):
        user = request.user
        if not (user.is_admin or user.role == 'manager') or not user.company:
            return Response({'error': 'Only company admins and managers can view clients.'}, status=status.HTTP_403_FORBIDDEN)
        if id:
            client = get_object_or_404(Client, id=id, owner_company=user.company)
            serializer = ClientSerializer(client)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            clients = Client.objects.filter(owner_company=user.company)
            serializer = ClientSerializer(clients, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        if not user.is_admin or not user.company:
            return Response({'error': 'Only company admins can create clients.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ClientSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(owner_company=user.company, created_by=user, modified_by=user)
            return Response({'message': 'Client created successfully', 'client': serializer.data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id):
        user = request.user
        if not user.is_admin or not user.company:
            return Response({'error': 'Only company admins can update clients.'}, status=status.HTTP_403_FORBIDDEN)
        if not id:
            return Response({'error': 'Client ID is required for update.'}, status=status.HTTP_400_BAD_REQUEST)
        client = get_object_or_404(Client, id=id, owner_company=user.company)
        serializer = ClientSerializer(client, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save(modified_by=user)
            return Response({'message': 'Client updated successfully', 'client': serializer.data}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
