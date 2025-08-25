import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building } from 'lucide-react';

export const ClientSelectDropdown = ({
  options = [],
  selectedValue,
  onChange,
  placeholder = "Select a client",
  disabled = false,
  loading = false,
  required = false
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

  // Filter clients based on search term
  const filteredOptions = options.filter(client => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const companyName = (client.client_company_name || client.client_company || '').toLowerCase();
    const clientName = `Client ${client.id}`.toLowerCase();
    
    return companyName.includes(searchLower) || clientName.includes(searchLower);
  });

  const handleSelect = (clientId) => {
    onChange({ target: { name: 'client', value: clientId } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const getSelectedClient = () => {
    return options.find(client => client.id === selectedValue);
  };

  const getDisplayText = () => {
    const selectedClient = getSelectedClient();
    if (!selectedClient) return placeholder;
    
    return selectedClient.client_company_name || 
           selectedClient.client_company || 
           `Client ${selectedClient.id}`;
  };

  const getClientInitial = (client) => {
    const name = client.client_company_name || client.client_company || `Client ${client.id}`;
    return name[0]?.toUpperCase() || 'C';
  };

  const handleDropdownClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const removeSelection = (e) => {
    e.stopPropagation();
    onChange({ target: { name: 'client', value: '' } });
  };

  if (loading) {
    return (
      <div className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 animate-pulse">
        Loading clients...
      </div>
    );
  }

  const selectedClient = getSelectedClient();

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={handleDropdownClick}
        className={`w-full min-h-[44px] p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus-within:ring-2 focus-within:ring-blue-500 cursor-pointer transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <Building size={16} className="text-slate-400 flex-shrink-0" />
          
          {selectedValue && selectedClient ? (
            <div className="flex items-center gap-2 flex-1">
              {/* Tag-style display for selected client */}
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                <div className="w-4 h-4 bg-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                  {getClientInitial(selectedClient)}
                </div>
                {getDisplayText()}
                <X
                  size={12}
                  className="cursor-pointer hover:bg-blue-700 rounded-full p-0.5"
                  onClick={removeSelection}
                />
              </span>
            </div>
          ) : (
            <span className="flex-1 text-slate-400">{placeholder}</span>
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
                placeholder="Search clients..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {/* Clear Selection Option */}
            {!required && (
              <div
                onClick={() => handleSelect('')}
                className="p-3 hover:bg-slate-700 cursor-pointer flex items-center space-x-3 border-b border-slate-700 transition-colors"
              >
                <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                  <X size={16} className="text-slate-400" />
                </div>
                <span className="text-slate-400">Clear selection</span>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-slate-400 text-center">
                {searchTerm ? 'No clients found matching your search' : 'No clients available'}
              </div>
            ) : (
              filteredOptions.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelect(client.id)}
                  className={`p-3 hover:bg-slate-700 cursor-pointer flex items-center justify-between transition-colors ${
                    selectedValue === client.id ? 'bg-slate-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {getClientInitial(client)}
                    </div>
                    <div>
                      <span className="text-white font-medium">
                        {client.client_company_name || client.client_company || `Client ${client.id}`}
                      </span>
                    </div>
                  </div>
                  {selectedValue === client.id && (
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