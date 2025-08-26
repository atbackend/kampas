const ProfilePage = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [editingField, setEditingField] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, message: '' });
  const [savingField, setSavingField] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!user) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, user]);

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

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
    { value: 'viewer', label: 'Viewer' }
  ];

  const getRoleHierarchy = (role) => {
    const hierarchy = { admin: 4, manager: 3, employee: 2, viewer: 1 };
    return hierarchy[role] || 0;
  };

  const getAvailableRoles = () => {
    const currentRoleLevel = getRoleHierarchy(user?.role);
    return roleOptions.filter(option => getRoleHierarchy(option.value) >= currentRoleLevel);
  };

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

  const handleEditStart = (fieldName) => {
    setEditingField(fieldName);
    dispatch(clearError());
  };

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (fieldName === 'phone') {
      setPhoneValidation(validatePhone(value));
    }
  };

  const handleFieldSave = async (fieldName) => {
    const value = fieldValues[fieldName];
    
    if (fieldName === 'phone') {
      const validation = validatePhone(value);
      if (!validation.isValid) {
        setPhoneValidation(validation);
        addToast('Please enter a valid phone number', 'error');
        return;
      }
    }

    if (['first_name', 'last_name'].includes(fieldName) && !value.trim()) {
      addToast(`${fieldName.replace('_', ' ')} is required`, 'error');
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
        
        addToast(`${fieldName.replace('_', ' ')} updated successfully!`, 'success');
      } else {
        addToast('Failed to update field. Please try again.', 'error');
      }
    } catch (err) {
      addToast('An error occurred while updating. Please try again.', 'error');
    } finally {
      setSavingField(null);
    }
  };

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
        addToast(`Account ${newValue ? 'activated' : 'deactivated'} successfully!`, 'success');
      } else {
        setFieldValues(prev => ({ ...prev, [fieldName]: !newValue }));
        addToast('Failed to update status. Please try again.', 'error');
      }
    } catch (err) {
      setFieldValues(prev => ({ ...prev, [fieldName]: !newValue }));
      addToast('An error occurred while updating status. Please try again.', 'error');
    } finally {
      setSavingField(null);
    }
  };

  if (loading && !user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p style={{ color: "var(--color-muted)" }} className="text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="text-center">
          <XCircle size={48} className="mx-auto mb-4" style={{ color: "var(--color-error)" }} />
          <p style={{ color: "var(--color-muted)" }} className="text-lg">User not found</p>
          <Button onClick={() => dispatch(fetchUserProfile())} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
   
   {/* Header */}
      <div 
        className="border-b sticky top-0 z-10 backdrop-blur-sm"
        style={{ 
          backgroundColor: "var(--color-bg)", 
          borderColor: "var(--color-bg)" 
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <PageHeader
        icon={User}
        title="User Management"
        subtitle="Manage user accounts, roles, and permissions"
        isAdmin={false}
        error="Failed to load users."
      />
            </div>
          </div>
        </div>
      </div>


      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Personal Information Section */}
          <div 
            className="rounded-2xl border p-8 overflow-hidden shadow-xl"
            style={{ 
              backgroundColor: "var(-color-subtle-bg)", 
               border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div 
                className="p-2 rounded-lg"
               style={{
                        backgroundColor: "var(--color-subtle-bg)",
                        border: "1px solid var(--color-border)",
                      }}
              >
                <User size={20} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: "var(--color-fg)" }}
                >
                  Personal Information
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: "var(--color-muted)" }}
                >
                  Your basic profile details
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                icon={User}
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
                icon={User}
                user={user}
              />

              <EditableField
                fieldName="email"
                label="Email Address"
                value={user.email}
                isReadOnly={true}
                icon={Mail}
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
                icon={Phone}
                user={user}
              />
            </div>
          </div>

          {/* Account Settings Section */}
          <div 
            className="rounded-2xl border p-8 overflow-hidden shadow-xl"
            style={{ 
              backgroundColor: "var(-color-subtle-bg)", 
              borderColor: "var(--color-border)" 
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div 
                className="p-2 rounded-lg"
               style={{
                        backgroundColor: "var(--color-subtle-bg)",
                        border: "1px solid var(--color-border)",
                      }}
              >
                <Settings size={20} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: "var(--color-fg)" }}
                >
                  Account Settings
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: "var(--color-muted)" }}
                >
                  Role and account status configuration
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                icon={Shield}
                user={user}
              />

              <EditableField
                fieldName="is_active"
                label="Account Status"
                value={user.is_active}
                isToggle={true}
                isSaving={savingField === 'is_active'}
                fieldValue={fieldValues.is_active !== undefined ? fieldValues.is_active : user.is_active}
                onToggle={handleToggle}
                icon={Activity}
                user={user}
              />
            </div>
          </div>

          {/* Company Information Section */}
          <div 
            className="rounded-2xl border p-8 overflow-hidden shadow-xl"
            style={{ 
              backgroundColor: "var(--color-subtle-bg)", 
              borderColor: "var(--color-border)" ,
               border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center gap-3 mb-8"
            >
              <div 
                className="p-2 rounded-lg"
                style={{
                        backgroundColor: "var(--color-subtle-bg)",
                        border: "1px solid var(--color-border)",
                      }}
              >
                <Briefcase size={20} style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: "var(--color-fg)" }}
                >
                  Company Information
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: "var(--color-muted)" }}
                >
                  Organization details and permissions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EditableField
                fieldName="company_name"
                label="Company Name"
                value={user.company?.company_name}
                isReadOnly={true}
                icon={Building}
                user={user}
              />

              <EditableField
                fieldName="is_approved"
                label="Account Approved"
                value={user.is_approved ? 'Yes' : 'No'}
                isReadOnly={true}
                icon={UserCheck}
                user={user}
              />

              <EditableField
                fieldName="registered_admin"
                label="Registered Admin"
                value={user.registered_admin ? 'Yes' : 'No'}
                isReadOnly={true}
                icon={Shield}
                user={user}
              />

              <EditableField
                fieldName="primary_admin"
                label="Primary Admin"
                value={user.primary_admin ? 'Yes' : 'No'}
                isReadOnly={true}
                icon={Crown}
                user={user}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
