import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

// Utility functions
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "in progress":
      return "text-blue-400 bg-blue-900/20 border-blue-500/30";
    case "completed":
      return "text-green-400 bg-green-900/20 border-green-500/30";
    case "on hold":
      return "text-yellow-400 bg-yellow-900/20 border-yellow-500/30";
    case "planning":
      return "text-purple-400 bg-purple-900/20 border-purple-500/30";
    case "cancelled":
      return "text-red-400 bg-red-900/20 border-red-500/30";
    default:
      return "text-gray-400 bg-gray-900/20 border-gray-500/30";
  }
};

const getActiveStatusColor = (isActive) =>
  isActive
    ? "text-green-400 bg-green-900/20 border-green-500/30"
    : "text-red-400 bg-red-900/20 border-red-500/30";

// Reusable Badge Component
export const StatusBadge = ({
  type = "status", // "status" | "active"
  value,          // e.g. "In Progress" OR true/false
  px = "px-3",
  py = "py-1",
  className = "",
}) => {
  const baseClasses = `rounded-full text-xs font-medium border flex items-center gap-1 w-fit ${px} ${py} ${className}`;

  if (type === "status") {
    return (
      <span className={`${baseClasses} ${getStatusColor(value)}`}>
        {value || "Unknown"}
      </span>
    );
  }

  if (type === "active") {
    return (
      <span className={`${baseClasses} ${getActiveStatusColor(value)}`}>
        {value ? (
          <>
            <CheckCircle size={12} /> Active
          </>
        ) : (
          <>
            <XCircle size={12} /> Inactive
          </>
        )}
      </span>
    );
  }

  return null;
};

export default StatusBadge;
