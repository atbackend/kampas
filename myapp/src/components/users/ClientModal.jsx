import React, { useState, useEffect } from "react";
import { X , PlusSquare} from "lucide-react";
// import { Button, List, ListItem, ListItemText, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, ListItemSecondaryAction, TextField } from '@mui/material';
// import DeleteIcon from '@mui/icons-material/Delete';
// import SearchIcon from '@mui/icons-material/Search';

import { useDispatch, useSelector } from 'react-redux';
import { addClient,fetchClients } from '/src/redux/clientSlice';


const ClientModal = ({ isClientModalOpen, onClientModalClose, onClientModalSave }) => {

  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
      id: "",
      name: "",
    });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleClose = () => {
    onClientModalClose(); // Close the modal
  };

  const handleSaveClient = async () => {
    const ClientData= {
      name: formData.name,
    };
    try {
      await dispatch(addClient(ClientData)).unwrap(); // Wait for client to be added
      dispatch(fetchClients()); // Refresh client list after saving
      onClientModalClose(); // Close modal
    } catch (error) {
      console.error('Error adding client:', error);
    }
  };

  
  return (
    isClientModalOpen && (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        
        <div className="absolute inset-0 w-[calc(100%-4)] h-[calc(100%-4)] m-2 p-6 bg-gray-800 overflow-hidden rounded-lg shadow-lg ">
          {/* <h2 className="text-xl text-white mb-4">Add/Edit Workspace</h2> */}
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-semibold text-white">Add client</h2>
            <button onClick={handleClose}>
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4 p-4 overflow-y-auto flex-grow">

            <div className="flex items-center mb-4">
              <div className="label-column">
                <label
                    className="text-left pr-2 font-medium text-white"
                  >
                    Client Name:
                </label>
              </div>
              <div className="center-column">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md "
                />
              </div>
              <div className="quick-action-column">
                
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex justify-end items-center p-4 gap-4 mt-4 border-t">
            <button
              onClick={onClientModalClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Cancel
            </button>

            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded-md"
              onClick={handleSaveClient}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )
  );
};

export default ClientModal;
