import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const FilterModal = ({ isOpen, onClose, onApply }) => {
  const [roleOptions, setRoleOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [statusOptions] = useState([
    { label: "Pending Approval", value: "pending" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
  ]);

  const [filters, setFilters] = useState({
    role: "",
    company: "",
    status: "",
  });

  // Example: Fetch role and company options
  useEffect(() => {
    if (!isOpen) return;

    // Simulate API fetch
    setRoleOptions([
      { label: "Admin", value: "admin" },
      { label: "Manager", value: "manager" },
      { label: "Viewer", value: "viewer" },
    ]);

    setCompanyOptions([
      { label: "Ansimap Technologies", value: "ansimap" },
      { label: "TechCorp", value: "techcorp" },
    ]);
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply?.(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-40">
      <div className="w-full max-w-sm h-full bg-gray-900 text-white p-6 shadow-xl overflow-y-auto relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Filter Users</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X />
          </button>
        </div>

        {/* Role Dropdown */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Role</label>
          <select
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            value={filters.role}
            onChange={(e) => handleChange("role", e.target.value)}
          >
            <option value="">All Roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Company Dropdown */}
        <div className="mb-4">
          <label className="block text-sm mb-1">User Company</label>
          <select
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            value={filters.company}
            onChange={(e) => handleChange("company", e.target.value)}
          >
            <option value="">All Companies</option>
            {companyOptions.map((comp) => (
              <option key={comp.value} value={comp.value}>
                {comp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Dropdown */}
        <div className="mb-4">
          <label className="block text-sm mb-1">Status</label>
          <select
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900 border-t border-gray-700">
          <button
            onClick={handleApply}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-md"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
