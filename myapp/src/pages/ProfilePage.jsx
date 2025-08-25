import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, updateUserProfile, clearError } from '../redux/authSlice';
import { Pencil, User, Mail, Phone, Building, Shield, CheckCircle, XCircle,Check,X } from 'lucide-react';

import { PageLayout } from '../components/commons/PageLayout.jsx';
import { PageHeader } from '../components/commons/PageHeader.jsx';
import { Card } from '../components/commons/Card.jsx';
import { Grid } from '../components/commons/Grid.jsx';
import { LoadingSpinner } from '../components/commons/LoadingSpinner.jsx';
import { Button } from '../components/commons/Button.jsx';
import { ErrorMessage } from '../components/commons/ErrorMessage.jsx';
import { EditableField } from '../components/commons/EditableField.jsx';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, companyUsers, loading, error } = useSelector((state) => state.auth);
  const [editingField, setEditingField] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
  const [savingField, setSavingField] = useState(null);

  // Fetch user profile on component mount
  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, user]);

  // Initialize field values when user data changes
  useEffect(() => {
    if (user) {
      setFieldValues({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        role: user.role || '',
        is_active: user.is_active !== undefined ? user.is_active : false
      });
    }
  }, [user]);

  // Role options for select dropdown (cannot be degraded)
  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
    { value: 'viewer', label: 'Viewer' }
  ];

  // Get role hierarchy for validation
  const getRoleHierarchy = (role) => {
    const hierarchy = { admin: 4, manager: 3, employee: 2, viewer: 1 };
    return hierarchy[role] || 0;
  };

  // Filter role options to prevent degradation
  const getAvailableRoles = () => {
    const currentRoleLevel = getRoleHierarchy(user?.role);
    return roleOptions.filter(option => getRoleHierarchy(option.value) >= currentRoleLevel);
  };

  // Phone validation with country code detection
  const validatePhone = (phone) => {
    if (!phone) return { isValid: true, message: '' };
    
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      return { isValid: true, message: 'Valid US/Canada number' };
    } else if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return { isValid: true, message: 'Valid India number' };
    } else if (digitsOnly.startsWith('44') && (digitsOnly.length >= 12 && digitsOnly.length <= 13)) {
      return { isValid: true, message: 'Valid UK number' };
    } else if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return { isValid: true, message: 'Valid international number' };
    } else {
      return { isValid: false, message: 'Please enter a valid phone number with country code' };
    }
  };

  // Format phone number display
  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      return `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    } else if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return `+91 ${digitsOnly.slice(2, 7)}-${digitsOnly.slice(7)}`;
    }
    return phone;
  };

  // Field icons mapping
  const fieldIcons = {
    first_name: User,
    last_name: User,
    email: Mail,
    phone: Phone,
    role: Shield,
    company_name: Building,
    is_email_verified: CheckCircle,
    is_approved: CheckCircle,
    registered_admin: Shield,
    primary_admin: Shield,
    is_active: CheckCircle
  };

  // Handle field edit start
  const handleEditStart = (fieldName) => {
    setEditingField(fieldName);
    dispatch(clearError());
  };

  // Handle field value change
  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (fieldName === 'phone') {
      setPhoneValidation(validatePhone(value));
    }
  };

  // Handle field save
  const handleFieldSave = async (fieldName) => {
    const value = fieldValues[fieldName];
    
    // Validate phone before saving
    if (fieldName === 'phone') {
      const validation = validatePhone(value);
      if (!validation.isValid) {
        setPhoneValidation(validation);
        return;
      }
    }

    // Validate required fields
    if (['first_name', 'last_name'].includes(fieldName) && !value.trim()) {
      return;
    }

    setSavingField(fieldName);

    try {
      const updateData = { [fieldName]: value };
      
      const resultAction = await dispatch(updateUserProfile(updateData));
      
      if (updateUserProfile.fulfilled.match(resultAction)) {
        const updatedUser = { ...user, [fieldName]: value };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        await dispatch(fetchUserProfile());
        setEditingField(null);
        
        if (fieldName === 'phone') {
          setPhoneValidation({ isValid: true, message: '' });
        }
      } else {
        console.error('Update failed:', resultAction.payload);
      }
    } catch (err) {
      console.error('Update failed:', err);
    } finally {
      setSavingField(null);
    }
  };

  // Handle field cancel
  const handleFieldCancel = (fieldName) => {
    setFieldValues(prev => ({ 
      ...prev, 
      [fieldName]: user[fieldName] || '' 
    }));
    setEditingField(null);
    if (fieldName === 'phone') {
      setPhoneValidation({ isValid: true, message: '' });
    }
    dispatch(clearError());
  };

  // Handle toggle fields
  const handleToggle = async (fieldName) => {
    const newValue = !fieldValues[fieldName];
    setFieldValues(prev => ({ ...prev, [fieldName]: newValue }));
    setSavingField(fieldName);
    
    try {
      const updateData = { [fieldName]: newValue };
      
      const resultAction = await dispatch(updateUserProfile(updateData));
      
      if (updateUserProfile.fulfilled.match(resultAction)) {
        const updatedUser = { ...user, [fieldName]: newValue };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        await dispatch(fetchUserProfile());
      } else {
        setFieldValues(prev => ({ ...prev, [fieldName]: !newValue }));
      }
    } catch (err) {
      console.error('Toggle update failed:', err);
      setFieldValues(prev => ({ ...prev, [fieldName]: !newValue }));
    } finally {
      setSavingField(null);
    }
  };

  // Loading state
  if (loading && !user) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p style={{ color: "var(--color-muted)" }} className="text-lg">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // User not found state
  if (!loading && !user) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <XCircle size={48} className="mx-auto mb-4" style={{ color: "var(--color-error)" }} />
            <p style={{ color: "var(--color-muted)" }} className="text-lg">User not found</p>
            <Button 
              onClick={() => dispatch(fetchUserProfile())}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Profile"
        subtitle="Manage your account information"
        icon={User}
      />

      {error && <ErrorMessage message={error} className="mb-8" />}

    
        <Grid cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" gap="gap-6">
          {/* Editable Fields */}
          <EditableField
            fieldName="first_name"
            label="First Name"
            value={user.first_name}
            isEditing={editingField === 'first_name'}
            isSaving={savingField === 'first_name'}
            fieldValue={fieldValues.first_name !== undefined ? fieldValues.first_name : user.first_name}
            onEdit={handleEditStart}
            onChange={handleFieldChange}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            icon={fieldIcons.first_name}
            user={user}
          />

          <EditableField
            fieldName="last_name"
            label="Last Name"
            value={user.last_name}
            isEditing={editingField === 'last_name'}
            isSaving={savingField === 'last_name'}
            fieldValue={fieldValues.last_name !== undefined ? fieldValues.last_name : user.last_name}
            onEdit={handleEditStart}
            onChange={handleFieldChange}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            icon={fieldIcons.last_name}
            user={user}
          />

          <EditableField
            fieldName="phone"
            label="Phone Number"
            value={formatPhoneDisplay(user.phone)}
            isEditing={editingField === 'phone'}
            isSaving={savingField === 'phone'}
            fieldValue={fieldValues.phone !== undefined ? fieldValues.phone : user.phone}
            validation={phoneValidation}
            onEdit={handleEditStart}
            onChange={handleFieldChange}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            icon={fieldIcons.phone}
            user={user}
          />

          <EditableField
            fieldName="role"
            label="Role"
            value={user.role}
            isSelect={true}
            options={getAvailableRoles()}
            isEditing={editingField === 'role'}
            isSaving={savingField === 'role'}
            fieldValue={fieldValues.role !== undefined ? fieldValues.role : user.role}
            onEdit={handleEditStart}
            onChange={handleFieldChange}
            onSave={handleFieldSave}
            onCancel={handleFieldCancel}
            icon={fieldIcons.role}
            user={user}
          />

          {/* Read-only Fields */}
          <EditableField
            fieldName="email"
            label="Email Address"
            value={user.email}
            isReadOnly={true}
            icon={fieldIcons.email}
            user={user}
          />

          <EditableField
            fieldName="company_name"
            label="Company Name"
            value={user.company?.company_name}
            isReadOnly={true}
            icon={fieldIcons.company_name}
            user={user}
          />

          <EditableField
            fieldName="is_approved"
            label="Account Approved"
            value={user.is_approved ? 'Yes' : 'No'}
            isReadOnly={true}
            icon={fieldIcons.is_approved}
            user={user}
          />

          <EditableField
            fieldName="registered_admin"
            label="Registered Admin"
            value={user.registered_admin ? 'Yes' : 'No'}
            isReadOnly={true}
            icon={fieldIcons.registered_admin}
            user={user}
          />

          <EditableField
            fieldName="primary_admin"
            label="Primary Admin"
            value={user.primary_admin ? 'Yes' : 'No'}
            isReadOnly={true}
            icon={fieldIcons.primary_admin}
            user={user}
          />

          {/* Toggle Field */}
          <EditableField
            fieldName="is_active"
            label="Account Status"
            value={user.is_active}
            isToggle={true}
            isSaving={savingField === 'is_active'}
            fieldValue={fieldValues.is_active !== undefined ? fieldValues.is_active : user.is_active}
            onToggle={handleToggle}
            icon={fieldIcons.is_active}
            user={user}
          />
        </Grid>
    
    </PageLayout>
  );
};

export default ProfilePage;