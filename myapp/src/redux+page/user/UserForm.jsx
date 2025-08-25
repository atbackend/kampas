import React, { useState,useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { XCircle, CheckCircle, Lock, Phone } from 'lucide-react';
import { createUserAsync } from './userSlice';


const UserForm = ({ editingUser = null, onSubmit, onCancel }) => {
  const dispatch = useDispatch();
  const { creating, error } = useSelector(state => state.users);

const [formData, setFormData] = useState({
  first_name: editingUser?.first_name || '',
  last_name: editingUser?.last_name || '',
  email: editingUser?.email || '',
  phone: editingUser?.phone || '',
  password: '',
  role: editingUser?.role || 'user',
  is_active: editingUser?.is_active !== undefined ? editingUser.is_active : true
});

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configuration for showing/hiding fields
  const showPassword = !editingUser; // Show password only when creating new user
  const showIconsForPrimaryAdmin = true; // You can control this based on your needs

  // Reset form when editingUser changes
 useEffect(() => {
  if (editingUser) {
    setFormData({
      first_name: editingUser.first_name || '',
      last_name: editingUser.last_name || '',
      email: editingUser.email || '',
      phone: editingUser.phone || '',
      password: '',
      role: editingUser.role || 'user',
      is_active: editingUser.is_active !== undefined ? editingUser.is_active : true
    });
  } else {
    // Reset to empty form for new user
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'user',
      is_active: true
    });
  }
  setErrors({});
}, [editingUser]);

const handleChange = (field, value) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }));

  // Live validation for phone field
  if (field === 'phone') {
    const trimmedPhone = value.trim();

    if (!trimmedPhone) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is required' }));
    } else if (!/^\+?\d{10,15}$/.test(trimmedPhone)) {
      setErrors(prev => ({ ...prev, phone: 'Phone number is invalid' }));
    } else {
      // Remove phone error if valid
      setErrors(prev => {
        const { phone, ...rest } = prev;
        return rest;
      });
    }
  } else if (errors[field]) {
    // Clear error for other fields on typing
    setErrors(prev => ({
      ...prev,
      [field]: null
    }));
  }
};


  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    // Last Name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

   if (formData.phone && !/^\+?\d{10,15}$/.test(formData.phone.trim())) {
  newErrors.phone = "Phone number is invalid";
}

    // Password validation (only when creating new user)
    if (showPassword && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (showPassword && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (isSubmitting) {
    return;
  }

  if (!validateForm()) {
    return;
  }

  setIsSubmitting(true);

  try {
    if (editingUser) {
      // Handle update case - only send changed fields
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active  // Changed from status to is_active
      };
      
      // Only include password if it's provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await onSubmit?.(updateData);
    } else {
      // Create new user - send all required fields
      const userData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        is_active: formData.is_active  // Changed from status to is_active
      };

      console.log('Submitting user data:', userData);

      const result = await dispatch(createUserAsync(userData));
      
      if (createUserAsync.fulfilled.match(result)) {
        // Reset form on successful creation
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          password: '',
          role: 'user',
          is_active: true  // Changed from status to is_active
        });
        setErrors({});
        
        onSubmit?.(result.payload);
      } else {
        console.error('Creation failed:', result.payload);
      }
    }
  } catch (error) {
    console.error('Error submitting form:', error);
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <div className="max-w-2xl mx-auto p-6">
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Error display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400 text-sm flex items-center">
              <XCircle size={16} className="mr-2" />
              {typeof error === 'string' ? error : JSON.stringify(error)}
            </p>
          </div>
        )}

        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              className={`w-full p-4 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                errors.first_name
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Enter first name"
              disabled={creating || isSubmitting}
            />
            {errors.first_name && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <XCircle size={16} className="mr-1" />
                {errors.first_name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              className={`w-full p-4 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                errors.last_name
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:ring-blue-500'
              }`}
              placeholder="Enter last name"
              disabled={creating || isSubmitting}
            />
            {errors.last_name && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <XCircle size={16} className="mr-1" />
                {errors.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full p-4 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
              errors.email 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-600 focus:ring-blue-500'
            }`}
            placeholder="Enter email address"
            disabled={creating || isSubmitting}
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-2 flex items-center">
              <XCircle size={16} className="mr-1" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Role *
          </label>
          <select
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value)}
            className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={creating || isSubmitting}
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="primary_admin">Primary Admin</option>
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Phone Number {formData.role === 'primary_admin' ? '*' : ''}
          </label>
          <div className="relative">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
             className={`w-full p-4 ${showIconsForPrimaryAdmin ? 'pl-11' : ''} bg-gray-800 border rounded-lg text-white focus:outline-none transition-colors 
  ${formData.phone && /^\+?\d{10,15}$/.test(formData.phone.trim())
    ? 'border-green-500 focus:ring-green-500'
    : errors.phone
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-600 focus:ring-blue-500'
  }`}
              placeholder="Enter phone number"
              disabled={creating || isSubmitting}
            />
            {showIconsForPrimaryAdmin && (
              <Phone className="absolute top-4 left-4 text-gray-400" size={18} />
            )}
          </div>
          {errors.phone && (
            <p className="text-red-400 text-sm mt-2 flex items-center">
              <XCircle size={16} className="mr-1" />
              {errors.phone}
            </p>
          )}
        </div>

        {/* Password - Only show when creating new user */}
        {showPassword && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Password *
            </label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className={`w-full p-4 pl-11 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 transition-colors ${
                  errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-600 focus:ring-blue-500"
                }`}
                placeholder="Enter password"
                disabled={creating || isSubmitting}
              />
              <Lock className="absolute top-4 left-4 text-gray-400" size={18} />
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-2 flex items-center">
                <XCircle size={16} className="mr-1" />
                {errors.password}
              </p>
            )}
          </div>
        )}

        {/* Status Toggle */}
    {editingUser && (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-3">
      Status
    </label>
    <div className="flex items-center space-x-3">
      <input
        type="checkbox"
        id="is_active"
        checked={formData.is_active}
        onChange={(e) => handleChange('is_active', e.target.checked)}
        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
        disabled={creating || isSubmitting}
      />
      <label htmlFor="is_active" className="text-sm text-gray-300 cursor-pointer">
        {formData.is_active ? 'Active' : 'Inactive'}
        <span className="ml-2 text-xs text-gray-400">
        {formData.is_active ? "User can access the system" : "User access is disabled"}
        </span>
      </label>
    </div>
  </div>
)}
<div>
</div>


        {/* Action Buttons */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={creating || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {creating || isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {editingUser ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              editingUser ? 'Update User' : 'Create User'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={creating || isSubmitting}
              className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default UserForm;