import { useEffect, useRef } from "react";
import { StatusBadge } from "./StatusBadge";
import { Button } from "./Button";
import { Check, CheckCircle, Pencil } from "lucide-react";
import { Toggle } from "./Toggle";
import { LoadingSpinner } from "./LoadingSpinner";

// EditableField.jsx
export const EditableField = ({ 
  fieldName, 
  label, 
  value, 
  isReadOnly = false, 
  isToggle = false, 
  isSelect = false, 
  options = [],
  isEditing,
  isSaving,
  fieldValue,
  validation = { isValid: true, message: '' },
  onEdit,
  onChange,
  onSave,
  onCancel,
  onToggle,
  icon: Icon,
  user = {}
}) => {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Exit edit mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        onCancel(fieldName);
      }
    };
    
    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, fieldName, onCancel]);

  if (isToggle) {
    return (
      <div 
        className="rounded-xl p-6 border transition-all duration-200 hover:border-opacity-80"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)"
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon size={20} style={{ color: "var(--color-muted)" }} />}
            <div>
              <label className="block text-sm font-medium capitalize" style={{ color: "var(--color-fg)" }}>
                {label.replace(/_/g, ' ')}
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                Toggle account status
              </p>
            </div>
          </div>
          <Toggle
            checked={fieldValue}
            onChange={() => onToggle(fieldName)}
            disabled={isSaving}
          />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={wrapperRef}
      className="rounded-xl p-6 border transition-all duration-200 hover:border-opacity-80"
      style={{
        backgroundColor: "var(--color-card)",
        borderColor: isEditing ? "#f0f5fdff" : "var(--color-border)" // Blue border when editing
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} style={{ color: "var(--color-muted)" }} />}
          <label className="text-sm font-medium capitalize" style={{ color: "var(--color-fg)" }}>
            {label.replace(/_/g, ' ')}
          </label>
          
          {isReadOnly && (
            <StatusBadge type="readonly"  className="text-white bg-gray-500 border-gray-500" >
              Read Only
            </StatusBadge>
          )}
          
          {fieldName === 'email' && user?.is_email_verified && (
            <StatusBadge type="verified" className="bg-green-900/30 text-green-500 border border-green-700">
              <CheckCircle size={12} className="text-green-500" />
              Verified
            </StatusBadge>
          )}
          
          {isSaving && (
            <StatusBadge type="updating">
              <LoadingSpinner size="sm" />
              Updating...
            </StatusBadge>
          )}
        </div>

        {!isReadOnly && !isEditing && !isSaving && (
          <Button
            variant="ghost"
            size="sm"
            icon={Pencil}
            onClick={() => onEdit(fieldName)}
            className="icon-circle"
            style={{ color: "var(--color-muted)" }}
          />
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {isSelect ? (
              <select
                value={fieldValue}
                onChange={(e) => onChange(fieldName, e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent border-0 border-b-2 focus:outline-none transition-colors"
                style={{
                  color: "var(--color-fg)",
                  borderColor: "#3b82f6"
                }}
                autoFocus
              >
                {options.map(option => (
                  <option 
                    key={option.value} 
                    value={option.value}
                    style={{
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-fg)"
                    }}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                ref={inputRef}
                type={fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : fieldName === 'website' ? 'url' : 'text'}
                value={fieldValue}
                onChange={(e) => onChange(fieldName, e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent border-0 border-b-2 focus:outline-none transition-colors"
                style={{
                  color: "var(--color-fg)",
                  borderColor: "#3b82f6"
                }}
                placeholder={fieldName === 'phone' ? '+1 (555) 123-4567' : fieldName === 'website' ? 'https://your-website.com' : `Enter ${label.replace(/_/g, ' ')}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSave(fieldName);
                  } else if (e.key === 'Escape') {
                    onCancel(fieldName);
                  }
                }}
              />
            )}
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSave(fieldName)}
                disabled={isSaving || !validation.isValid}
                className="p-1 rounded-full border border-green-500 text-green-500 hover:text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
          
          {validation.message && (
            <p 
              className="text-xs"
              style={{ color: validation.isValid ? "#10b981" : "#ef4444" }}
            >
              {validation.message}
            </p>
          )}
        </div>
      ) : (
        <div 
          className={`transition-all duration-200 ${isSaving ? 'opacity-50' : ''} cursor-pointer`}
          onClick={() => {
            if (!isReadOnly && !isEditing && !isSaving) {
              onEdit(fieldName);
            }
          }}
        >
          <p style={{ color: "var(--color-fg)" }}>
            {value || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  );
};
