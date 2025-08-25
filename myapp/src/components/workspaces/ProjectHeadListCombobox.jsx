import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
// import { Box, TextField, Autocomplete,  CircularProgress } from "@mui/material";

import { fetchUsers} from '/src/redux/usersSlice';

const ProjectHeadListCombobox = ({selProjectHead, onSelectProjectHead}) => {
  const dispatch = useDispatch();
  const [selectedProjectHead, setSelectedProjectHead] = useState(selProjectHead);
  const { users, loading} = useSelector((state) => state.users);
  const currentUser = useSelector((state) => state.auth.user);

  // console.log("Project Head", selProjectHead);
  

  useEffect(() => {
    if (selProjectHead) {
      setSelectedProjectHead(selProjectHead);
    }else{
      setSelectedProjectHead(currentUser);
      onSelectProjectHead(currentUser);
    }
  }, [dispatch, selProjectHead]);

  // console.log("Selected Project Head", selectedProjectHead);

  // Fetch users when component mounts
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // setSelectedProjectHead(projectHead);

  const handleProjectHeadChange = (_, newvalue) => {
    setSelectedProjectHead(newvalue); // Set the selected value local state
    onSelectProjectHead(newvalue); // Pass the selected value to the parent component
    // console.log(newvalue);
  };

  if (loading) {
    return <CircularProgress />;
  }


  return (
    <Box>
      <Autocomplete
        options={users} // Ensure options are passed
        getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}// Display client name in the input field
        value={selectedProjectHead} // Set the selected value
        onChange={handleProjectHeadChange}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search User..."
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

export default ProjectHeadListCombobox;
