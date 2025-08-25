import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Shield, Edit, Eye, User, Calendar, Building, Target, FileText, Search } from 'lucide-react';

// Enhanced MultiSelectDropdown with search functionality
export const MultiSelectDropdown = ({
  options = [],
  selectedValues = [],
  onChange,
  placeholder,
  icon: Icon,
  disabled = false,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${option.first_name || ''} ${option.last_name || ''}`.trim().toLowerCase();
    const email = (option.email || '').toLowerCase();
    const firstName = (option.first_name || '').toLowerCase();
    const lastName = (option.last_name || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           firstName.includes(searchLower) || 
           lastName.includes(searchLower);
  });

  const handleToggle = (optionId) => {
    const newValues = selectedValues.includes(optionId)
      ? selectedValues.filter(id => id !== optionId)
      : [...selectedValues, optionId];
    onChange(newValues);
  };

  const getSelectedOptions = () => {
    return selectedValues
      .map(id => options.find(opt => opt.id === id))
      .filter(Boolean);
  };

  const removeTag = (optionId, e) => {
    e.stopPropagation();
    const newValues = selectedValues.filter(id => id !== optionId);
    onChange(newValues);
  };

  const handleDropdownClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  if (loading) {
    return (
      <div className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 animate-pulse">
        Loading users...
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={handleDropdownClick}
        className={`w-full min-h-[44px] p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'
        }`}
      >
        <div className="flex items-center flex-wrap gap-2">
          {Icon && <Icon size={16} className="text-slate-400 flex-shrink-0" />}
          
          {selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-2 flex-1">
              {getSelectedOptions().map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-full"
                >
                  <div className="w-4 h-4 bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                    {((option.first_name || '')[0] || 'U').toUpperCase()}
                  </div>
                  {`${option.first_name || ''} ${option.last_name || ''}`.trim() || option.email}
                  <X
                    size={12}
                    className="cursor-pointer hover:bg-blue-700 rounded-full p-0.5"
                    onClick={(e) => removeTag(option.id, e)}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400 flex-1">{placeholder}</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-slate-400 text-center">
                {searchTerm ? 'No users found matching your search' : 'No users available'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleToggle(option.id)}
                  className={`p-3 hover:bg-slate-700 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedValues.includes(option.id) ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {((option.first_name || '')[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-medium">
                        {`${option.first_name || ''} ${option.last_name || ''}`.trim() || option.email || 'Unknown User'}
                      </span>
                      {option.email && (
                        <div className="text-slate-400 text-xs">{option.email}</div>
                      )}
                    </div>
                  </div>
                  {selectedValues.includes(option.id) && (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
