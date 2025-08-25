// validationUtils.js
import { useState, useCallback } from 'react';

// Validation rules
const validationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minLength: 5,
    maxLength: 254,
    messages: {
      required: 'Email is required',
      pattern: 'Please enter a valid email address',
      minLength: 'Email must be at least 5 characters long',
      maxLength: 'Email must be less than 254 characters'
    }
  },
  phone: {
    required: false,
    pattern: /^[\+]?[\d\s\-\(\)]{10,}$/,
    minLength: 10,
    maxLength: 15,
    messages: {
      required: 'Phone number is required',
      pattern: 'Please enter a valid phone number (minimum 10 digits)',
      minLength: 'Phone number must be at least 10 digits',
      maxLength: 'Phone number must be less than 15 digits'
    }
  },
  pin: {
    required: false,
    pattern: /^\d{4,10}$/,
    minLength: 4,
    maxLength: 10,
    messages: {
      required: 'PIN code is required',
      pattern: 'PIN code should contain only numbers (4-10 digits)',
      minLength: 'PIN code must be at least 4 digits',
      maxLength: 'PIN code must be less than 10 digits'
    }
  }
};

// Single field validation function
export const validateField = (value, type, isRequired = null) => {
  const rule = validationRules[type];
  if (!rule) return { isValid: true, error: '' };

  const trimmedValue = String(value || '').trim();
  const required = isRequired !== null ? isRequired : rule.required;

  // Check required
  if (required && !trimmedValue) {
    return { isValid: false, error: rule.messages.required };
  }

  // If field is empty and not required, it's valid
  if (!trimmedValue && !required) {
    return { isValid: true, error: '' };
  }

  // Check pattern
  if (rule.pattern && !rule.pattern.test(trimmedValue)) {
    return { isValid: false, error: rule.messages.pattern };
  }

  // Check min length
  if (rule.minLength && trimmedValue.length < rule.minLength) {
    return { isValid: false, error: rule.messages.minLength };
  }

  // Check max length
  if (rule.maxLength && trimmedValue.length > rule.maxLength) {
    return { isValid: false, error: rule.messages.maxLength };
  }

  return { isValid: true, error: '' };
};

// Real-time validation hook
export const useRealTimeValidation = (fieldsToValidate = []) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateSingleField = useCallback((fieldName, value, isRequired = null) => {
    if (!fieldsToValidate.includes(fieldName)) return { isValid: true, error: '' };
    
    const validation = validateField(value, fieldName, isRequired);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: validation.error
    }));

    return validation;
  }, [fieldsToValidate]);

  const validateAllFields = useCallback((formData, requiredFields = {}) => {
    const newErrors = {};
    let isFormValid = true;

    fieldsToValidate.forEach(fieldName => {
      const isRequired = requiredFields[fieldName];
      const validation = validateField(formData[fieldName], fieldName, isRequired);
      
      if (!validation.isValid) {
        newErrors[fieldName] = validation.error;
        isFormValid = false;
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));
    return { isFormValid, errors: newErrors };
  }, [fieldsToValidate]);

  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: ''
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const setFieldTouched = useCallback((fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  const handleFieldChange = useCallback((fieldName, value, isRequired = null) => {
    // Only validate if field is touched
    if (touched[fieldName]) {
      validateSingleField(fieldName, value, isRequired);
    }
  }, [touched, validateSingleField]);

  const handleFieldBlur = useCallback((fieldName, value, isRequired = null) => {
    setFieldTouched(fieldName);
    validateSingleField(fieldName, value, isRequired);
  }, [validateSingleField, setFieldTouched]);

  return {
    errors,
    touched,
    validateSingleField,
    validateAllFields,
    clearFieldError,
    clearAllErrors,
    setFieldTouched,
    handleFieldChange,
    handleFieldBlur
  };
};

// Validation status indicator component
export const ValidationIcon = ({ isValid, hasValue, isTouched, className = "" }) => {
  if (!isTouched || !hasValue) return null;

  return (
    <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${className}`}>
      {isValid ? (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
};

export default { validateField, useRealTimeValidation, ValidationIcon };