import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { X, ChevronDown, Check, User, Users, Eye, Edit, Shield, Building, Calendar, MapPin, DollarSign, Target, FileText} from 'lucide-react';
import { createProject, updateProject } from './ProjectSlice';
import { MultiSelectDropdown } from './MultiselectDrop';
import { SingleSelectDropdown } from './SingleselectDrop';
import { ClientSelectDropdown } from './ClientSelectDropdown ';

const ProjectModal = ({ 
  isOpen, 
  onClose, 
  editingProject, 
  clients = [], 
  clientsLoading = false,
  users = [],
  usersLoading = false 
}) => {
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    projectName: '',
    client: '',
    projectHead: '',
    managers: [],
    reviewers: [],
    editors: [],
    viewers: [],
    description: '',
    quantity: '',
    unit: '',
    status: 'In Progress',
    isActive: true,
    startDate: '',
    endDate: '',
  
  });

  const [loading, setLoading] = useState(false);
const [dateError, setDateError] = useState('');

  // Status options
  const statusOptions = [
    { value: 'In Progress', label: 'In Progress', color: 'bg-blue-500' },
    { value: 'Completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'On Hold', label: 'On Hold', color: 'bg-yellow-500' },
  ];


  // Unit options
  const unitOptions = [
    'Count',
    'Square Kilometer',
    'Kilometer',
  ];

  // Filter users by admin and manager roles for Project Head dropdown
  const adminAndManagerUsers = users.filter(user => 
    user.role === 'admin' || user.role === 'manager'
  );

  
 

   // Date validation function
  const validateDates = (startDate, endDate) => {
    const errors = {};
    const today = new Date().toISOString().split('T')[0];
    
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        errors.endDate = 'End date must be after start date';
      }
    }
    
    if (startDate && new Date(startDate) < new Date(today)) {
      errors.startDate = 'Start date cannot be in the past';
    }
    
    return errors;
  };

  useEffect(() => {
    if (editingProject) {
      console.log('Editing project data:', editingProject);
      // Pre-fill form with existing project data
      setFormData({
        projectName: editingProject.project_name || editingProject.projectName || '',
        // Fixed: Use clientId for the dropdown value, not client name
        client: editingProject.clientId || editingProject.client || '',
        projectHead: editingProject.project_head || '',
        managers: editingProject.managers || [],
        reviewers: editingProject.reviewers || [],
        editors: editingProject.editors || [],
        viewers: editingProject.viewers || [],
        description: editingProject.description || '',
        quantity: editingProject.quantity || '',
        unit: editingProject.unit || '',
        status: editingProject.status || 'In Progress',
        isActive: editingProject.is_active !== undefined ? editingProject.is_active : true,
        startDate: editingProject.start_date || editingProject.startDate || '',
        endDate: editingProject.end_date || editingProject.endDate || '',
       
      
      });
    } else {
      // Reset form for new project
      setFormData({
        projectName: '',
        client: '',
        projectHead: '',
        managers: [],
        reviewers: [],
        editors: [],
        viewers: [],
        description: '',
        quantity: '',
        unit: '',
        status: 'In Progress',
        isActive: true,
        startDate: '',
        endDate: '',
      });
    }
  }, [editingProject]);

