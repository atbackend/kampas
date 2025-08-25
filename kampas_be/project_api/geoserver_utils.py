import requests
import json
import logging
from django.conf import settings
from requests.auth import HTTPBasicAuth
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

class GeoServerManager:
    """
    Manages interactions with a GeoServer instance, including workspace, datastore, and layer operations.
    It handles creation, publishing, deletion, and style updates for geospatial layers.
    """
    def __init__(self):
        """
        Initializes the GeoServerManager with GeoServer URL, authentication, and workspace.
        Ensures the configured GeoServer workspace exists upon initialization.
        """
        self.base_url = settings.GEOSERVER_URL.rstrip('/')
        self.auth = HTTPBasicAuth(settings.GEOSERVER_USERNAME, settings.GEOSERVER_PASSWORD)
        self.workspace = settings.GEOSERVER_WORKSPACE
        
        # Ensure workspace exists
        self.create_workspace_if_not_exists()
    
    def create_workspace_if_not_exists(self, workspace_name=None):
        """
        Ensures that the GeoServer workspace specified exists.
        If the workspace does not exist, it attempts to create it.
        """
        try:
            workspace = workspace_name or self.workspace
            
            url = f"{self.base_url}/rest/workspaces/{workspace}"
            response = requests.get(url, auth=self.auth)
            
            if response.status_code == 404:
                create_url = f"{self.base_url}/rest/workspaces"
                workspace_data = {
                    "workspace": {
                        "name": workspace
                    }
                }
                
                response = requests.post(
                    create_url,
                    json=workspace_data,
                    auth=self.auth,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 201:
                    logger.info(f"Created workspace: {workspace}")
                    return True
                else:
                    logger.error(f"Failed to create workspace: {response.text}")
                    return False
            else:
                logger.info(f"Workspace {workspace} already exists")
                return True
                
        except Exception as e:
            logger.error(f"Error checking/creating workspace: {e}")
            return False
            
    def create_company_workspace(self, company_id):
        """
        Creates a workspace for a specific company using the company ID.
        """
        return self.create_workspace_if_not_exists(workspace_name=company_id)
        
    def create_project_store(self, company_id, project_id):
        """
        Creates a datastore for a specific project within a company workspace.
        """
        try:
            if not self.create_workspace_if_not_exists(workspace_name=company_id):
                logger.error(f"Failed to create or verify workspace for company: {company_id}")
                return False
                
            db_params = {
                'host': settings.DATABASES['default']['HOST'],
                'port': settings.DATABASES['default']['PORT'],
                'database': settings.DATABASES['default']['NAME'],
                'user': settings.DATABASES['default']['USER'],
                'password': settings.DATABASES['default']['PASSWORD']
            }
            
            url = f"{self.base_url}/rest/workspaces/{company_id}/datastores/{project_id}"
            response = requests.get(url, auth=self.auth)
            
            if response.status_code == 404:
                create_url = f"{self.base_url}/rest/workspaces/{company_id}/datastores"
                
                datastore_data = {
                    "dataStore": {
                        "name": project_id,
                        "description": f"Datastore for project {project_id}",
                        "connectionParameters": {
                            "entry": [
                                {"@key": "host", "$": db_params['host']},
                                {"@key": "port", "$": str(db_params['port'])},
                                {"@key": "database", "$": db_params['database']},
                                {"@key": "user", "$": db_params['user']},
                                {"@key": "passwd", "$": db_params['password']},
                                {"@key": "dbtype", "$": "postgis"},
                                {"@key": "schema", "$": "public"},
                                {"@key": "Expose primary keys", "$": "true"}
                            ]
                        }
                    }
                }
                
                response = requests.post(
                    create_url,
                    json=datastore_data,
                    auth=self.auth,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 201:
                    logger.info(f"Created datastore: {project_id} in workspace: {company_id}")
                    return True
                else:
                    logger.error(f"Failed to create datastore: {response.text}")
                    return False
            else:
                logger.info(f"Datastore {project_id} already exists in workspace {company_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error creating project datastore: {e}")
            return False

    
    def get_layer_url(self, workspace: str, layer_name: str, service_type: str = 'WFS') -> str:
        """Generate GeoServer URL in specified format (WFS or WMS)"""
        if service_type.upper() == 'WFS':
            # WFS format for vector data and feature access
            return f"{self.base_url}/{workspace}/wfs?service=WFS&version=1.1.0&request=GetCapabilities"
        elif service_type.upper() == 'WMS':
            # WMS format for map rendering
            return f"{self.base_url}/{workspace}/wms"
        else:
            # Default to WFS
            return f"{self.base_url}/{workspace}/wfs?service=WFS&version=1.1.0&request=GetCapabilities"
    
    def get_feature_url(self, workspace: str, layer_name: str, output_format: str = 'application/json') -> str:
        """Generate WFS GetFeature URL for specific layer"""
        return (f"{self.base_url}/{workspace}/wfs?"
                f"service=WFS&version=1.1.0&request=GetFeature&"
                f"typeName={workspace}:{layer_name}&outputFormat={output_format}")


    def publish_layer(self, layer_name, table_name, workspace_name=None, store_name=None, company_id=None, project_id=None):
        """
        Publishes a PostGIS table as a new layer in GeoServer.
        """
        try:
            workspace = workspace_name or company_id or self.workspace
            datastore_name = store_name or project_id or "kampas_postgis"
            
            logger.info(f"Publishing layer {layer_name} from table {table_name} in workspace {workspace}, datastore {datastore_name}")

            consistent_name = layer_name  # Use the unique layer name
        
            # Log the consistent naming
            logger.info(f"Publishing layer with consistent naming:")
            logger.info(f"  - GeoServer layer name: {consistent_name}")
            logger.info(f"  - PostGIS table name: {table_name}")
            logger.info(f"  - Workspace: {workspace}")
            logger.info(f"  - Datastore: {datastore_name}")
            
            # First check if the datastore exists and is accessible
            datastore_url = f"{self.base_url}/rest/workspaces/{workspace}/datastores/{datastore_name}"
            datastore_response = requests.get(datastore_url, auth=self.auth)
            
            if datastore_response.status_code != 200:
                logger.error(f"Datastore {datastore_name} not found in workspace {workspace}")
                return False, f"Datastore {datastore_name} not found"
            
            # Check if layer already exists
            layer_check_url = f"{self.base_url}/rest/workspaces/{workspace}/datastores/{datastore_name}/featuretypes/{layer_name}"
            layer_check_response = requests.get(layer_check_url, auth=self.auth)
            
            if layer_check_response.status_code == 200:
                logger.info(f"Layer {layer_name} already exists in GeoServer")
                wfs_url = f"{self.base_url}/{workspace}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={workspace}:{layer_name}&outputFormat=application/json"
                return True, wfs_url
            
            # Publish the layer
            publish_url = f"{self.base_url}/rest/workspaces/{workspace}/datastores/{datastore_name}/featuretypes"
            
            layer_data = {
                "featureType": {
                    "name": layer_name,
                    "nativeName": table_name,
                    "title": layer_name,
                    "abstract": f"vector_layer_{layer_name}",
                    "enabled": True,
                    "srs": "EPSG:4326",
                    "projectionPolicy": "FORCE_DECLARED",
                    "attributes": {
                        "attribute": [
                            {
                                "name": "geom",
                                "minOccurs": 0,
                                "maxOccurs": 1,
                                "nillable": True,
                                "binding": "org.locationtech.jts.geom.Geometry"
                            }
                        ]
                    }
                }
            }
            
            logger.info(f"Sending publish request to: {publish_url}")
            logger.debug(f"Layer data: {json.dumps(layer_data, indent=2)}")
            
            response = requests.post(
                publish_url,
                json=layer_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'}
            )
            
            logger.info(f"GeoServer response status: {response.status_code}")
            logger.info(f"GeoServer response: {response.text}")
            
            if response.status_code == 201:
                wfs_url = f"{self.base_url}/{workspace}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName={workspace}:{layer_name}&outputFormat=application/json"
                logger.info(f"Successfully published layer: {layer_name} in workspace: {workspace}")
                
                # Verify the layer was created
                verify_response = requests.get(layer_check_url, auth=self.auth)
                if verify_response.status_code == 200:
                    logger.info(f"Layer {layer_name} verified in GeoServer")
                else:
                    logger.warning(f"Layer {layer_name} creation reported success but verification failed")
                
                return True, wfs_url
            else:
                logger.error(f"Failed to publish layer: Status {response.status_code}, Response: {response.text}")
                return False, f"GeoServer error: {response.text}"
                
        except Exception as e:
            logger.error(f"Error publishing layer: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False, str(e)

    def publish_layer_to_group(self, company_id, project_id, layer_name, layer_type, table_name):
        """
        Publishes a layer and adds it to the appropriate layer group.
        FIXED: Use project_id as datastore instead of hardcoded 'kampas_postgis'
        """
        try:
            logger.info(f"Publishing layer {layer_name} to group for company {company_id}, project {project_id}")
            
            # CRITICAL FIX: Use project_id as datastore name, not hardcoded 'kampas_postgis'
            success, result = self.publish_layer(
                layer_name=layer_name,
                table_name=table_name,
                workspace_name=company_id,
                store_name=project_id  # This was the main bug - now using project_id
            )

            if not success:
                logger.error(f"Failed to publish layer {layer_name}: {result}")
                return False, result

            logger.info(f"Layer {layer_name} published successfully, now handling layer group")

            # Handle layer group
            group_name = f"{project_id}_{layer_type}"
            group_url = f"{self.base_url}/rest/workspaces/{company_id}/layergroups/{group_name}"
            response = requests.get(group_url, auth=self.auth)

            if response.status_code == 404:
                # Create layer group with this layer as the first layer
                group_created = self.create_layer_group_with_layer(company_id, project_id, layer_type, layer_name)
                if group_created:
                    logger.info(f"Created layer group {group_name} with layer {layer_name}")
                else:
                    logger.warning(f"Failed to create layer group {group_name} with layer {layer_name}")
            else:
                # Add layer to existing group
                added_to_group = self.add_layer_to_group(company_id, group_name, layer_name)
                if added_to_group:
                    logger.info(f"Successfully added layer {layer_name} to existing group {group_name}")
                else:
                    logger.warning(f"Failed to add layer {layer_name} to existing group {group_name}")

            return True, result

        except Exception as e:
            logger.error(f"Error publishing layer to group: {e}")
            return False, str(e)

    def create_layer_group_with_layer(self, company_id, project_id, group_name, layer_name):
        """
        Creates a layer group with an initial layer to avoid empty group errors.
        """
        try:
            layer_group_name = f"{project_id}_{group_name}"
            
            url = f"{self.base_url}/rest/workspaces/{company_id}/layergroups/{layer_group_name}"
            response = requests.get(url, auth=self.auth)
            
            if response.status_code == 404:
                create_url = f"{self.base_url}/rest/workspaces/{company_id}/layergroups"
                
                group_data = {
                    "layerGroup": {
                        "name": layer_group_name,
                        "title": f"{project_id.replace('_', ' ').title()} - {group_name.replace('_', ' ').title()}",
                        "abstractTxt": f"Layer group for {group_name} in project {project_id}",
                        "mode": "CONTAINER",
                        "workspace": {
                            "name": company_id
                        },
                        "publishables": {
                            "published": [
                                {
                                    "@type": "layer",
                                    "name": f"{company_id}:{layer_name}"
                                }
                            ]
                        },
                        "bounds": {
                            "minx": -180,
                            "maxx": 180,
                            "miny": -90,
                            "maxy": 90,
                            "crs": "EPSG:4326"
                        }
                    }
                }
                
                response = requests.post(
                    create_url,
                    json=group_data,
                    auth=self.auth,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 201:
                    logger.info(f"Created layer group: {layer_group_name} in workspace: {company_id} with initial layer: {layer_name}")
                    return True
                else:
                    logger.error(f"Failed to create layer group: {response.text}")
                    return False
            else:
                logger.info(f"Layer group {layer_group_name} already exists in workspace {company_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error creating layer group with layer: {e}")
            return False

    def add_layer_to_group(self, workspace, group_name, layer_name):
        """
        Adds a layer to an existing layer group.
        """
        try:
            url = f"{self.base_url}/rest/workspaces/{workspace}/layergroups/{group_name}"
            response = requests.get(url, auth=self.auth)
            
            if response.status_code != 200:
                logger.error(f"Layer group {group_name} not found")
                return False
            
            # Check if response is valid JSON
            try:
                group_data = response.json()
            except ValueError as e:
                logger.error(f"Invalid JSON response from GeoServer: {response.text}")
                return False
            
            if not isinstance(group_data, dict):
                logger.error(f"Unexpected response format from GeoServer: {type(group_data)}")
                return False
            
            if 'layerGroup' in group_data and 'publishables' in group_data['layerGroup']:
                publishables = group_data['layerGroup']['publishables']
                if 'published' not in publishables:
                    publishables['published'] = []
                
                # Ensure publishables['published'] is a list
                if not isinstance(publishables['published'], list):
                    publishables['published'] = []
                
                layer_exists = any(
                    isinstance(pub, dict) and pub.get('name') == f"{workspace}:{layer_name}" 
                    for pub in publishables['published']
                )
                
                if not layer_exists:
                    publishables['published'].append({
                        "@type": "layer",
                        "name": f"{workspace}:{layer_name}"
                    })
                    
                    update_response = requests.put(
                        url,
                        json=group_data,
                        auth=self.auth,
                        headers={'Content-Type': 'application/json'}
                    )
                    
                    if update_response.status_code == 200:
                        logger.info(f"Successfully added layer {layer_name} to group {group_name}")
                        return True
                    else:
                        logger.error(f"Failed to update layer group: {update_response.text}")
                        return False
                else:
                    logger.info(f"Layer {layer_name} already exists in group {group_name}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error adding layer to group: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
    

    def delete_layer(self, layer_name, workspace_name=None, store_name=None):
        """
        Deletes a specified layer from GeoServer.
        """
        try:
            workspace = workspace_name or self.workspace
            datastore_name = store_name or "kampas_postgis"
            
            logger.info(f"Attempting to delete layer: {layer_name} from workspace: {workspace}, datastore: {datastore_name}")
            
            # Step 1: Remove layer from any layer groups first
            self._remove_layer_from_groups(workspace, layer_name)
            
            # Step 2: Delete the layer (featuretype)
            layer_url = f"{self.base_url}/rest/workspaces/{workspace}/datastores/{datastore_name}/featuretypes/{layer_name}"
            
            # Check if layer exists first
            check_response = requests.get(layer_url, auth=self.auth)
            if check_response.status_code == 404:
                logger.warning(f"Layer {layer_name} not found in GeoServer")
                return True  # Consider it successful if it doesn't exist
            
            # Delete the layer
            response = requests.delete(layer_url, auth=self.auth, params={'recurse': 'true'})
            
            if response.status_code == 200:
                logger.info(f"Successfully deleted layer: {layer_name}")
                
                # Verify deletion
                verify_response = requests.get(layer_url, auth=self.auth)
                if verify_response.status_code == 404:
                    logger.info(f"Verified layer {layer_name} was deleted from GeoServer")
                    return True
                else:
                    logger.warning(f"Layer {layer_name} deletion reported success but layer still exists")
                    return False
            else:
                logger.error(f"Failed to delete layer {layer_name}: Status {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting layer {layer_name}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False

    def _remove_layer_from_groups(self, workspace, layer_name):
        """
        Remove a layer from all layer groups in the workspace.
        """
        try:
            # Get all layer groups in the workspace
            groups_url = f"{self.base_url}/rest/workspaces/{workspace}/layergroups"
            response = requests.get(groups_url, auth=self.auth)
            
            if response.status_code != 200:
                logger.warning(f"Could not list layer groups in workspace {workspace}")
                return
            
            groups_data = response.json()
            layer_groups = groups_data.get('layerGroups', {}).get('layerGroup', [])
            
            # Handle single group vs multiple groups
            if isinstance(layer_groups, dict):
                layer_groups = [layer_groups]
            
            for group in layer_groups:
                group_name = group.get('name')
                if group_name:
                    self._remove_layer_from_specific_group(workspace, group_name, layer_name)
                    
        except Exception as e:
            logger.warning(f"Error removing layer {layer_name} from groups: {e}")

    def _remove_layer_from_specific_group(self, workspace, group_name, layer_name):
        """
        Remove a layer from a specific layer group.
        """
        try:
            group_url = f"{self.base_url}/rest/workspaces/{workspace}/layergroups/{group_name}"
            response = requests.get(group_url, auth=self.auth)
            
            if response.status_code != 200:
                return
            
            group_data = response.json()
            
            if 'layerGroup' in group_data and 'publishables' in group_data['layerGroup']:
                publishables = group_data['layerGroup']['publishables']
                if 'published' in publishables:
                    # Remove the layer from the publishables list
                    original_count = len(publishables['published'])
                    publishables['published'] = [
                        pub for pub in publishables['published'] 
                        if pub.get('name') != f"{workspace}:{layer_name}"
                    ]
                    
                    if len(publishables['published']) < original_count:
                        # Update the layer group
                        update_response = requests.put(
                            group_url,
                            json=group_data,
                            auth=self.auth,
                            headers={'Content-Type': 'application/json'}
                        )
                        
                        if update_response.status_code == 200:
                            logger.info(f"Removed layer {layer_name} from group {group_name}")
                        else:
                            logger.warning(f"Failed to update group {group_name} after removing layer {layer_name}")
                            
        except Exception as e:
            logger.warning(f"Error removing layer {layer_name} from group {group_name}: {e}")


    def delete_layer_from_geoserver(self, vector_layer):
        """Delete layer from GeoServer and PostGIS table (used only during permanent deletion)"""
        try:
            geoserver_success = False
            
            # Delete from GeoServer only if it's published
            if vector_layer.is_published and vector_layer.geoserver_layer_name:
                project = vector_layer.project
                workspace_name = project.company.id
                store_name = project.id
                
                logger.info(f"Deleting layer {vector_layer.geoserver_layer_name} from GeoServer workspace {workspace_name}")
                
                success = self.geoserver_manager.delete_layer(
                    vector_layer.geoserver_layer_name,
                    workspace_name=workspace_name,
                    store_name=store_name
                )
                
                if success:
                    logger.info(f"Successfully deleted layer {vector_layer.geoserver_layer_name} from GeoServer")
                    geoserver_success = True
                else:
                    logger.error(f"Failed to delete layer {vector_layer.geoserver_layer_name} from GeoServer")
                    
                    # Try alternative deletion approach
                    logger.info("Attempting alternative deletion method...")
                    try:
                        alt_success = self.geoserver_manager.delete_layer(
                            vector_layer.name,
                            workspace_name=workspace_name,
                            store_name=store_name
                        )
                        if alt_success:
                            logger.info(f"Successfully deleted layer using alternative method")
                            geoserver_success = True
                    except Exception as e:
                        logger.error(f"Alternative deletion method also failed: {e}")
            else:
                logger.info(f"Layer {vector_layer.name} is not published in GeoServer")
                geoserver_success = True  # Consider successful if not published
            
            return geoserver_success
            
        except Exception as e:
            logger.error(f"Error deleting layer from GeoServer: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False


    def publish_raster_layer(self, workspace, store_name, layer_name, file_path, title=None):
        """Publishes a GeoTIFF file as a coverage in GeoServer
        
        Args:
            workspace: The workspace name
            store_name: The coverage store name (should be same as layer_name)
            layer_name: The layer name (should be same as store_name)
            file_path: Path to the GeoTIFF file
            title: Optional title for the layer
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # **FIX: Use consistent naming - store_name and layer_name should be the same**
            # This prevents creating two separate layers in GeoServer
            
            # First, create the coverage store with the file
            coverage_store_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}"
            
            # Check if coverage store already exists
            store_check = requests.get(coverage_store_url, auth=self.auth)
            
            if store_check.status_code == 200:
                logger.info(f"Coverage store {store_name} already exists in workspace {workspace}")
                # Check if the coverage also exists
                coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}"
                coverage_check = requests.get(coverage_url, auth=self.auth)
                if coverage_check.status_code == 200:
                    logger.info(f"Coverage {layer_name} already exists in store {store_name}")
                    return True, f"Coverage {layer_name} already exists"
            else:
                # Create the coverage store by uploading the file
                # This automatically creates both the store AND the coverage in one step
                with open(file_path, 'rb') as f:
                    headers = {'Content-type': 'image/tiff'}
                    create_store_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff"
                    
                    response = requests.put(
                        create_store_url,
                        data=f,
                        auth=self.auth,
                        headers=headers
                    )
                    
                    if response.status_code not in [201, 200]:
                        logger.error(f"Failed to create coverage store: {response.status_code} - {response.text}")
                        return False, f"Failed to create coverage store: {response.text}"
                    
                    logger.info(f"Successfully created coverage store {store_name} with coverage {layer_name}")
                    return True, f"Successfully published raster layer {layer_name}"
            
            # If we reach here, the store exists but coverage doesn't - create just the coverage
            coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}"
            
            # Check if coverage already exists
            coverage_check = requests.get(coverage_url, auth=self.auth)
            
            if coverage_check.status_code == 200:
                logger.info(f"Coverage {layer_name} already exists in store {store_name}")
                return True, f"Coverage {layer_name} already exists"
            
            # Create the coverage
            coverage_data = {
                "coverage": {
                    "name": layer_name,
                    "title": title or layer_name,
                    "enabled": True,
                    "srs": "EPSG:4326",
                    "projectionPolicy": "REPROJECT_TO_DECLARED"
                }
            }
            
            create_coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages"
            
            response = requests.post(
                create_coverage_url,
                json=coverage_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code in [201, 200]:
                logger.info(f"Successfully published raster layer {layer_name}")
                return True, f"Successfully published raster layer {layer_name}"
            else:
                logger.error(f"Failed to publish coverage: {response.status_code} - {response.text}")
                return False, f"Failed to publish coverage: {response.text}"
                
        except Exception as e:
            logger.error(f"Error publishing raster layer: {str(e)}")
            return False, f"Error publishing raster layer: {str(e)}"

    def get_layer_info(self, layer_name, workspace_name=None, datastore_name=None):
        """
        Retrieves detailed information about a specific layer from GeoServer.
        """
        try:
            workspace = workspace_name or self.workspace
            datastore = datastore_name or "kampas_postgis"
            
            url = f"{self.base_url}/rest/workspaces/{workspace}/datastores/{datastore}/featuretypes/{layer_name}"
            
            response = requests.get(url, auth=self.auth)
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Layer {layer_name} not found: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting layer info: {e}")
            return None


    
    def publish_terrain_layer(self, workspace, store_name, layer_name, file_path, terrain_type=None, title=None):
        """Publishes a terrain file as a coverage in GeoServer"""
        try:
            # **FIX: Use consistent naming - store_name and layer_name should be the same**
            # This prevents creating two separate layers in GeoServer
            
            # Create the coverage store by uploading the terrain file
            # This automatically creates both the store AND the coverage in one step
            coverage_store_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}"
            
            # Check if coverage store already exists
            store_check = requests.get(coverage_store_url, auth=self.auth)
            
            if store_check.status_code == 200:
                logger.info(f"Coverage store {store_name} already exists in workspace {workspace}")
                # Check if the coverage also exists
                coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}"
                coverage_check = requests.get(coverage_url, auth=self.auth)
                if coverage_check.status_code == 200:
                    logger.info(f"Terrain coverage {layer_name} already exists in store {store_name}")
                    return True, f"Terrain coverage {layer_name} already exists"
            else:
                # Create the coverage store by uploading the file
                # This automatically creates both the store AND the coverage in one step
                with open(file_path, 'rb') as f:
                    headers = {'Content-type': 'image/tiff'}
                    create_store_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/file.geotiff"
                    
                    response = requests.put(
                        create_store_url,
                        data=f,
                        auth=self.auth,
                        headers=headers
                    )
                    
                    if response.status_code not in [201, 200]:
                        logger.error(f"Failed to create terrain coverage store: {response.status_code} - {response.text}")
                        return False, f"Failed to create coverage store: {response.text}"
                    
                    logger.info(f"Successfully created terrain coverage store {store_name} with coverage {layer_name}")
                    return True, f"Successfully published terrain layer {layer_name}"

            # If we reach here, the store exists but coverage doesn't - create just the coverage
            coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}"
            
            # Check if coverage already exists
            coverage_check = requests.get(coverage_url, auth=self.auth)
            
            if coverage_check.status_code == 200:
                logger.info(f"Terrain coverage {layer_name} already exists in store {store_name}")
                return True, f"Terrain coverage {layer_name} already exists"

            # Create the coverage
            coverage_data = {
                "coverage": {
                    "name": layer_name,
                    "title": title or layer_name,
                    "description": f"Terrain model ({terrain_type})",
                    "enabled": True,
                    "srs": "EPSG:4326",
                    "projectionPolicy": "REPROJECT_TO_DECLARED"
                }
            }

            create_coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages"
            
            response = requests.post(
                create_coverage_url,
                json=coverage_data,
                auth=self.auth,
                headers={'Content-Type': 'application/json'}
            )

            if response.status_code in [201, 200]:
                logger.info(f"Successfully published terrain layer {layer_name}")
                return True, f"Successfully published terrain layer {layer_name}"
            else:
                logger.error(f"Failed to publish terrain coverage: {response.status_code} - {response.text}")
                return False, f"Failed to publish coverage: {response.text}"

        except Exception as e:
            logger.error(f"Error publishing terrain layer: {str(e)}")
            return False, f"Error publishing terrain layer: {str(e)}"

    def delete_terrain_layer(self, workspace, store_name, layer_name):
        """Delete terrain layer and its coverage store from GeoServer"""
        try:
            # Step 1: Remove layer from any layer groups first
            self._remove_layer_from_groups(workspace, layer_name)
            
            # Step 2: Delete the coverage
            coverage_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}/coverages/{layer_name}"
            
            coverage_response = requests.delete(coverage_url, auth=self.auth, params={'recurse': 'true'})
            
            if coverage_response.status_code == 200:
                logger.info(f"Successfully deleted terrain coverage: {layer_name}")
            else:
                logger.warning(f"Failed to delete terrain coverage {layer_name}: {coverage_response.text}")
            
            # Step 3: Delete the coverage store
            store_url = f"{self.base_url}/rest/workspaces/{workspace}/coveragestores/{store_name}"
            
            store_response = requests.delete(store_url, auth=self.auth, params={'recurse': 'true'})
            
            if store_response.status_code == 200:
                logger.info(f"Successfully deleted terrain coverage store: {store_name}")
                return True
            else:
                logger.warning(f"Failed to delete terrain coverage store {store_name}: {store_response.text}")
                return False

        except Exception as e:
            logger.error(f"Error deleting terrain layer {layer_name}: {e}")
            return False

def get_geoserver_manager():
    """
    Returns a singleton instance of the GeoServerManager.
    """
    return GeoServerManager()


class StreetImageryLayerManager:
    """Project-specific street imagery layer manager with sanitized identifiers"""

    def __init__(self, company_id=None):
        self.geoserver_url = settings.GEOSERVER_URL.rstrip('/')
        self.username = settings.GEOSERVER_USERNAME
        self.password = settings.GEOSERVER_PASSWORD
        self.workspace = company_id if company_id else settings.GEOSERVER_WORKSPACE

        # Validate settings
        if not all([self.geoserver_url, self.username, self.password, self.workspace]):
            logger.error("Missing GeoServer configuration in settings")
            raise ValueError("GeoServer configuration incomplete")

    def sanitize_identifier(self, name: str) -> str:
        """Create safe identifier for SQL and GeoServer usage"""
        import re
        # Remove special characters, keep alphanumeric and underscore
        sanitized = re.sub(r'[^0-9a-zA-Z_]', '_', str(name))
        # Ensure doesn't start with digit - prefix with 'prj_' if needed
        if re.match(r'^\d', sanitized):
            sanitized = f'prj_{sanitized}'
        return sanitized

    def get_or_create_project_street_layer(self, project_id: str) -> bool:
        """Create project-specific street imagery layer using EXISTING project datastore"""
        try:
            safe_project_id = self.sanitize_identifier(project_id)
            logger.info(f"Using sanitized project ID: {safe_project_id} for project: {project_id}")

            # Step 1: Create project-specific PostGIS table
            if not self._create_project_street_table(safe_project_id, project_id):
                logger.error(f"Failed to create street table for project {project_id}")
                return False

            # **FIX: Use EXISTING project datastore instead of creating new one**
            # The project datastore should already exist as project_id in company workspace
            existing_datastore_name = project_id  # This is the correct project datastore

            # Step 2: Create project-specific layer using existing datastore
            layer_name = f"{safe_project_id}_street_imagery"
            if not self._create_project_layer_with_existing_datastore(safe_project_id, existing_datastore_name, layer_name):
                logger.warning(f"Failed to create layer for project {project_id}")
                return True  # Continue without GeoServer layer

            logger.info(f"✅ Project street imagery layer created: {layer_name}")
            return True

        except Exception as e:
            logger.error(f"Error creating project street layer: {e}")
            return False


    def _create_project_street_table(self, safe_project_id: str, original_project_id: str) -> bool:
        """Create project-specific street imagery table with sanitized name"""
        table_name = f"street_imagery_{safe_project_id}"
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = %s
                    );
                """, [table_name])
                table_exists = cursor.fetchone()[0]

                if table_exists:
                    logger.info(f"✅ Table {table_name} already exists")
                    return True

                # Create project-specific table with quoted identifier
                cursor.execute(f"""
                    CREATE TABLE "{table_name}" (
                        id SERIAL PRIMARY KEY,
                        streetimage_id UUID NOT NULL UNIQUE,
                        project_id VARCHAR(255) NOT NULL,
                        original_filename VARCHAR(255) NOT NULL,
                        file_path TEXT NOT NULL,
                        latitude DOUBLE PRECISION NOT NULL,
                        longitude DOUBLE PRECISION NOT NULL,
                        geom GEOMETRY(POINT, 4326) NOT NULL,
                        image_type VARCHAR(50) DEFAULT 'front_view',
                        uploaded_at TIMESTAMP DEFAULT NOW(),
                        uploaded_by VARCHAR(255),
                        is_active BOOLEAN DEFAULT TRUE,
                        notes TEXT
                    );
                """)

                # Create indexes with quoted table name
                cursor.execute(f'CREATE INDEX "idx_{table_name}_geom" ON "{table_name}" USING GIST (geom);')
                cursor.execute(f'CREATE INDEX "idx_{table_name}_project" ON "{table_name}" (project_id);')
                cursor.execute(f'CREATE INDEX "idx_{table_name}_streetimage" ON "{table_name}" (streetimage_id);')

                logger.info(f"✅ Created project-specific table: {table_name}")
                return True

        except Exception as e:
            logger.error(f"Error creating table {table_name}: {e}")
            return False


    def _create_project_layer_with_existing_datastore(self, project_id: str, datastore_name: str, layer_name: str) -> bool:
        """Create project-specific point layer using existing project datastore"""
        table_name = f"street_imagery_{project_id.replace('-', '_')}"
        try:
            import requests
            
            # **Check if layer already exists in company workspace**
            layer_check_url = f"{self.geoserver_url}/rest/workspaces/{self.workspace}/datastores/{datastore_name}/featuretypes/{layer_name}"
            response = requests.get(layer_check_url, auth=(self.username, self.password))

            if response.status_code == 200:
                logger.info(f"✅ Layer {layer_name} already exists in workspace {self.workspace}")
                return True

            # **Create feature type using existing project datastore**
            feature_type_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
            <featureType>
                <name>{layer_name}</name>
                <nativeName>{table_name}</nativeName>
                <title>street_imagery_{project_id}</title>
                <abstract>Street imagery points for project {project_id}</abstract>
                <keywords>
                    <string>street</string>
                    <string>imagery</string>
                    <string>points</string>
                </keywords>
                <nativeCRS>EPSG:4326</nativeCRS>
                <srs>EPSG:4326</srs>
                <nativeBoundingBox>
                    <minx>-180.0</minx>
                    <maxx>180.0</maxx>
                    <miny>-90.0</miny>
                    <maxy>90.0</maxy>
                    <crs>EPSG:4326</crs>
                </nativeBoundingBox>
                <latLonBoundingBox>
                    <minx>-180.0</minx>
                    <maxx>180.0</maxx>
                    <miny>-90.0</miny>
                    <maxy>90.0</maxy>
                    <crs>EPSG:4326</crs>
                </latLonBoundingBox>
                <projectionPolicy>FORCE_DECLARED</projectionPolicy>
                <enabled>true</enabled>
                <store class="dataStore">
                    <name>{self.workspace}:{datastore_name}</name>
                </store>
                <maxFeatures>0</maxFeatures>
                <numDecimals>8</numDecimals>
            </featureType>"""

            # **Use existing project datastore in company workspace**
            url = f"{self.geoserver_url}/rest/workspaces/{self.workspace}/datastores/{datastore_name}/featuretypes"
            response = requests.post(
                url,
                data=feature_type_xml,
                headers={'Content-Type': 'application/xml'},
                auth=(self.username, self.password)
            )

            if response.status_code == 201:
                logger.info(f"✅ Created feature type: {layer_name} in workspace {self.workspace}")
                # **RETURN WFS URL FOR THE LAYER**
                geoserver_manager = GeoServerManager()
                wfs_url = geoserver_manager.get_layer_url(self.workspace, layer_name, service_type='WFS')
                logger.info(f"Layer accessible via WFS: {wfs_url}")
            
                return True
            else:
                logger.error(f"❌ Failed to create feature type: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            logger.error(f"Error creating layer: {e}")
            return False


    def create_layer_popup_template(self, layer_name: str) -> bool:
        """Create GetFeatureInfo template for rich popups in OpenLayers"""
        try:
            import requests
            
            # Create HTML template for feature info popup
            template_content = """
                <html>
                <head>
                    <title>Street Image Details</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 10px; }
                        .feature-info { background: #f9f9f9; padding: 10px; border-radius: 5px; }
                        .feature-info h3 { margin-top: 0; color: #333; }
                        .feature-info img { max-width: 300px; max-height: 200px; margin: 10px 0; }
                        .coordinates { color: #666; font-size: 0.9em; }
                        .metadata { margin-top: 10px; }
                        .metadata strong { color: #444; }
                    </style>
                </head>
                <body>
                <#list features as feature>
                    <div class="feature-info">
                        <h3>Street Image: ${feature.original_filename.value}</h3>
                        
                        <#if feature.file_path.value?has_content>
                            <img src="${feature.file_path.value}" alt="Street Image" 
                                onerror="this.style.display='none'" loading="lazy">
                        </#if>
                        
                        <div class="coordinates">
                            <strong>Location:</strong> ${feature.latitude.value}, ${feature.longitude.value}
                        </div>
                        
                        <div class="metadata">
                            <strong>Image Type:</strong> ${feature.image_type.value!""}<br>
                            <strong>Uploaded:</strong> ${feature.uploaded_at.value!""}<br>
                            <strong>Uploaded By:</strong> ${feature.uploaded_by.value!""}<br>
                            <#if feature.notes.value?has_content>
                                <strong>Notes:</strong> ${feature.notes.value}<br>
                            </#if>
                        </div>
                    </div>
                </#list>
                </body>
                </html>
            """
            
            # Upload template to GeoServer
            template_url = f"{self.geoserver_url}/rest/workspaces/{self.workspace}/datastores/{self.workspace}/featuretypes/{layer_name}/ftl-templates"
            
            # Create content.ftl template
            template_data = {
                "name": "content.ftl",
                "content": template_content
            }
            
            response = requests.post(
                template_url,
                json=template_data,
                headers={'Content-Type': 'application/json'},
                auth=(self.username, self.password)
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Created popup template for layer: {layer_name}")
                return True
            else:
                logger.warning(f"Failed to create popup template: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating popup template: {e}")
            return False

