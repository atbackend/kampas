import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Building2, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Mail, 
  User,
  X,
  HandCoins,
  Users
} from 'lucide-react';
import {
  createClientAsync,
  updateClientAsync,
  toggleClientStatus,
  clearError, 
  updateClientType,
  setSearchTerm,
  setCurrentPage,
  setFilter,
  toggleFilterPanel,
  clearStatus,
  fetchClientsAsync
} from './ClientSlice';
import ClientForm from './ClientForm';
import ClientDetailView from './ClientDetailedView';
import DataTable from '../commons/DataTable';
import FullScreenModal from '../commons/FullScreenModal';
import PageHeader from '../commons/Header';

const ClientPage = () => {
  const dispatch = useDispatch();
  
  const {
    clients,
    creating,
    updating,
    deleting,
    loading,
    error,
    successMessage,
    searchTerm,
    currentPage,
    itemsPerPage,
    filter,
    showFilterPanel,
  } = useSelector((state) => state.clients);
  
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchClientsAsync());
  }, [dispatch]);

  
  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        dispatch(clearStatus());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error, dispatch]);

  const handleFormSubmit = async (clientData) => {
    try {
      console.log('🔄 Form Submit: Received data:', clientData);
      console.log('🔄 Form Submit: Editing Client:', editingClient);
      
      const apiData = {
        ...clientData,
        client_type: clientData.client_type || 'Individual'
      };
      
      console.log('🔄 Form Submit: Sending API data:', apiData);
      
      if (editingClient?.id) {
        console.log('🔄 Updating client with ID:', editingClient.id);
        const result = await dispatch(updateClientAsync({
          id: editingClient.id,
          clientData: apiData
        }));
        
        if (updateClientAsync.fulfilled.match(result)) {
          console.log('✅ Update successful');
          setShowModal(false);
          setEditingClient(null);
          dispatch(clearError());
          dispatch(fetchClientsAsync());
        } else {
          console.error('❌ Update failed:', result.payload);
        }
      } else {
        console.log('🔄 Creating new client with data:', apiData);
        const result = await dispatch(createClientAsync(apiData));
        
        if (createClientAsync.fulfilled.match(result)) {
          console.log('✅ Create successful');
          setShowModal(false);
          setEditingClient(null);
          dispatch(clearError());
          dispatch(fetchClientsAsync());
        } else {
          console.error('❌ Create failed:', result.payload);
        }
      }
    } catch (error) {
      console.error('❌ Error in form submission:', error);
    }
  };

  const handleCancel = () => {
    console.log('🔄 Canceling form');
    setShowModal(false);
    setEditingClient(null);
    dispatch(clearError());
  };

 
const handleEditClick = (client) => {
  console.log('🔄 Edit clicked for client:', client);
  
  // Comprehensive data normalization for editing
  const normalizedClient = {
    id: client.id,
    client_company: client.client_company || client.companyId || '',
    client_company_name: client.client_company_name || client.company_name || client.companyName || '',
    company_name: client.client_company_name || client.company_name || client.companyName || '',
    companyName: client.client_company_name || client.company_name || client.companyName || '',
    
    // Fix client_type normalization - ensure lowercase for form consistency
    client_type: (client.client_type || client.clientType || 'individual').toLowerCase(),
    clientType: (client.client_type || client.clientType || 'individual').toLowerCase(),
    
    contact_person: client.contact_person || client.primary_contact || client.primaryContact || '',
    primary_contact: client.contact_person || client.primary_contact || client.primaryContact || '',
    primaryContact: client.contact_person || client.primary_contact || client.primaryContact || '',
    
    primary_contact_number: client.primary_contact_number || client.phone || '',
    phone: client.primary_contact_number || client.phone || '',
    
    secondary_contact_number: client.secondary_contact_number || client.secondary_phone || '',
    
    email: client.email || '',
    address: client.address || '',
    city: client.city || '',
    state: client.state || '',
    pin: client.pin || '',
    country: client.country || '',
    
    // Fix status mapping - check all possible status fields
    is_active: client.is_active !== undefined ? client.is_active : (client.status !== undefined ? client.status : true),
    status: client.is_active !== undefined ? client.is_active : (client.status !== undefined ? client.status : true),
    
    created_by: client.created_by || client.createdBy || 'Unknown',
    created_at: client.created_at || client.createdAt,
    updated_at: client.updated_at || client.updatedAt,
    description: client.description || ''
  };
  
  console.log('🔄 Normalized client data for editing:', normalizedClient);
  
  setEditingClient(normalizedClient);
  setShowModal(true);
};

  const handleCreateClick = () => {
    console.log('🔄 Create new client clicked');
    setEditingClient(null);
    setShowModal(true);
  };

  const handleStatusToggle = (clientId) => {
    dispatch(toggleClientStatus(clientId));
  };

  const handleViewClient = (client) => {
    setViewingClient(client);
    setShowViewModal(true);
  };

  // Helper function to safely access client properties
