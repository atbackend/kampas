import React from 'react';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Edit, 
  CheckCircle, 
  XCircle,
  Calendar,
  Clock,
  X
} from 'lucide-react';

const ClientDetailView = ({ client, onClose, onEdit }) => {
  if (!client) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="bg-gray-900 p-8 rounded-lg">
          <p className="text-gray-400">No client data available</p>
        </div>
      </div>
    );
  }

  const getClientDetails = (client) => {
    // Normalize data from different possible property names
    const companyName = client?.client_company_name || client?.company_name || client?.companyName || '';
    const primaryContact = client?.contact_person || client?.primary_contact || client?.primaryContact || '';
    const phone = client?.primary_contact_number || client?.phone || '';
    const secondaryPhone = client?.secondary_contact_number || client?.secondary_phone || '';
    const email = client?.email || '';
    const address = client?.address || '';
    const city = client?.city || '';
    const state = client?.state || '';
    const pin = client?.pin || '';
    const country = client?.country || '';
    const clientType = client?.client_type || client?.clientType || 'Individual';
    const isActive = client?.is_active !== undefined ? client.is_active : (client?.status !== undefined ? client.status : true);
    const createdAt = client?.created_at || client?.createdAt;
    const updatedAt = client?.updated_at || client?.updatedAt;
    const description = client?.description || '';
    const createdBy = client?.created_by || client?.createdBy || '';

    return {
      companyName,
      primaryContact,
      phone,
      secondaryPhone,
      email,
      address,
      city,
      state,
      pin,
      country,
      clientType,
      isActive,
      createdAt,
      updatedAt,
      description,
      createdBy
    };
  };

  const clientDetails = getClientDetails(client);

  const getClientTypeDisplay = (type) => {
    const types = {
      individual: 'Individual',
      business: 'Business',
      enterprise: 'Enterprise',
      government: 'Government',
      Individual: 'Individual',
      Business: 'Business',
      Enterprise: 'Enterprise',
      Government: 'Government'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatAddress = () => {
    const addressParts = [
      clientDetails.address,
      clientDetails.city,
      clientDetails.state,
      clientDetails.pin,
      clientDetails.country
    ].filter(part => part && part.trim() !== '');
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'Not provided';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col bg-gray-900 shadow-2xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Company Avatar */}
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
                {clientDetails.companyName.split(' ').map(word => word[0] || '').join('').toUpperCase().slice(0, 2) || '?'}
              </div>
              
              <div>
                <h1 className="text-2xl font-semibold text-white">{clientDetails.companyName || 'No Company Name'}</h1>
                <p className="text-gray-400">Client ID: #{client.id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Edit Button */}
              <button
                onClick={() => onEdit(client)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Edit Client</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto">
            {/* Status and Type Badges */}
            <div className="flex items-center space-x-3 mb-8">
              <div className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium ${
                clientDetails.isActive 
                  ? 'bg-green-900/30 text-green-400 border border-green-700' 
                  : 'bg-red-900/30 text-red-400 border border-red-700'
              }`}>
                {clientDetails.isActive ? (
                  <CheckCircle size={16} className="mr-2" />
                ) : (
                  <XCircle size={16} className="mr-2" />
                )}
                {clientDetails.isActive ? 'Active' : 'Inactive'}
              </div>
              
              <div className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 border border-gray-700">
                {getClientTypeDisplay(clientDetails.clientType)}
              </div>
            </div>

            {/* Main Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Contact Information */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <User size={20} className="mr-3 text-blue-400" />
                  Contact Information
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Primary Contact</label>
                    <p className="text-white text-lg">{clientDetails.primaryContact || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Email Address</label>
                    <div className="flex items-center space-x-3">
                      <Mail size={18} className="text-gray-400" />
                      <p className="text-white text-lg">{clientDetails.email || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Primary Phone</label>
                    <div className="flex items-center space-x-3">
                      <Phone size={18} className="text-gray-400" />
                      <p className="text-white text-lg">{clientDetails.phone || 'Not provided'}</p>
                    </div>
                  </div>

                  {clientDetails.secondaryPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 block mb-2">Secondary Phone</label>
                      <div className="flex items-center space-x-3">
                        <Phone size={18} className="text-gray-400" />
                        <p className="text-white text-lg">{clientDetails.secondaryPhone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Details */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <Building2 size={20} className="mr-3 text-green-400" />
                  Company Details
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Company Name</label>
                    <p className="text-white text-lg">{clientDetails.companyName || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Client Type</label>
                    <p className="text-white text-lg">{getClientTypeDisplay(clientDetails.clientType)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Status</label>
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${clientDetails.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className={`text-lg font-medium ${clientDetails.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {clientDetails.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {clientDetails.createdBy && (
                    <div>
                      <label className="text-sm font-medium text-gray-400 block mb-2">Created By</label>
                      <p className="text-white text-lg">{clientDetails.createdBy}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <MapPin size={20} className="mr-3 text-purple-400" />
                Address Information
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium text-gray-400 block mb-2">Full Address</label>
                  <div className="flex items-start space-x-3">
                    <MapPin size={18} className="text-gray-400 mt-1" />
                    <p className="text-white text-lg leading-relaxed">{formatAddress()}</p>
                  </div>
                </div>
                
                {clientDetails.address && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Street Address</label>
                    <p className="text-white">{clientDetails.address}</p>
                  </div>
                )}
                
                {clientDetails.city && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">City</label>
                    <p className="text-white">{clientDetails.city}</p>
                  </div>
                )}
                
                {clientDetails.state && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">State</label>
                    <p className="text-white">{clientDetails.state}</p>
                  </div>
                )}
                
                {clientDetails.pin && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">PIN Code</label>
                    <p className="text-white">{clientDetails.pin}</p>
                  </div>
                )}
                
                {clientDetails.country && (
                  <div>
                    <label className="text-sm font-medium text-gray-400 block mb-2">Country</label>
                    <p className="text-white">{clientDetails.country}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Description Section */}
            {clientDetails.description && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <FileText size={20} className="mr-3 text-purple-400" />
                  Description & Notes
                </h2>
                <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">
                  {clientDetails.description}
                </p>
              </div>
            )}

            {/* Metadata Section */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Clock size={20} className="mr-3 text-orange-400" />
                System Information
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-2">Created Date</label>
                  <div className="flex items-center space-x-3">
                    <Calendar size={18} className="text-gray-400" />
                    <p className="text-white">{formatDate(clientDetails.createdAt)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-400 block mb-2">Last Updated</label>
                  <div className="flex items-center space-x-3">
                    <Clock size={18} className="text-gray-400" />
                    <p className="text-white">{formatDate(clientDetails.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 px-8 py-6 border-t border-gray-700 bg-gray-900">
          <div className="flex justify-end space-x-4 max-w-6xl mx-auto">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center space-x-2"
            >
              <X size={16} />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailView;