import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Building2, 
  Edit3, 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Lock,
  Mail,
  Phone,
  User,
  Globe,
  MapPin,
  CreditCard,
  Briefcase,
  Shield
} from 'lucide-react';
import { 
  fetchCompanyAsync, 
  updateCompanyWithRefreshAsync  // FIXED: Use the correct thunk
} from './CompanyThunk';
import { clearStatus } from './CompanySlice';

const CompanyPage = () => {
  const dispatch = useDispatch();
  const { profile, loading, updating, error, successMessage } = useSelector(state => state.company);
  const { user } = useSelector(state => state.auth); // Get user from auth state
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    mobile_no: '',
    email: '',
    primary_address: '',
    contact_person: '',
    city: '',
    state: '',
    country: '',
    pin: '',
    website: '',
    licence_type: '',
    is_active: true
  });

  const licenseTypes = [
    { value: '', label: 'Select License Type' },
    { value: 'Professional', label: 'Professional' },
    { value: 'Individual', label: 'Individual' },
    { value: 'Enterprise', label: 'Enterprise' }
  ];

  // Check if user has admin role
  const isAdmin = user && user.role && user.role.toLowerCase() === 'admin';

  useEffect(() => {
    dispatch(fetchCompanyAsync());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      const newFormData = {
        company_name: profile.company_name || '',
        mobile_no: profile.mobile_no || '',
        email: profile.email || '',
        primary_address: profile.primary_address || '',
        contact_person: profile.contact_person || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        pin: profile.pin || '',
        website: profile.website || '',
        licence_type: profile.licence_type || '',
        is_active: profile.is_active !== undefined ? profile.is_active : true
      };
      
      setFormData(newFormData);
      console.log('Profile updated in component:', profile);
      console.log('Form data set to:', newFormData);
    }
  }, [profile]);

  // FIXED: Simplified success message handler
  useEffect(() => {
    if (successMessage) {
      setIsEditing(false);
      console.log('Update successful:', successMessage);
      
      const timer = setTimeout(() => {
        dispatch(clearStatus());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    console.log(`Field ${name} changed from "${formData[name]}" to "${newValue}"`);
  };

  // FIXED: Use the correct thunk that handles both update and refresh
  const handleSubmit = async () => {
    // Only allow submission if user is admin
    if (!isAdmin) {
      console.warn('Unauthorized: Only admin can update company profile');
      return;
    }

    const updateData = {
      mobile_no: formData.mobile_no,
      primary_address: formData.primary_address,
      contact_person: formData.contact_person,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      pin: formData.pin,
      website: formData.website,
      licence_type: formData.licence_type
    };
    
    console.log('Submitting update data:', updateData);

    try {
      // FIXED: Use updateCompanyWithRefreshAsync which handles both update and refresh
      const result = await dispatch(updateCompanyWithRefreshAsync(updateData));
      console.log('Update result:', result);
      
      // The success will be handled by the useEffect watching successMessage
      // No need to manually set editing state here
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        company_name: profile.company_name || '',
        mobile_no: profile.mobile_no || '',
        email: profile.email || '',
        primary_address: profile.primary_address || '',
        contact_person: profile.contact_person || '',
        city: profile.city || '',
        state: profile.state || '',
        country: profile.country || '',
        pin: profile.pin || '',
        website: profile.website || '',
        licence_type: profile.licence_type || '',
        is_active: profile.is_active !== undefined ? profile.is_active : true
      });
    }
    dispatch(clearStatus());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 flex items-center space-x-6 shadow-2xl">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
            <div className="absolute inset-0 h-12 w-12 animate-ping bg-blue-400/20 rounded-full"></div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white">Loading Profile</h3>
            <p className="text-slate-400">Fetching your company details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-700 relative">
      <div className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
                    <Building2 className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white leading-tight">
                    Company Profile
                  </h1>
                  <p className="text-slate-400 mt-1 text-lg">
                    {isAdmin 
                      ? "Manage your organization details and business information"
                      : "View your organization details and business information"
                    }
                  </p>
                </div>
              </div>
              
              {/* Only show edit button for admin users */}
              {!isEditing && isAdmin && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
                >
                  <Edit3 className="h-5 w-5" />
                  <span>Edit Profile</span>
                </button>
              )}

              {/* Show read-only indicator for non-admin users */}
              {!isAdmin && (
                <div className="flex items-center space-x-3 px-6 py-3 bg-amber-600/20 border border-amber-500/30 text-amber-300 rounded-lg">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Read Only</span>
                </div>
              )}
            </div>

            {/* Access Level Info for Non-Admin Users */}
            {!isAdmin && (
              <div className="mb-6 p-4 bg-amber-900/30 border border-amber-600/40 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-amber-300 font-semibold">Limited Access</h3>
                    <p className="text-amber-200 text-sm">
                      You can view company information but editing is restricted to administrators only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-xl flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="text-red-300 font-semibold">Error Occurred</h3>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-600/50 rounded-xl flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-green-300 font-semibold">Success!</h3>
                  <p className="text-green-200 text-sm">{successMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Company Overview Card */}
            <div className="xl:col-span-1">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl h-fit">
                <div className="p-6 bg-slate-700/50 border-b border-slate-600">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-slate-700 border border-slate-600 rounded-xl flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">{formData.company_name || 'Company Name'}</h2>
                    <div className="flex items-center justify-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${formData.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className={`text-sm font-medium ${formData.is_active ? 'text-green-300' : 'text-red-300'}`}>
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                    <CreditCard className="h-5 w-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">License Type</p>
                      <p className="text-white font-medium">{formData.licence_type || 'Not Set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="text-white font-medium break-all text-sm">{formData.email || 'Not Set'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                    <Phone className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Mobile</p>
                      <p className="text-white font-medium">{formData.mobile_no || 'Not Set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form Card */}
            <div className="xl:col-span-2">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                {/* Card Header */}
                <div className="p-6 bg-slate-700/50 border-b border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-slate-700 rounded-lg">
                        <Briefcase className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Company Information</h2>
                        <p className="text-slate-400 text-sm">
                          {isAdmin && isEditing ? "Update your business details" : "View business details"}
                        </p>
                      </div>
                    </div>
                    {isEditing && isAdmin && (
                      <button
                        onClick={handleCancel}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Content */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Company Name - Read Only */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        <span>Company Name</span>
                        <Lock className="h-3 w-3 text-amber-500" />
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.company_name}
                          readOnly
                          className="w-full px-4 py-3 bg-slate-700/50 border border-amber-500/30 rounded-lg text-white placeholder-slate-400 cursor-not-allowed opacity-75"
                          placeholder="Company name (Read-only)"
                        />
                      </div>
                    </div>

                    {/* Email - Read Only */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <Mail className="h-4 w-4 text-purple-400" />
                        <span>Email Address</span>
                        <Lock className="h-3 w-3 text-amber-500" />
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={formData.email}
                          readOnly
                          className="w-full px-4 py-3 bg-slate-700/50 border border-amber-500/30 rounded-lg text-white placeholder-slate-400 cursor-not-allowed opacity-75"
                          placeholder="Email address (Read-only)"
                        />
                      </div>
                    </div>

                    {/* License Type - Editable Dropdown (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <CreditCard className="h-4 w-4 text-cyan-400" />
                        <span>License Type</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <select
                        name="licence_type"
                        value={formData.licence_type}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                      >
                        {licenseTypes.map((license) => (
                          <option key={license.value} value={license.value} className="bg-slate-700">
                            {license.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phone Number - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <Phone className="h-4 w-4 text-green-400" />
                        <span>Mobile Number</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="tel"
                        name="mobile_no"
                        value={formData.mobile_no}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter mobile number"
                      />
                    </div>

                    {/* Contact Person - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <User className="h-4 w-4 text-orange-400" />
                        <span>Contact Person</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="text"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter contact person name"
                      />
                    </div>

                    {/* Website - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <Globe className="h-4 w-4 text-indigo-400" />
                        <span>Website</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="https://your-website.com"
                      />
                    </div>

                    {/* City - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <MapPin className="h-4 w-4 text-pink-400" />
                        <span>City</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter city name"
                      />
                    </div>

                    {/* State - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <MapPin className="h-4 w-4 text-yellow-400" />
                        <span>State</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter state name"
                      />
                    </div>

                    {/* Country - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <Globe className="h-4 w-4 text-cyan-400" />
                        <span>Country</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter country name"
                      />
                    </div>

                    {/* PIN Code - Editable (only for admin in edit mode) */}
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                        <MapPin className="h-4 w-4 text-red-400" />
                        <span>PIN Code</span>
                        {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                      </label>
                      <input
                        type="text"
                        name="pin"
                        value={formData.pin}
                        onChange={handleInputChange}
                        disabled={!isEditing || !isAdmin}
                        maxLength="6"
                        pattern="[0-9]{6}"
                        className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                        }`}
                        placeholder="Enter 6-digit PIN code"
                      />
                    </div>
                  </div>

                  {/* Primary Address - Full Width (only editable for admin in edit mode) */}
                  <div className="mt-6 space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <span>Primary Address</span>
                      {!isAdmin && <Lock className="h-3 w-3 text-amber-500" />}
                    </label>
                    <textarea
                      name="primary_address"
                      value={formData.primary_address}
                      onChange={handleInputChange}
                      disabled={!isEditing || !isAdmin}
                      rows={4}
                      className={`w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none ${
                        (!isEditing || !isAdmin) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-600'
                      }`}
                      placeholder="Enter complete business address with landmarks"
                    />
                  </div>

                  {/* Status Display - Read Only */}
                  <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <div>
                          <h3 className="text-white font-semibold">Company Status</h3>
                          <p className="text-slate-400 text-sm">Current operational status</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-amber-500" />
                        <span className={`px-3 py-1 rounded-lg font-medium text-sm ${
                          formData.is_active 
                            ? 'bg-green-900/50 text-green-300 border border-green-600/50' 
                            : 'bg-red-900/50 text-red-300 border border-red-600/50'
                        }`}>
                          {formData.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Only show for admin users */}
                  {isEditing && isAdmin && (
                    <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-slate-600">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all duration-200 font-medium"
                      >
                        Cancel Changes
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={updating}
                        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed font-medium"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-5 w-5" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;