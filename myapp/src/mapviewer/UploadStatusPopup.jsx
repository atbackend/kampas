
import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Image, Layers, Map, Mountain, X, Upload, Maximize2, Minimize2, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export const UploadStatusPopup = ({ isOpen, onClose, uploads }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-h-96 overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Activity size={18} />
              <h3 className="text-sm font-semibold">Upload Status</h3>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-red-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="p-4 max-h-80 overflow-auto">
          {uploads.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Upload size={32} className="mx-auto mb-2 opacity-50" />
              <p>No uploads in progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map(upload => (
                <div key={upload.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center space-x-3 mb-2">
                    {upload.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                    {upload.status === 'processing' && <Clock size={16} className="text-blue-500" />}
                    {upload.status === 'error' && <AlertCircle size={16} className="text-red-500" />}
                    <span className="text-sm font-medium truncate">{upload.name}</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        upload.status === 'completed' ? 'bg-green-500' : 
                        upload.status === 'processing' ? 'bg-blue-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{upload.progress}% complete</span>
                    <span className="capitalize">{upload.status}</span>
                  </div>
                  
                  {upload.message && (
                    <p className="text-xs text-gray-500 mt-1">{upload.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};