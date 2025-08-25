import React, { useEffect, useState } from "react";
// import { Box, TextField, Autocomplete, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux';
import { fetchClients } from '/src/redux/clientSlice';


const ClientListCombobox = ({onSelectClient, currentClient}) => {
  // Define the options for the combobox
  // const clients = ["Client 1", "Client 2", "Client 3", "Client 4"];
  const dispatch = useDispatch();
  const {clients, loading} = useSelector((state) => state.clients); // Get clients from the store (client:ClientReducer)
  const [selectedClient, setSelectedClient] = useState(currentClient); 

  // console.log("EXISGTIN selected", selectedClient);

  // Load clients when the component mounts
  useEffect(() => {
    dispatch(fetchClients()); // Fetch clients if not already loaded
  }, [dispatch]);

  // Set the selected client when the component mounts
  useEffect(() => {
    setSelectedClient(currentClient);
  }
  , [currentClient]);

  // Re-fetch clients after modal closes to get the updated list
  const handleModalClose = () => {
    setModalOpen(false);
    fetchClients();
  };

  // console.log(clients);

  const handleClientChange = (_, newvalue) => {
    setSelectedClient(newvalue);
    onSelectClient(newvalue); // Pass the selected value to the parent component
    // console.log(newvalue);
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Autocomplete
        options={clients} // Ensure options are passed
        getOptionLabel={(option) => option.name} // Display client name in the input field
        value={selectedClient}
        onChange={handleClientChange}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search Client..."
            sx={{
              "& .MuiInputBase-root": {
                backgroundColor: "#334155", // Tailwind bg-gray-700
                color: "white",
                px: 1,
                py: 0
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#475569", // Tailwind border-gray-600
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#cbd5e1", // Tailwind border-gray-300
              },
            }}
          />
        )}
      />
    </Box>
  );
};

export default ClientListCombobox;
