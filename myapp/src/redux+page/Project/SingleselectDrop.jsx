import { ChevronDown, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const SingleSelectDropdown = ({
  options = [],
  selectedValue,
  onChange,
  placeholder,
  icon: Icon,
  disabled = false,
  loading = false,
  fallbackLabel = '',
  displayKey = null, // Optional key to display label
  valueKey = 'id',
  searchKeys = ['first_name', 'last_name', 'email'],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt[valueKey] === selectedValue);
  const getInitial = (name) => name?.[0]?.toUpperCase() || 'U';

  const selectedName = selectedOption
    ? displayKey
      ? selectedOption[displayKey]
      : `${selectedOption.first_name || ''} ${selectedOption.last_name || ''}`.trim() || selectedOption.email
    : fallbackLabel || '';

  const removeTag = (id, e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-500'
        }`}
      >
        <div className="flex items-center space-x-3">
          {selectedName ? (
            <span className="text-xs px-2 py-1 bg-blue-700 text-white rounded-full flex items-center gap-1 w-fit">
              <span className="w-4 h-4 bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                {getInitial(
                  selectedOption?.first_name ||
                  selectedOption?.email ||
                  fallbackLabel
                )}
              </span>
              {selectedName}
            
                <X
                  size={12}
                  className="cursor-pointer hover:bg-blue-700 rounded-full p-0.5"
                  onClick={(e) => removeTag(selectedOption[valueKey], e)}
                />
              
            </span>
          ) : (
            <span className="truncate font-medium text-gray-400">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="p-3 hover:bg-gray-600 cursor-pointer text-gray-400 flex items-center space-x-2"
          >
            <User size={16} className="text-gray-400" />
            <span>{placeholder}</span>
          </div>
          {options.map((option) => {
            const displayName = displayKey
              ? option[displayKey]
              : `${option.first_name || ''} ${option.last_name || ''}`.trim() || option.email;

            return (
              <div
                key={option[valueKey]}
                onClick={() => {
                  onChange(option[valueKey]);
                  setIsOpen(false);
                }}
                className={`p-3 hover:bg-gray-600 cursor-pointer ${
                  selectedValue === option[valueKey] ? 'bg-gray-600' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white">
                    {getInitial(option.first_name || option.email)}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {displayName}
                    </div>
                    {option.email && (
                      <div className="text-gray-400 text-xs">{option.email}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
