import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ChartLine, Home, Settings, UsersRound, Layers, SquareDashedBottomCode, ChartNetwork,MapPinned  } from "lucide-react";
import SidebarItem from "./SidebarItem";
// import expandedLogo from "../../public/logo-image.png";
// import smallLogo from "../../public/logo-image.png";

import { useDispatch, useSelector } from 'react-redux';
import {fetchUserProfile, logout} from '../redux/authSlice';
import ProfileModalSidebar from "./ProfileModalSidebar";

const allSidebarItems = [
  { name: "Dashboard", icon: <Home />, path: "/", roles: ["admin", "manager", "user"] },
  { name: "Users", icon: <UsersRound />, path: "/users", roles: ["admin", "user"] },
  { name: "Clients", icon: <Layers />, path: "/clients", roles: ["admin"] },
  { name: "Projects", icon: <SquareDashedBottomCode />, path: "/projects", roles: ["admin", "manager", "user"] },
  { name: "Map", icon:<MapPinned />, path: "/map", roles: ["admin", "manager", "user"] },
  { name: "Reports", icon: <ChartNetwork />, path: "/reports", roles: ["admin", "manager", "user"] },
  { name: "Settings", icon: <Settings />, path: "/settings", roles: ["admin", "manager", "user"] },
];

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileButtonRef = useRef(null);
  
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const {user} = useSelector((state) => state.auth);
  const loading = useSelector((state) => state.auth.loading);

  // console.log("Toekn Auth", accessToken);
  // console.log("Toekn Local", localStorage.getItem('accessToken'));
  // console.log("User Auth", user)

  useEffect(() => {
    if(accessToken && !user){
      dispatch(fetchUserProfile());
    }
  }, [ dispatch, accessToken, user]);

  // Filter sidebar items based on user role
  const getFilteredSidebarItems = () => {
    if (!user || !user.role) return [];
    
    const userRole = user.role.toLowerCase();
    return allSidebarItems.filter(item => item.roles.includes(userRole));
  };

  const sidebarItems = getFilteredSidebarItems();

  if (loading) {
    return <p>Loading...</p>; // Show loading spinner or message
  }

  let userName="Guest User";

  if(user){
    userName=user.first_name+" "+ user.last_name;
  }
  const userInitial = userName.charAt(0).toUpperCase(); // Get the first letter

  return (
    <>
      <motion.div
      className="fixed top-0 left-0 h-full 
           bg-gray-50 text-gray-900
            dark:bg-gray-900 dark:text-gray-100
            flex flex-col justify-between shadow-lg z-50"

        initial={{ width: "4rem" }}
        animate={{ width: isExpanded ? "16rem" : "4rem" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}

        //*Sidebar Collapse irespective of Profile Modal
        // onMouseEnter={() => setIsExpanded(true)}
        // onMouseLeave={() => setIsExpanded(false)}

        //Sidebar Does not Collapse if Profile Modal Opens
        onMouseEnter={() => !isProfileModalOpen && setIsExpanded(true)}
        onMouseLeave={() => !isProfileModalOpen && setIsExpanded(false)}
      >
        {/* Sidebar Logo */}
        <div className="flex items-center justify-center h-16 w-full">
          {isExpanded ? (
            <img src="/logo-image.png" alt="Expanded Logo" className="h-10" />
          ) : (
            <img src="/logo-icon.png" alt="Small Logo" className="h-8" />
          )}
        </div>

        {/* Sidebar Items */}
        <div className="flex flex-col flex-grow gap-4 mt-4">
          {sidebarItems.map((item) => (
            <SidebarItem key={item.name} {...item} isExpanded={isExpanded} />
          ))}
        </div>

        {/* Profile Button */}
        <div
          ref={profileButtonRef}
        className="flex items-center gap-4 px-4 py-2 
            hover:bg-gray-200 dark:hover:bg-gray-700 
            rounded-lg cursor-pointer w-full mb-4"

          onClick={() => setIsProfileModalOpen((prev) => !prev)}
        >
         <div className="bg-gray-200 dark:bg-gray-800 
                    rounded-full h-8 w-8 flex items-center justify-center text-lg font-semibold">
      {userInitial}
    </div>
          {isExpanded && (
            <span className="text-black dark:text-white text-sm font-medium group-hover:text-blue-500">{userName}</span>
          )}
        </div>
      </motion.div>

      {/* Profile Modal */}
    {isProfileModalOpen && user ? (
  <ProfileModalSidebar
    parentRef={profileButtonRef}
    userName={userName}
    email={user.email}
    role={user.role}
    company={user.company}
    onClose={() => {
    setIsProfileModalOpen(false);
    setIsExpanded(false); // <-- collapse sidebar here
  }}
  />
) : null}

    </>
  );
};

export default Sidebar;