// Fixed handleSubmit function for ProjectModal.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Validate dates first
    const dateValidationErrors = validateDates(formData.startDate, formData.endDate);
    if (Object.keys(dateValidationErrors).length > 0) {
      setDateError(dateValidationErrors.endDate || dateValidationErrors.startDate);
      throw new Error(dateValidationErrors.endDate || dateValidationErrors.startDate);
    } else {
      setDateError('');
    }

    // Basic validation
    if (!formData.projectName.trim()) {
      throw new Error('Project name is required');
    }
    if (!formData.client) {
      throw new Error('Client selection is required');
    }

    // Clean and prepare the data
    const cleanedData = {
      project_name: formData.projectName.trim(),
      // Keep client as string if it's already a string, don't force parseInt
      client: formData.client,
      description: formData.description.trim(),
      status: formData.status,
      is_active: formData.isActive,
    };

    // Add optional fields only if they have values
    if (formData.projectHead) {
      cleanedData.project_head = formData.projectHead;
    }

    // Handle team arrays - only add if they have members
    if (formData.managers && formData.managers.length > 0) {
      cleanedData.managers = formData.managers.filter(m => m);
    }
    if (formData.reviewers && formData.reviewers.length > 0) {
      cleanedData.reviewers = formData.reviewers.filter(r => r);
    }
    if (formData.editors && formData.editors.length > 0) {
      cleanedData.editors = formData.editors.filter(e => e);
    }
    if (formData.viewers && formData.viewers.length > 0) {
      cleanedData.viewers = formData.viewers.filter(v => v);
    }

    // Handle numeric fields
    if (formData.quantity && !isNaN(parseFloat(formData.quantity))) {
      cleanedData.quantity = parseFloat(formData.quantity);
    }

    if (formData.unit) {
      cleanedData.unit = formData.unit;
    }

    // Handle dates
    if (formData.startDate) {
      cleanedData.start_date = formData.startDate;
    }
    if (formData.endDate) {
      cleanedData.end_date = formData.endDate;
    }

    console.log('Submitting cleaned data:', cleanedData);

    if (editingProject?.id) {
      // Update existing project
      const result = await dispatch(updateProject({ 
        projectId: editingProject.id, 
        projectData: cleanedData 
      })).unwrap();
      console.log('Update successful:', result);
    } else {
      // Create new project
      const result = await dispatch(createProject(cleanedData)).unwrap();
      console.log('Create successful:', result);
    }
    
    onClose();
  } catch (error) {
    console.error('Error saving project:', error);
    
    // Enhanced error handling
    let errorMessage = 'Failed to save project. Please try again.';
    
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Show user-friendly error message
    alert(errorMessage);
  } finally {
    setLoading(false);
  }
};

