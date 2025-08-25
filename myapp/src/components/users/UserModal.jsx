
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { addUser, updateUser } from "/src/redux/usersSlice";

const UserModal = ({ isOpen, onClose, selectedUser }) => {
  const dispatch = useDispatch();

  const { roles, rolesLoading, rolesError } = useSelector((state) => state.users);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");


  useEffect(() => {
    if (selectedUser) {
      setFirstName(selectedUser.first_name || "");
      setLastName(selectedUser.last_name || "");
      setEmail(selectedUser.email || "");
      setRole(selectedUser.role || "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("");
    }
  }, [selectedUser]);

  const handleSave = (e) => {
    e.preventDefault();

    const userData = {
      first_name: firstName,
      last_name: lastName,
      email,
      role,
    };

    if (selectedUser?.id) {
      dispatch(updateUser({ id: selectedUser.id, updatedUser: userData }));
    } else {
      dispatch(addUser(userData));
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <form onSubmit={handleSave} className="p-4 space-y-4 bg-white rounded-lg">
        <div className="absolute inset-0 w-[calc(100%-4)] h-[calc(100%-4)] m-2 p-6 bg-gray-800 overflow-hidden rounded-lg shadow-lg">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-600">
            <h2 className="text-xl font-semibold text-white">
              {selectedUser ? "Edit User" : "Add User"}
            </h2>
            <button type="button" onClick={onClose}>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4 overflow-y-auto flex-grow text-white">
            {/* First Name */}
            <div className="flex items-center mb-4">
              <label className="w-1/3 font-medium">First Name:</label>
              <input
                type="text"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            {/* Last Name */}
            <div className="flex items-center mb-4">
              <label className="w-1/3 font-medium">Last Name:</label>
              <input
                type="text"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="flex items-center mb-4">
              <label className="w-1/3 font-medium">Email:</label>
              <input
                type="email"
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Role Dropdown */}
            <div className="flex items-center">
              <label className="w-1/3 font-medium">Role:</label>
              {rolesLoading ? (
                <p>Loading roles...</p>
              ) : (
                <select
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={selectedUser?.role === "admin"} // Disable if editing an admin user
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {rolesError && <p className="text-red-500">Error fetching roles</p>}

          </div> {/* End of Content */}

          {/* Footer */}
          <div className="flex justify-end items-center p-4 gap-4 border-t border-gray-600">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md"
            >
              {selectedUser ? "Update User" : "Add User"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default UserModal