import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FullScreenModal = ({ 
  isOpen, 
  onClose, 
  title, 
  icon: Icon,
  children,
  footerActions,
  maxWidth = "4xl"
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 text-white w-full max-h-[95vh] rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 sticky top-0 z-10">
          <h2 className="text-2xl font-semibold flex items-center space-x-3">
            {Icon && <Icon className="text-blue-400" size={28} />}
            <span>{title}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`p-6 max-w-${maxWidth} mx-auto`}>
            {children}
          </div>
        </div>

        {/* Footer */}
        {footerActions && (
          <div className="flex justify-end items-center p-6 gap-4 border-t border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 sticky bottom-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FullScreenModal;