import React, { useState } from 'react';
import { X, Save, CheckCircle, XCircle, Eye, EyeOff, User, Mail, Phone, Building, Shield } from 'lucide-react';

// ============================================
// 🎨 REUSABLE UI COMPONENTS LIBRARY
// ============================================

// 1. MODAL COMPONENT
export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  maxWidth = "max-w-2xl",
  showCloseButton = true,
  closable = true 
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closable && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className={`bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full ${maxWidth} max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-out`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-750">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            {title}
          </h3>
          {showCloseButton && closable && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-full"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-gray-750">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
