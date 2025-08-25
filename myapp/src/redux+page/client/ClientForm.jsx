import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Building2, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Save, 
  X, 
  XCircle, 
  Search,
  ChevronDown ,
  Plus 
} from 'lucide-react';

const ClientForm = ({ editingClient, onSubmit, onCancel }) => {
  const dispatch = useDispatch();
  const { creating, updating, error } = useSelector((state) => state.clients);
  const { clients } = useSelector((state) => state.clients); // For company search

  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    primary_contact: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    country: '',
    client_type: 'individual',
    description: '',
    status: true
  });

  const [validationErrors, setValidationErrors] = useState({});
  
  // Company search state
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [hasSelectedFromDropdown, setHasSelectedFromDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (editingClient) {
      console.log('🔄 Setting form data for editing:', editingClient);
      setFormData({
        client_company: editingClient.client_details?.client_company || '',
        company_name: editingClient.company_name || editingClient.companyName || editingClient.client_company_name || '',
        email: editingClient.email || '',
        primary_contact: editingClient.primary_contact || editingClient.primaryContact || editingClient.contact_person || '',
        phone: editingClient.phone || editingClient.primary_contact_number || '',
        address: editingClient.address || '',
        city: editingClient.city || '',
        state: editingClient.state || '',
        pin: editingClient.pin || '',
        country: editingClient.country || '',
        client_type: (editingClient.client_type || editingClient.clientType || 'individual').toLowerCase(),
        description: editingClient.description || '',
        status: editingClient.status !== undefined 
          ? editingClient.status 
          : editingClient.is_active !== undefined 
            ? editingClient.is_active 
            : true
      });
      setHasSelectedFromDropdown(false);
    } else {
      console.log('🔄 Resetting form for new client');
      setFormData({
        company_name: '',
        email: '',
        primary_contact: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        country: '',
        client_type: 'individual',
        description: '',
        status: true,
      });
      setHasSelectedFromDropdown(false);
    }
    setValidationErrors({});
  }, [editingClient]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

 const handleInputChange = (e) => {
  const { name, value, type, checked } = e.target;
  
  console.log('🔄 Input change:', { name, value, type, checked });
  
  setFormData(prev => ({
    ...prev,
    [name]: type === 'checkbox' ? checked : value
  }));

  // FIXED: Enhanced company name search logic
  if (name === 'company_name') {
    // Reset the selection flag when user manually types
    setHasSelectedFromDropdown(false);
    
    // Show dropdown when typing in company name field and has 2+ characters
    // Removed the restriction that hides dropdown for exact matches
    if (value.length >= 2) {
      setShowCompanyDropdown(true);
    } else {
      setShowCompanyDropdown(false);
    }
  }

  // Live validation for phone field
  if (name === 'phone') {
    const trimmedPhone = value.trim();
    
    if (!trimmedPhone) {
      // Phone is optional, so clear error if empty
      setValidationErrors(prev => {
        const { phone, ...rest } = prev;
        return rest;
      });
    } else if (!/^[\+]?[\d\s\-\(\)]{10,}$/.test(trimmedPhone)) {
      setValidationErrors(prev => ({ 
        ...prev, 
        phone: 'Please enter a valid phone number (minimum 10 digits)' 
      }));
    } else {
      // Remove phone error if valid
      setValidationErrors(prev => {
        const { phone, ...rest } = prev;
        return rest;
      });
    }
    return; // Exit early to prevent generic clearing logic
  }

  // Live validation for PIN code field
  if (name === 'pin') {
    const trimmedPin = value.trim();
    
    if (!trimmedPin) {
      // PIN is optional, so clear error if empty
      setValidationErrors(prev => {
        const { pin, ...rest } = prev;
        return rest;
      });
    } else if (!/^\d{4,10}$/.test(trimmedPin)) {
      setValidationErrors(prev => ({ 
        ...prev, 
        pin: 'PIN code should contain only numbers (4-10 digits)' 
      }));
    } else {
      // Remove PIN error if valid
      setValidationErrors(prev => {
        const { pin, ...rest } = prev;
        return rest;
      });
    }
    return; // Exit early to prevent generic clearing logic
  }

  // Generic validation clearing for other fields
  if (validationErrors[name]) {
    setValidationErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  }
};

  // FIXED: Improved company filtering logic
  const filteredCompanies = React.useMemo(() => {
    if (formData.company_name.length < 2 || hasSelectedFromDropdown) {
      return [];
    }
    
    return clients.filter(client => {
      const companyName = client.company_name || client.companyName || client.client_company_name || '';
      const searchTerm = formData.company_name.toLowerCase().trim();
      const clientCompanyName = companyName.toLowerCase().trim();
      
      // Include both partial matches and exact matches
      // This ensures dropdown shows even when user types the complete name
      return clientCompanyName.includes(searchTerm) && clientCompanyName !== '';
    }).slice(0, 10); // Limit to 10 results
  }, [clients, formData.company_name, hasSelectedFromDropdown]);

  const handleCompanySelect = (company) => {
    const companyName = company.company_name || company.companyName || company.client_company_name || '';
    setFormData(prev => ({
      ...prev,
      company_name: companyName
    }));
    setShowCompanyDropdown(false);
    setHasSelectedFromDropdown(true); // Mark as selected from dropdown
    
    // Clear validation error if exists
    if (validationErrors.company_name) {
      setValidationErrors(prev => ({
        ...prev,
        company_name: ''
      }));
    }
  };

  const handleSearchIconClick = () => {
    if (formData.company_name.length >= 2) {
      setHasSelectedFromDropdown(false); // Allow showing dropdown again
      setShowCompanyDropdown(!showCompanyDropdown);
    }
  };

  // FIXED: Enhanced validation with better error messages
  const validateForm = () => {
    const errors = {};

    if (!formData.company_name.trim()) {
      errors.company_name = 'Company name is required';
    } else if (formData.company_name.trim().length < 2) {
      errors.company_name = 'Company name must be at least 2 characters long';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.primary_contact.trim()) {
      errors.primary_contact = 'Primary contact is required';
    } else if (formData.primary_contact.trim().length < 2) {
      errors.primary_contact = 'Primary contact must be at least 2 characters long';
    }

    if (formData.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number (minimum 10 digits)';
    }

    // Additional validation for PIN code
    if (formData.pin && !/^\d{4,10}$/.test(formData.pin)) {
      errors.pin = 'PIN code should contain only numbers (4-10 digits)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('❌ Form validation failed:', validationErrors);
      // Show first validation error
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        // You can show a toast or alert here
        console.error('Validation Error:', firstError);
      }
      return;
    }

    try {
      console.log('📝 Form Submit: Submitting data:', formData);
      await onSubmit(formData);
    } catch (error) {
      console.error('❌ Error in form submission:', error);
    }
  };

  const isLoading = creating || updating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full h-full max-w-7xl mx-auto flex flex-col bg-gray-900 shadow-2xl">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-gray-700 bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">
              {editingClient ? 'Edit Client' : 'Create New Client'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Display API errors */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <XCircle size={20} className="mr-2" />
                <div>
                  <div className="font-medium">Error occurred:</div>
                  <div className="text-sm mt-1">
                    {typeof error === 'string' ? error : error.message || 'An error occurred'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Name with Search */}
              <div className="lg:col-span-2 relative" ref={dropdownRef}>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <Building2 size={16} className="mr-2" />
                  Client Company Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                      validationErrors.company_name 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="Enter company name (minimum 2 characters)"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleSearchIconClick}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 transition-colors ${
                      formData.company_name.length >= 2 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={isLoading || formData.company_name.length < 2}
                    title={formData.company_name.length < 2 ? 'Type at least 2 characters to search' : 'Search companies'}
                  >
                    <Search size={16} />
                  </button>
                </div>
                
                {/* Company Search Dropdown */}
                {showCompanyDropdown && formData.company_name.length >= 2 && !hasSelectedFromDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-64 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCompanies.length > 0 ? (
                        <>
                          {/* Header showing search info */}
                          <div className="px-4 py-2 bg-gray-700 border-b border-gray-600">
                            <div className="text-xs text-gray-300">
                              Found {filteredCompanies.length} matching companies
                            </div>
                          </div>
                          
                          {filteredCompanies.map((company) => {
                            const companyName = company.company_name || company.companyName || company.client_company_name || '';
                            return (
                              <button
                                key={company.id}
                                type="button"
                                onClick={() => handleCompanySelect(company)}
                                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors text-white border-b border-gray-700 last:border-b-0"
                              >
                                <div className="flex items-center">
                                  <Building2 size={16} className="mr-3 text-gray-400" />
                                  <div>
                                    <div className="font-medium">{companyName}</div>
                                    <div className="text-sm text-gray-400">
                                      {company.email || 'No email'} • {company.client_type || company.clientType || 'Individual'}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                          
                          {/* Option to use current input as new company */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompanyDropdown(false);
                              setHasSelectedFromDropdown(true);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors text-blue-400 border-t border-gray-600"
                          >
                            <div className="flex items-center">
                              <Plus size={16} className="mr-3" />
                              <div>
                                <div className="font-medium">Create new: "{formData.company_name}"</div>
                                <div className="text-sm text-gray-400">
                                  Use current input as new company name
                                </div>
                              </div>
                            </div>
                          </button>
                        </>
                      ) : (
                        <div className="px-4 py-3">
                          <div className="text-gray-400 text-center mb-3">
                            No matching companies found
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCompanyDropdown(false);
                              setHasSelectedFromDropdown(true);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors text-blue-400 rounded"
                          >
                            <div className="flex items-center">
                              <Plus size={16} className="mr-3" />
                              <div>
                                <div className="font-medium">Create new: "{formData.company_name}"</div>
                                <div className="text-sm text-gray-400">
                                  Use current input as new company name
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {validationErrors.company_name && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <XCircle size={16} className="mr-1" />
                    {validationErrors.company_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <Mail size={16} className="mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    validationErrors.email 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter email address"
                  disabled={isLoading}
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <XCircle size={16} className="mr-1" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Primary Contact */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <User size={16} className="mr-2" />
                  Primary Contact *
                </label>
                <input
                  type="text"
                  name="primary_contact"
                  value={formData.primary_contact}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-colors ${
                    validationErrors.primary_contact 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter primary contact name"
                  disabled={isLoading}
                />
                {validationErrors.primary_contact && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <XCircle size={16} className="mr-1" />
                    {validationErrors.primary_contact}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <Phone size={16} className="mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                className={`w-full p-4 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors
          ${formData.phone && /^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phone.trim())
            ? 'border-green-500 focus:ring-green-500'
            : validationErrors.phone
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-600 focus:ring-blue-500'
          }`}
                  placeholder="Enter phone number"
                   disabled={creating || updating}
                />
                {validationErrors.phone && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <XCircle size={16} className="mr-1" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>

              {/* Client Type */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <Building2 size={16} className="mr-2" />
                  Client Type
                </label>
                <div className="relative">
                  <select
                    name="client_type"
                    value={formData.client_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none"
                    disabled={isLoading}
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                 
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* Address */}
              <div className="lg:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <MapPin size={16} className="mr-2" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Enter street address"
                  disabled={isLoading}
                />
              </div>

              {/* City */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <MapPin size={16} className="mr-2" />
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Enter city"
                  disabled={isLoading}
                />
              </div>

              {/* State */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <MapPin size={16} className="mr-2" />
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Enter state"
                  disabled={isLoading}
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <MapPin size={16} className="mr-2" />
                  PIN Code
                </label>
                <input
                  type="text"
                  name="pin"
                  value={formData.pin}
                  onChange={handleInputChange}
                 className={`w-full p-4 bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors
          ${formData.pin && /^\d{4,10}$/.test(formData.pin.trim())
            ? 'border-green-500 focus:ring-green-500'
            : validationErrors.pin
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-600 focus:ring-blue-500'
          }`}
        placeholder="Enter PIN code"
        disabled={creating || updating}
                />
                {validationErrors.pin && (
                  <p className="text-red-400 text-sm mt-2 flex items-center">
                    <XCircle size={16} className="mr-1" />
                    {validationErrors.pin}
                  </p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <MapPin size={16} className="mr-2" />
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Enter country"
                  disabled={isLoading}
                />
              </div>

              {/* Description */}
              <div className="lg:col-span-2">
                <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                  <FileText size={16} className="mr-2" />
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-vertical"
                  placeholder="Enter description or notes about the client"
                  disabled={isLoading}
                />
              </div>

              {/* Created By - Read Only Field for Edit Mode */}
              {editingClient && (
                <div className="lg:col-span-2">
                  <label className="flex items-center text-sm font-medium text-gray-300 mb-3">
                    <User size={16} className="mr-2" />
                    Created By
                  </label>
                  <input
                    type="text"
                    value={editingClient.created_by || editingClient.createdBy || 'Unknown'}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                    disabled
                    readOnly
                  />
                </div>
              )}

              {/* Status */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      name="status"
                      id="status"
                      checked={formData.status}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      disabled={isLoading}
                    />
                    <div>
                      <label htmlFor="status" className="text-sm font-medium text-gray-300 cursor-pointer">
                        Active Status
                      </label>
                      <div className="text-xs text-gray-400 mt-1">
                        {formData.status 
                          ? 'This client is currently active and can receive services' 
                          : 'This client is inactive and will not receive services'
                        }
                      </div>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${formData.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 px-8 py-6 border-t border-gray-700 bg-gray-900">
          <div className="flex justify-end space-x-4 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium flex items-center space-x-2"
              disabled={isLoading}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              <Save size={16} />
              <span>
                {isLoading 
                  ? (editingClient ? 'Updating...' : 'Creating...') 
                  : (editingClient ? 'Update Client' : 'Create Client')
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientForm;