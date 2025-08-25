import React, { useState, useEffect } from 'react';
const {
    users,
    loading,
    error,
    successMessage,
    searchTerm,
    currentPage,
    itemsPerPage,
    filter,
    showFilterPanel
  } = useSelector((state) => state.users); 
  import { useDispatch, useSelector } from 'react-redux';
  
export const UserModal = ({ isOpen, onClose, onSave, editingUser }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'user',
    status: true
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingUser) {
      setFormData({
        firstName: editingUser.firstName || '',
        lastName: editingUser.lastName || '',
        email: editingUser.email || '',
        role: editingUser.role || 'user',
        status: editingUser.status ?? true
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'user',
        status: true
      });
    }
    setErrors({});
  }, [editingUser]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white w-full h-full overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800">
          <h2 className="text-2xl font-semibold flex items-center space-x-3">
            <User className="text-blue-400" size={28} />
            <span>{editingUser ? 'Edit User' : 'Add New User'}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={`w-full p-3 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${
                    errors.firstName 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={`w-full p-3 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${
                    errors.lastName 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-blue-500'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full p-3 bg-gray-700 border rounded-md text-white focus:outline-none focus:ring-2 ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-blue-500'
                }`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => handleChange('status', !formData.status)}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {formData.status ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <XCircle className="text-red-400" size={20} />
                  )}
                </button>
                <span className="text-sm text-gray-300">
                  {formData.status ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center p-6 gap-4 border-t border-gray-700 bg-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {editingUser ? 'Update User' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
};