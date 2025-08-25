import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  User, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Search, 
  Filter,
  X,
  CheckCheck,
} from 'lucide-react';
import DataTable from '../commons/DataTable';
import FullScreenModal from '../commons/FullScreenModal';

import {
 
 updateUserAsync,
  setSearchTerm,
  setCurrentPage,
  setFilter,
  toggleFilterPanel,
  clearStatus,
  fetchUsersAsync
} from './userSlice.jsx';
import UserForm from './UserForm';
import PageHeader from '../commons/Header.jsx';

const UserPage = () => {
  const dispatch = useDispatch();
  
  const {
    users,
    creating,
    updating,
    loading,
    error,
    successMessage,
    searchTerm,
    currentPage,
    itemsPerPage,
    filter,
    showFilterPanel
  } = useSelector((state) => state.users);
  
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
const [isSaving, setIsSaving] = useState(false);

useEffect(() => {
  dispatch(fetchUsersAsync());
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

  // Handle form submission from UserForm
  const handleFormSubmit = async (userData) => {
    try {
      if (editingUser?.id) {
        // Update existing user
        const result = await dispatch(updateUserAsync({ 
          id: editingUser.id, 
          userData 
        }));
        
        if (updateUserAsync.fulfilled.match(result)) {
          setShowModal(false);
          setEditingUser(null);
        } else {
          // Handle update error
          console.error('Update failed:', result.payload);
        }
      } else {
        // For creating new user, the UserForm component handles the creation
        // We just need to close the modal when it's successful
        setShowModal(false);
        setEditingUser(null);
        console.log('User creation handled by UserForm');
      }
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  // Helper function to safely access user properties
  const getUserName = (user) => {
    const firstName = user?.firstName || user?.first_name || '';
    const lastName = user?.lastName || user?.last_name || '';
    return { firstName, lastName, fullName: `${firstName} ${lastName}`.trim() };
  };

  // Filter and pagination logic
  const filteredUsers = users.filter((user) => {
  if (!user) return false;
  
  const searchLower = searchTerm.toLowerCase();
  const { fullName } = getUserName(user);
  const email = user.email || '';
  const role = user.role || '';
  
  const matchesSearch = (
    fullName.toLowerCase().includes(searchLower) ||
    email.toLowerCase().includes(searchLower) ||
    role.toLowerCase().includes(searchLower)
  );

  // Fix: Use is_active consistently with fallback to status
  const userIsActive = user.is_active !== undefined ? user.is_active : user.status;
  const matchesStatus = filter.status === 'all' || 
    (filter.status === 'active' && userIsActive) ||
    (filter.status === 'inactive' && !userIsActive);

  const matchesRole = filter.role === 'all' || user.role === filter.role;

  return matchesSearch && matchesStatus && matchesRole;
});

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
      // Handle validation errors from API
      const errorMessages = [];
      Object.keys(error).forEach(key => {
        if (Array.isArray(error[key])) {
          errorMessages.push(`${key.replace('_', ' ')}: ${error[key].join(', ')}`);
        } else {
          errorMessages.push(`${key.replace('_', ' ')}: ${error[key]}`);
        }
      });
      return errorMessages.join('; ');
    }
    return 'An unknown error occurred';
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (_, user) => {
        if (!user) return <div>Invalid user data</div>;
        
        const { firstName, lastName } = getUserName(user);
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
        
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md">
              {initials || '?'}
            </div>
            <div>
              <div className="font-medium text-gray-200">
                {firstName} {lastName}
              </div>
              {user.phone && (
                <div className="text-sm text-gray-500">{user.phone}</div>
              )}
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
          <div>{email || 'No email'}</div>
        </div>
      )
    },

{
  key: 'role',
  header: 'Role',
  render: (role) => (
    <span className="text-xs font-medium px-3 py-1 rounded-full bg-white/15 text-white-200" >
      {role === 'primary_admin' ? 'Primary Admin' :
       role === 'admin' ? 'Admin' :
       role === 'manager' ? 'Manager' : 'User'}
    </span>
  )
},
{
  key: 'status',
  header: 'Status',
  render: (_, user) => (
    <div className="text-gray-300">
      <div className="flex items-center space-x-2">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400">
          {user.is_active && (
            <CheckCircle className="text-green-400 w-full h-full" />
          )}
        </div>
        <span className={user.is_active ? 'text-green-400' : 'text-red-400'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      {isSaving && (
        <span className="text-yellow-400 text-xs mt-1 block">
          Updating...
        </span>
      )}
    </div>
  )
},
    {
      key: 'actions',
      header: 'Actions',
      render: (_, user) => (
        <div className="ml-3.5">
          <button
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-500 transition-colors shadow-sm hover:shadow-md"
            onClick={() => {
              setEditingUser(user);
              setShowModal(true);
            }}
            title="Edit User"
          >
            <Edit size={16} />
          </button>
        </div>
      )
    }
  ];

   return (
    <div className="bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      {/* Main Content */}
      <div className={`flex-1 p-6 transition-all duration-300 ${showFilterPanel ? 'mr-80' : ''}`}>
        {/* Header */}
        <PageHeader
          icon={User}
          title="Users"
          subtitle="Manage your team members and their permissions"
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
              placeholder="Search users by name, email, or role..."
              value={searchTerm}
              onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2 font-medium"
              onClick={() => {
                setEditingUser(null);
                setShowModal(true);
              }}
            >
              <User size={18} />
              <span>Add User</span>
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

        {/* Content Container - This ensures consistent background */}
        <div className="bg-gray-400 rounded-lg">
          {/* Table */}
          <DataTable
            columns={tableColumns}
            data={paginatedUsers}
            loading={loading || creating || updating}
            emptyMessage={
              users.length === 0
                ? 'No users available. Try adding a new user.'
                : filteredUsers.length === 0
                  ? 'No users found matching your criteria'
                  : 'No users to display'
            }
            className="mb-6 bg-gray-800 rounded-lg"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 pb-4">
              <div className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-lg">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
      </div>

      {/* Right Side Filter Panel */}
      {showFilterPanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-gray-800 border-l border-gray-700 z-40 transition-transform duration-300 shadow-2xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Filters</h3>
              <button
                onClick={() => dispatch(toggleFilterPanel())}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Status
                </label>
                <select
                  value={filter.status}
                  onChange={(e) => dispatch(setFilter({ status: e.target.value }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Role
                </label>
                <select
                  value={filter.role}
                  onChange={(e) => dispatch(setFilter({ role: e.target.value }))}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                  <option value="primary_admin">Primary Admin</option>
                </select>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => dispatch(setFilter({ status: 'all', role: 'all' }))}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg font-medium"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      <FullScreenModal
        isOpen={showModal}
        onClose={handleCancel}
        title={editingUser ? 'Edit User' : 'Add New User'}
        icon={User}
        hideFooter={true}
      >
        <UserForm
          editingUser={editingUser}
          onSubmit={handleFormSubmit}
          onCancel={handleCancel}
        />
      </FullScreenModal>
    </div>
  );

};

export default UserPage;