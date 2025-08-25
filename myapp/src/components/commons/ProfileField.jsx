import { Loader2,CheckCircle,XCircle } from 'lucide-react';
export const ProfileField = ({ 
  label, 
  value, 
  isBoolean = false, 
  icon: Icon,
  className = "",
  renderValue = null 
}) => (
  <div className={`group hover:bg-gray-750 rounded-xl p-4 transition-all duration-200 border border-transparent hover:border-gray-600 ${className}`}>
    <label className="block text-sm font-medium text-gray-400 capitalize mb-2 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-blue-400" />}
      {label.replace(/_/g, ' ')}
    </label>
    {renderValue ? renderValue(value) : (
      <>
        {isBoolean ? (
          <div className="flex items-center gap-2">
            {value === true || value === 'true' ? (
              <>
                <CheckCircle size={20} className="text-green-400" />
                <span className="text-green-400 font-medium">Active</span>
              </>
            ) : (
              <>
                <XCircle size={20} className="text-red-400" />
                <span className="text-red-400 font-medium">Inactive</span>
              </>
            )}
          </div>
        ) : (
          <div className="text-white font-medium">
            {value || <span className="text-gray-500 italic">Not provided</span>}
          </div>
        )}
      </>
    )}
  </div>
);