// Alternative data cleaning approach - try this if the above doesn't work
const alternativeHandleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // Basic validation
    if (!formData.projectName.trim()) {
      throw new Error('Project name is required');
    }
    if (!formData.client) {
      throw new Error('Client selection is required');
    }

    // Minimal payload approach - only send essential data
    const payload = {
      project_name: formData.projectName.trim(),
      client: formData.client, // Keep original format
      description: formData.description.trim() || '',
      status: formData.status || 'In Progress',
      is_active: formData.isActive !== undefined ? formData.isActive : true,
    };

    // Add optional fields one by one
    if (formData.projectHead) {
      payload.project_head = formData.projectHead;
    }

    // Send empty arrays as empty arrays, not null
    payload.managers = Array.isArray(formData.managers) ? formData.managers.filter(Boolean) : [];
    payload.reviewers = Array.isArray(formData.reviewers) ? formData.reviewers.filter(Boolean) : [];
    payload.editors = Array.isArray(formData.editors) ? formData.editors.filter(Boolean) : [];
    payload.viewers = Array.isArray(formData.viewers) ? formData.viewers.filter(Boolean) : [];

    if (formData.quantity && !isNaN(parseFloat(formData.quantity))) {
      payload.quantity = parseFloat(formData.quantity);
    }

    if (formData.unit) {
      payload.unit = formData.unit;
    }

    if (formData.startDate) {
      payload.start_date = formData.startDate;
    }

    if (formData.endDate) {
      payload.end_date = formData.endDate;
    }

    console.log('Alternative payload:', payload);

    if (editingProject?.id) {
      await dispatch(updateProject({ 
        projectId: editingProject.id, 
        projectData: payload 
      })).unwrap();
    } else {
      await dispatch(createProject(payload)).unwrap();
    }
    
    onClose();
  } catch (error) {
    console.error('Error saving project:', error);
    alert(error.message || 'Failed to save project. Please try again.');
  } finally {
    setLoading(false);
  }
};
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };


  // Helper function to get client name for display
  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.client_company_name || client.client_company || `Client ${client.id}`) : 'Unknown Client';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-8 py-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h2>
              <p className="text-slate-400 mt-1">
                {editingProject ? 'Update project details and team assignments' : 'Set up a new project with team members and timeline'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Project Overview */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Project Overview</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <FileText size={16} />
                  <span>Project Name *</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  placeholder="Enter project name"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Building size={16} />
                  <span>Client *</span>
                </label>
                {clientsLoading ? (
                  <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 animate-pulse">
                    Loading clients...
                  </div>
                ) : clients && clients.length > 0 ? (
                  <ClientSelectDropdown
                    options={clients}
                    selectedValue={formData.client}
                    onChange={handleInputChange}
                    placeholder="Search and select a client"
                    disabled={loading}
                    loading={clientsLoading}
                    required={true}
                  />
                ) : (
                  <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
                    No clients available. Please add clients first.
                  </div>
                )}
                {editingProject && formData.client && (
                  <p className="text-xs text-slate-400 mt-1">
                    Currently selected: {getClientName(formData.client)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                <FileText size={16} />
                <span>Description</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                disabled={loading}
                placeholder="Enter description or notes about the project..."
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Target size={16} />
                  <span>Quantity</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <span>Unit</span>
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  <option value="">Select unit</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <span>Status</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editingProject && (
              <div className="flex items-center space-x-3 p-4 bg-slate-800 rounded-xl">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-slate-300">Project is Active</span>
              </div>
            )}
          </div>

          {/* Team Assignment */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Team Assignment</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <User size={16} />
                  <span>Project Head (Admin/Manager Only)</span>
                </label>
                {usersLoading ? (
                  <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 animate-pulse">
                    Loading users...
                  </div>
                ) : adminAndManagerUsers.length > 0 ? (
                  <div className="space-y-2">
                    {/* Show current project head name if editing */}
                    {editingProject && editingProject.project_head_name && (
                      <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <p className="text-sm text-slate-300">
                          <span className="text-slate-400">Current Project Head:</span> {editingProject.project_head_name}
                        </p>
                      </div>
                    )}
                    <SingleSelectDropdown
                    options={adminAndManagerUsers}
                     selectedValue={formData.projectHead}
                 onChange={(value) => setFormData(prev => ({ ...prev, projectHead: value }))}
                 placeholder={editingProject ? "Change project head (optional)" : "Select project head"}
                  disabled={loading}
                loading={usersLoading}
               fallbackLabel={editingProject?.projectHeadName} // <-- HERE
/>

                  </div>
                ) : (
                  <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400">
                    No admin/manager users available
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Users size={16} />
                  <span>Managers</span>
                </label>
                <MultiSelectDropdown
                  options={users}
                  selectedValues={formData.managers}
                  onChange={(values) => setFormData(prev => ({ ...prev, managers: values }))}
                  placeholder="Search and select managers"
                  icon={Users}
                  disabled={loading}
                  loading={usersLoading}
                  displayKey="full_name"
                  valueKey="id"
                  searchKeys={['full_name', 'first_name', 'last_name', 'email']}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Shield size={16} />
                  <span>Reviewers</span>
                </label>
                <MultiSelectDropdown
                  options={users}
                  selectedValues={formData.reviewers}
                  onChange={(values) => setFormData(prev => ({ ...prev, reviewers: values }))}
                  placeholder="Search and select reviewers"
                  icon={Shield}
                  disabled={loading}
                  loading={usersLoading}
                  displayKey="full_name"
                  valueKey="id"
                  searchKeys={['full_name', 'first_name', 'last_name', 'email']}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Edit size={16} />
                  <span>Editors</span>
                </label>
                <MultiSelectDropdown
                  options={users}
                  selectedValues={formData.editors}
                  onChange={(values) => setFormData(prev => ({ ...prev, editors: values }))}
                  placeholder="Search and select editors"
                  icon={Edit}
                  disabled={loading}
                  loading={usersLoading}
                  displayKey="full_name"
                  valueKey="id"
                  searchKeys={['full_name', 'first_name', 'last_name', 'email']}
                />
              </div>

              <div className="lg:col-span-2 space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Eye size={16} />
                  <span>Viewers</span>
                </label>
                <MultiSelectDropdown
                  options={users}
                  selectedValues={formData.viewers}
                  onChange={(values) => setFormData(prev => ({ ...prev, viewers: values }))}
                  placeholder="Search and select viewers"
                  icon={Eye}
                  disabled={loading}
                  loading={usersLoading}
                  displayKey="full_name"
                  valueKey="id"
                  searchKeys={['full_name', 'first_name', 'last_name', 'email']}
                />
              </div>
            </div>
          </div>

          {/* Timeline & Budget */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Timeline & Budget</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Calendar size={16} />
                  <span>Start Date</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-slate-300">
                  <Calendar size={16} />
                  <span>End Date</span>
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                />
                {dateError && (
  <p className="text-sm text-red-500 mt-1">{dateError}</p>
)}

              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 transition-all duration-200 disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (clients.length === 0 && !editingProject)}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 font-medium shadow-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                editingProject ? 'Update Project' : 'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;