const getClientName = (client) => {
  const companyName =
    client?.client_company_name ||
    client?.company_name ||
    client?.companyName ||
    '';

  const primaryContact =
    client?.contact_person ||
    client?.primary_contact ||
    client?.primaryContact ||
    '';

  return { companyName, primaryContact };
};

  // Helper function to get client type tag color
 
  // Filter and pagination logic
  const filteredClients = clients.filter((client) => {
    if (!client) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const { companyName, primaryContact } = getClientName(client);
    const email = client.email || '';
    const clientType = client.client_type || client.clientType || '';
    
    const matchesSearch = (
      companyName.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower) ||
      primaryContact.toLowerCase().includes(searchLower) ||
      clientType.toLowerCase().includes(searchLower)
    );

    const status = client.is_active !== undefined ? client.is_active : client.status;
    const matchesStatus = filter.status === 'all' || 
      (filter.status === 'active' && status) ||
      (filter.status === 'inactive' && !status);

    const matchesType = filter.clientType === 'all' || 
      (client.client_type || client.clientType) === filter.clientType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      dispatch(setCurrentPage(page));
    }
  };

  // Helper function to render error messages
  const renderError = (error) => {
    if (typeof error === 'string') {
      return error;
    } else if (error && typeof error === 'object') {
      if (error.message) {
        return error.message;
      }
      const errorMessages = [];
      Object.keys(error).forEach(key => {
        if (key === 'message') return;
        if (Array.isArray(error[key])) {
          errorMessages.push(`${key.replace('_', ' ')}: ${error[key].join(', ')}`);
        } else {
          errorMessages.push(`${key.replace('_', ' ')}: ${error[key]}`);
        }
      });
      return errorMessages.length > 0 ? errorMessages.join('; ') : 'An unknown error occurred';
    }
    return 'An unknown error occurred';
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'company',
      header: 'Company Name',
      render: (_, client) => {
        if (!client) return <div>Invalid client data</div>;
        
        const { companyName } = getClientName(client);
        const initials = companyName.split(' ').map(word => word[0] || '').join('').toUpperCase().slice(0, 2);
        
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md">
              {initials || '?'}
            </div>
            <div>
              <div className="font-medium text-gray-200">
                {companyName}
              </div>
              <div className="text-sm text-gray-400">ID: {client.id}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'email',
      header: 'Email',
      render: (email) => (
        <div className="text-gray-300">
          <div className="flex items-center space-x-2">
            <Mail size={16} className="text-gray-400" />
            <span>{email || 'No email'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'primary_contact',
      header: 'Primary Contact',
      render: (_, client) => {
        const { primaryContact } = getClientName(client);
        return (
          <div className="text-gray-300">
            <div className="flex items-center space-x-2">
              <User size={16} className="text-gray-400" />
              <span>{primaryContact || 'No contact'}</span>
            </div>
          </div>
        );
      }
    },
  {
  key: 'client_type',
  header: 'Client Type',
  render: (clientType, client) => {
    const type = clientType || client.clientType || 'Individual';
    return (
      <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/15 text-white-200">
        {type}
      </span>
    );
  }
},
{
    key: 'status',
    header: 'Status',
    render: (_, client) => {
      const status = client.is_active !== undefined ? client.is_active : client.status;
      return (
        <div className="text-gray-300">
          <div className="flex items-center space-x-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className={status ? 'text-green-400' : 'text-red-400'}>
              {status ? 'Active' : 'Inactive'}
            </span>
          </div>
          {isSaving && (
            <span className="text-yellow-400 text-xs mt-1 block">
              Updating...
            </span>
          )}
        </div>
      );
    }
  },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, client) => (
        <div className="flex gap-2">
            <button
                        className="bg-purple-600 text-white p-2 rounded-md hover:bg-purple-500 transition-colors group relative"
                        onClick={() => handleViewClient(client)}
                        title="View Project Details"
                      >
                        <Users size={16} />
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          View Details
                        </span>
                      </button>

          <button
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500 transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleEditClick(client)}
            title="Edit Client"
            disabled={updating}
          >
            <Edit size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Main Content */}
      <div className={`flex-1 p-6 transition-all duration-300 ${showFilterPanel ? 'mr-80' : ''}`}>
        {/* Header */}
        <PageHeader
          icon={Building2}
          title="Client Management"
          subtitle="Manage your clients and their information"
        />

        {/* Status Messages */}
        {successMessage && (
          <div className="bg-green-800 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-6 shadow-lg">
            <div className="flex items-center">
              <CheckCircle size={20} className="mr-2" />
              {successMessage}
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-6 shadow-lg">
            <div className="flex items-center">
              <XCircle size={20} className="mr-2" />
              {renderError(error)}
            </div>
          </div>
        )}

        {/* Search and Actions */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              className="p-3 pl-10 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 w-80 shadow-sm"
              placeholder="Search clients by name, email, or contact..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
            onClick={handleCreateClick}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2 font-medium"
            disabled={creating}
            >
          <HandCoins size={18}  />
         <span>{creating ? 'Creating...' : 'Add Client'}</span>
         </button>
 
            
            <button
              className={`h-12 px-4 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg ${
                showFilterPanel 
                  ? 'bg-blue-600 text-white hover:bg-blue-500' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              onClick={() => dispatch(toggleFilterPanel())}
              title="Toggle Filters"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={tableColumns}
          data={paginatedClients}
          loading={loading || creating || updating || deleting}
          emptyMessage={
            clients.length === 0
              ? 'No clients available. Try adding a new client.'
              : filteredClients.length === 0
                ? 'No clients found matching your criteria'
                : 'No clients to display'
          }
          className="mb-6 bg-gray-800 min-h-[400px]"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-lg">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      className={`px-4 py-2 rounded-lg transition-colors shadow-sm ${
                        page === currentPage
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="text-gray-400 px-2">...</span>;
                }
                return null;
              })}
              
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Side Filter Panel */}
      {showFilterPanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 z-40 transition-transform duration-300 overflow-y-auto">
          <div className="p-6">
            {/* Filter Panel Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-100">Filters</h3>
              <button
                onClick={() => dispatch(toggleFilterPanel())}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Close Filters"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Status
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'inactive', label: 'Inactive Only' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={filter.status === option.value}
                      onChange={(e) => dispatch(setFilter({ ...filter, status: e.target.value }))}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Client Type Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Client Type
              </label>
              <div className="space-y-2">
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'Individual', label: 'Individual' },
                  { value: 'Business', label: 'Business' },
                  { value: 'Enterprise', label: 'Enterprise' },
                  { value: 'Government', label: 'Government' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="clientType"
                      value={option.value}
                      checked={filter.clientType === option.value}
                      onChange={(e) => dispatch(setFilter({ ...filter, clientType: e.target.value }))}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <div className="pt-4 border-t border-gray-700">
              <button
                onClick={() => dispatch(setFilter({ status: 'all', clientType: 'all' }))}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal */}
      {showModal && (
  <ClientForm
    editingClient={editingClient}
    onSubmit={handleFormSubmit}
    onCancel={handleCancel}
    isEditing={!!editingClient}
    isSubmitting={creating || updating}
  />
  )}

      {/* Client Detail View Modal */}
      {showViewModal && viewingClient && (
        <FullScreenModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setViewingClient(null);
          }}
        >
          <ClientDetailView
            client={viewingClient}
            onClose={() => {
              setShowViewModal(false);
              setViewingClient(null);
            }}
            onEdit={() => {
              setEditingClient(viewingClient);
              setShowViewModal(false);
              setShowModal(true);
            }}
          />
        </FullScreenModal>
        
      )}
    </div>
  );
};

export default ClientPage;