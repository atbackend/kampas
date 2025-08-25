import { useState } from "react";

export const FormField = ({ 
  label, 
  name, 
  value, 
  onChange, 
  disabled = false, 
  type = "text", 
  options = null,
  icon: Icon,
  placeholder,
  required = false,
  error = null,
  helpText = null 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const hasError = !!error;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 capitalize flex items-center gap-2">
        {Icon && <Icon size={16} className="text-blue-400" />}
        {label.replace(/_/g, ' ')}
        {required && <span className="text-red-400">*</span>}
      </label>
      
      <div className="relative">
        {options ? (
          <select
            name={name}
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            className={`w-full bg-gray-700 text-white rounded-xl px-4 py-3 border transition-all duration-200 focus:outline-none
              ${hasError 
                ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/20' 
                : disabled 
                  ? 'border-gray-600 opacity-50 cursor-not-allowed' 
                  : 'border-gray-600 hover:border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
              }`}
          >
            <option value="">Select {label.replace(/_/g, ' ')}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input
              type={inputType}
              name={name}
              value={value || ''}
              onChange={onChange}
              disabled={disabled}
              placeholder={placeholder}
              className={`w-full bg-gray-700 text-white rounded-xl px-4 py-3 border transition-all duration-200 focus:outline-none
                ${hasError 
                  ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-400/20' 
                  : disabled 
                    ? 'border-gray-600 opacity-50 cursor-not-allowed' 
                    : 'border-gray-600 hover:border-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'
                } ${isPassword ? 'pr-12' : ''}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </>
        )}
      </div>
      
      {/* Error Message */}
      {hasError && (
        <p className="text-red-400 text-sm flex items-center gap-1">
          <XCircle size={14} />
          {error}
        </p>
      )}
      
      {/* Help Text */}
      {helpText && !hasError && (
        <p className="text-gray-400 text-sm">{helpText}</p>
      )}
    </div>
  );
};