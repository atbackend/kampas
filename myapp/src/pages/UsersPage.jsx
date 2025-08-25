import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, updateUserProfile, clearError } from '../redux/authSlice';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, companyUsers, loading, error } = useSelector((state) => state.auth);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: ''
  });

  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (user) {
      console.log('User data updated:', user);
      setFormData(prevFormData => ({
        ...prevFormData,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || ''
      }));
    }
  }, [user]);

  const handleEditClick = (field) => {
    setEditingField(field);
    setIsModalOpen(true);
    dispatch(clearError());
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    // Client-side validation
    const fieldValue = formData[editingField]?.trim();
    
    if (!fieldValue) {
      return; // Don't submit if field is empty
    }

    // For role field, you might want to validate against allowed roles
    if (editingField === 'role' && fieldValue === '') {
      return;
    }

    try {
      // Only send the specific field being edited, not all fields
      const updateData = {
        [editingField]: fieldValue
      };
      
      console.log('Updating field:', editingField, 'with value:', fieldValue);
      const result = await dispatch(updateUserProfile(updateData)).unwrap();
      console.log('Update result:', result);
      
      // Refresh the profile data to ensure we have the latest data
      await dispatch(fetchUserProfile());
      
      setIsModalOpen(false);
      setEditingField('');
    } catch (error) {
      console.error('Update failed:', error);
      // Error will be displayed from Redux state
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingField('');
    // Reset form data to original user data
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || ''
      });
    }
    dispatch(clearError());
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-300">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-300">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400 mt-2">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-white">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">First Name</label>
              <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                <span className="text-white">{user.first_name || 'Not provided'}</span>
                <button
                  onClick={() => handleEditClick('first_name')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Last Name</label>
              <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                <span className="text-white">{user.last_name || 'Not provided'}</span>
                <button
                  onClick={() => handleEditClick('last_name')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Email</label>
              <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                <span className="text-white">{user.email || 'Not provided'}</span>
                <button
                  onClick={() => handleEditClick('email')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Role</label>
              <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                <span className="text-white">{user.role || 'Not provided'}</span>
                <button
                  onClick={() => handleEditClick('role')}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Company Users Section */}
        {companyUsers && companyUsers.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-white">Company Users</h2>
            <div className="space-y-3">
              {companyUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                  <div>
                    <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                    <p className="text-gray-400 text-sm">{user.role}</p>
                  </div>
                  <div className="text-gray-500 text-sm">
                    ID: {user.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Edit {editingField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {editingField.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                {editingField === 'role' ? (
                  <select
                    name={editingField}
                    value={formData[editingField]}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a role</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="employee">Employee</option>
                    <option value="viewer">Viewer</option>
                  </select>
                ) : (
                  <input
                    type={editingField === 'email' ? 'email' : 'text'}
                    name={editingField}
                    value={formData[editingField]}
                    onChange={handleInputChange}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder={`Enter ${editingField.replace('_', ' ')}`}
                    required
                  />
                )}
              </div>

              {error && (
                <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
                  <div className="text-sm">
                    {typeof error === 'string' ? (
                      <p>{error}</p>
                    ) : error && typeof error === 'object' ? (
                      Object.entries(error).map(([field, messages]) => (
                        <div key={field}>
                          <strong>{field.replace('_', ' ')}:</strong>
                          {Array.isArray(messages) ? (
                            <ul className="list-disc list-inside ml-2">
                              {messages.map((msg, idx) => (
                                <li key={idx}>{msg}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="ml-1">{messages}</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p>An error occurred while updating</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData[editingField]?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;