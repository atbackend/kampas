
import React from 'react';
import { Search, Filter } from 'lucide-react';

const PageHeader = ({
  icon: IconComponent,
  title,
  subtitle,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  addButtonText = "Add New",
  onAddClick,
  addButtonDisabled = false,
  showFilterButton = true,
  filterActive = false,
  onFilterToggle,
  children // For any additional buttons or content
}) => {
  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-4 bg-slate-800 border border-slate-700 rounded-xl shadow-lg">
            <IconComponent className="h-8 w-8 text-blue-400" size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">{title}</h1>
            {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>

    </>
  );
};

export default PageHeader;