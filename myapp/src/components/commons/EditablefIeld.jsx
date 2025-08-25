import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge";
import { Button } from "./Button";
import { Check, CheckCircle, Pencil, X } from "lucide-react";
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
        borderColor: isEditing ? "white" : "var(--color-border)" // White border when editing
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} style={{ color: "var(--color-muted)" }} />}
          <label className="text-sm font-medium capitalize" style={{ color: "var(--color-fg)" }}>
            {label.replace(/_/g, ' ')}
          </label>
          
          {isReadOnly && (
            <StatusBadge type="readonly">
              Read Only
            </StatusBadge>
          )}
          
          {fieldName === 'email' && user?.is_email_verified && (
            <StatusBadge type="verified" className="text-green-500">
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
            className="p-2 rounded-lg hover:bg-opacity-10"
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
                  borderColor: "white"
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
                type={fieldName === 'email' ? 'email' : fieldName === 'phone' ? 'tel' : 'text'}
                value={fieldValue}
                onChange={(e) => onChange(fieldName, e.target.value)}
                className="flex-1 px-3 py-2 bg-transparent border-0 border-b-2 focus:outline-none transition-colors"
                style={{
                  color: "var(--color-fg)",
                  borderColor: "white"
                }}
                placeholder={fieldName === 'phone' ? '+1 (555) 123-4567' : `Enter ${label.replace(/_/g, ' ')}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSave(fieldName);
                  }
                }}
              />
            )}
            
            <button
              onClick={() => onSave(fieldName)}
              disabled={isSaving || !validation.isValid}
              className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={18} />
            </button>
          </div>
          
          {fieldName === 'phone' && validation.message && (
            <p 
              className="text-xs"
              style={{ color: validation.isValid ? "var(--color-success)" : "var(--color-error)" }}
            >
              {validation.message}
            </p>
          )}
        </div>
      ) : (
        <div className={`transition-all duration-200 ${isSaving ? 'opacity-50' : ''}`}>
          <p style={{ color: "var(--color-fg)" }}>
            {value || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  );
};
