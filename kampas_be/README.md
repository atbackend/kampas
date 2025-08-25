# Kampas Backend API

This document outlines the recent changes made to the Kampas Backend API, focusing on AWS S3 integration for project data management, and provides instructions for setting up and testing the API.

## Recent Changes

### 1. AWS S3 Integration for Project Data

AWS S3 has been integrated to handle project-specific data storage. This includes:

-   **`boto3` and `django-storages`**: These packages have been added to `requirements.txt` for S3 connectivity.
-   **`kampas_be/settings.py`**: Updated with AWS S3 configuration (access keys, bucket name, region) and custom storage backend definitions (`STATIC_LOCATION`, `MEDIA_LOCATION`, `PROJECT_DATA_LOCATION`).
-   **`kampas_be/storage_backends.py`**: New custom storage classes (`StaticStorage`, `MediaStorage`, `ProjectDataStorage`) and utility functions (`create_project_folder`, `delete_project_data`, `list_project_files`) for S3 operations.
-   **`project_api/models.py`**: The `Project` model now includes a `project_data` field, utilizing `ProjectDataStorage` for file storage. The `save` method of the `Project` model has been overridden to automatically create an S3 folder for new projects.
-   **`project_api/serializers.py`**: The `ProjectSerializer` now includes the `project_data` field, marked as read-only.
-   **`project_api/s3_views.py`**: New API views (`ProjectDataAPIView`, `ProjectDataDeleteAPIView`) have been created to handle S3 file operations (upload, list, delete) with appropriate permission checks and a 7-day deletion policy.
-   **`project_api/urls.py`**: New URL patterns have been added to expose the S3 data management endpoints.
-   **`.env.example`**: Updated to include necessary AWS S3 environment variables.
-   **`AWS_S3_SETUP.md`**: A comprehensive guide for setting up AWS S3 for this project.

### 2. Project Model Enhancements

-   **`unit` and `quantity` fields**: Added to the `Project` model in `project_api/models.py` to store unit type (e.g., km, sqkm, count) and the corresponding quantity.
-   **`ProjectSerializer`**: Updated to include the new `unit` and `quantity` fields.

### 3. Company Model Adjustment

-   **`contact_person` field**: Changed from a `ForeignKey` to `settings.AUTH_USER_MODEL` to a `CharField` in `company_api/models.py` to directly store the registered user's full name.

## Setup and Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd kampas_be
    ```

2.  **Set up a virtual environment** (recommended):
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # On Windows
    source venv/bin/activate # On macOS/Linux
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables**:
    Create a `.env` file in the `kampas_be` directory based on `.env.example`. Ensure you fill in all required variables, especially for database and AWS S3.

    Refer to `AWS_S3_SETUP.md` for detailed instructions on setting up your AWS S3 bucket and obtaining the necessary credentials.

5.  **Run Database Migrations**:
    ```bash
    python manage.py makemigrations
    python manage.py migrate
    ```

6.  **Create a Superuser** (for admin access):
    ```bash
    python manage.py createsuperuser
    ```

7.  **Run the Development Server**:
    ```bash
    python manage.py runserver
    ```

    The API will be accessible at `http://127.0.0.1:8000/` (or your configured host/port).

## API Testing

Use a tool like Postman, Insomnia, or `curl` to test the API endpoints.

### Authentication

First, obtain an authentication token by registering a user or logging in:

-   **Register User**: `POST /api/auth/register/`
-   **Login**: `POST /api/auth/login/`

Include the `Authorization: Bearer <your_token>` header in all subsequent requests.

### Project Management Endpoints

-   **Create Project**: `POST /api/projects/admin/`
    -   **Body**: JSON object with project details (e.g., `project_name`, `client`, `company`, `description`, `quantity`, `unit`, etc.).
    -   **Example Body**:
        ```json
        {
            "project_name": "New S3 Project",
            "client": "<client_id>",
            "description": "This is a test project for S3 integration.",
            "quantity": 100,
            "unit": "Count"
        }
        ```

-   **List Projects**: `GET /api/projects/admin/`

-   **Retrieve Project**: `GET /api/projects/admin/<project_id>/`

-   **Update Project**: `PATCH /api/projects/admin/<project_id>/`
    -   **Body**: JSON object with fields to update.

### S3 Project Data Endpoints

These endpoints are used for managing files associated with projects in S3. Each project has a standardized folder structure with specific subfolders for different types of geospatial data.

#### Project Folder Structure

When a new project is created, the following folder structure is automatically created in S3:

```
project_data/
└── {project_id}/
    ├── vector_layers/
    ├── raster_layers/
    ├── street_imagery/
    ├── terrain_models/
    └── point_clouds/
```

Each subfolder is designed for specific types of geospatial data that can be visualized and analyzed directly on S3 files at GeoServer.

#### API Endpoints

-   **List All Project Files**: `GET /api/projects/<project_id>/data/`
    -   Returns all files in all folders for the specified project.

-   **List Files in a Specific Folder**: `GET /api/projects/<project_id>/data/?folder_type=<folder_type>`
    -   Where `<folder_type>` is one of: `vector_layers`, `raster_layers`, `terrain_models`, `street_imagery`, `point_clouds`

-   **Upload Project File**: `POST /api/projects/<project_id>/data/`
    -   **Body**: `form-data` with:
        -   `file`: The file to upload
        -   `folder_type`: The folder to upload to (one of: `vector_layers`, `raster_layers`, `terrain_models`, `street_imagery`, `point_clouds`)

-   **Delete Specific Project File**: `DELETE /api/projects/<project_id>/data/delete/<file_key>/`
    -   Deletes a specific file identified by its S3 key.

-   **Delete All Files in a Folder**: `DELETE /api/projects/<project_id>/data/delete/`
    -   **Body**: JSON object with folder to clear
    -   **Example Body**:
        ```json
        {
            "folder_type": "vector_layers"
        }
        ```
    -   Deletes all files in the specified folder and recreates the empty folder.

-   **Mark All Project Data for Deletion**: `DELETE /api/projects/<project_id>/data/delete/`
    -   **Body**: Optional JSON object with waiting period
    -   **Example Body**:
        ```json
        {
            "waiting_period": 7
        }
        ```
    -   This marks all files in the project's S3 folder for deletion after the specified waiting period (default: 7 days).

### Important Notes for Testing S3

-   Ensure your AWS S3 bucket is correctly configured and accessible by the credentials provided in your `.env` file.
-   When a new project is created, a corresponding folder structure will be automatically created in your S3 bucket with five subfolders: `vector_layers`, `raster_layers`, `terrain_models`, `street_imagery`, and `point_clouds`.
-   File uploads must specify which subfolder to use via the `folder_type` parameter.
-   Files can be listed for all subfolders or filtered by a specific subfolder type.
-   Individual files can be deleted by their S3 key, or all files in a specific subfolder can be deleted while preserving the folder structure.
-   Deletion of all project data is soft-deleted initially, with a configurable waiting period (default: 7 days) before permanent removal.
-   For more detailed information about the S3 folder structure and API usage, refer to the `S3_FOLDER_STRUCTURE.md` file.

