import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
// import { Box, TextField, Autocomplete,  CircularProgress } from "@mui/material";

import { fetchUsers} from '/src/redux/usersSlice';

const ProjectManagerListbox = ({projectManagers}) => {
  const dispatch = useDispatch();
  const [selectedProjectManagers, setSelectedProjectManagers] = useState(projectManagers);
  const { users, loading} = useSelector((state) => state.users);
  const currentUser = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (projectManagers) {
      setSelectedProjectManagers(projectManagers);
    }else{
      setSelectedProjectManagers(currentUser);
    }
  }, [dispatch, projectManagers]);

  // Fetch users when component mounts
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // setSelectedProjectHead(projectHead);

  const handleProjectManagersChange = (event, newvalues) => {
    setSelectedProjectManagers(newvalues);
    console.log(newvalues);
  };

  if (loading) {
    return <CircularProgress />;
  }


  return (
    <Box>
      <Autocomplete
        options={users} // Ensure options are passed
        getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}// Display client name in the input field
        value={selectedProjectManagers} // Set the selected value
        onChange={handleProjectManagersChange}
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

export default ProjectManagerListbox;
