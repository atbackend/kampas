import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  FileText,
  HelpCircle,
  Briefcase,
  LogOut,
  Sun,
  Moon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../redux/themeSlice'; // 👈 imp
import { logout } from '../redux/authSlice';
import { Button, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "../context/ThemeContext";

const ProfileModalSidebar = ({ parentRef, userName, email, role, onClose, }) => {
  const modalRef = useRef(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
const currentTheme = useSelector((state) => state.theme.mode);

const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const handleSignOut = () => {
    dispatch(logout());
    navigate("/sign-in");
  };

  const handleProfile = () => {
    navigate('/user-profile');
  };
    const handlecompany = () => {
    navigate('/company');
  };

 const handleThemeToggle = () => {
   dispatch(toggleTheme());
 };

  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === 'isLoggedOut') {
        dispatch(logout());
        window.location.href = '/signin';
      }
    };
    window.addEventListener('storage', onStorageChange);
    return () => {
      window.removeEventListener('storage', onStorageChange);
    };
  }, [dispatch]);

  useEffect(() => {
    if (parentRef.current && modalRef.current) {
      const parentRect = parentRef.current.getBoundingClientRect();
      const modalHeight = modalRef.current.getBoundingClientRect().height;
      setModalPosition({
        top: parentRect.top - modalHeight - 10,
        left: parentRect.left,
      });
    }
  }, [parentRef]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target) &&
        !parentRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, parentRef]);

  const userInitial = user?.first_name?.[0]?.toUpperCase() || 'U';

  return (
    <motion.div
      ref={modalRef}
      className="fixed bg-gray-900 text-white rounded-lg shadow-lg px-6 py-5 z-50 w-80"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        top: `${modalPosition.top}px`,
        left: parentRef.current?.offsetLeft + (parentRef.current?.offsetWidth + 10) || 0,
      }}
    >

      {/* Header */}
      <div className="flex items-center justify-between mb-4 ">
        <div className="flex items-center">
          <div className="bg-gray-800 text-white rounded-full h-10 w-10 flex items-center justify-center text-lg font-semibold">
            {userInitial}
          </div>
          <div className="ml-4">
            <div className="text-white text-sm truncate max-w-[150px] ">{user?.email || "guest@example.com"}</div>
            <div className="text-gray-400 text-sm">{user?.role || "User"}</div>
          </div>
        </div>
       {/* Theme Toggle */}
 <Tooltip title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}>
  <IconButton size="small" onClick={handleThemeToggle}>
    {currentTheme === "dark" ? (
      <Sun size={18} className="text-yellow-500" />
    ) : (
       <Moon size={18} className="text-blue-500" />
     )}
  </IconButton>
</Tooltip>

      </div>

      {/* Body */}
      <div className="mb-4">
        <Button
          fullWidth
          onClick={handleProfile}

          startIcon={<User size={16} />}
          className="!justify-start !text-gray-300 hover:!text-white hover:!bg-gray-800"
           sx={{ textTransform: 'none' }} 
        >
          Profile Page
        </Button>

        <Button
          fullWidth
           onClick={handlecompany}

          startIcon={<Briefcase size={16} />}
          className="!justify-start !text-gray-300 hover:!text-white hover:!bg-gray-800 "
           sx={{ textTransform: 'none' }} 
        >
          Company
        </Button>

        <Button
          fullWidth
          startIcon={<FileText size={16} />}
          className="!justify-start !text-gray-300 hover:!text-white hover:!bg-gray-800 "
           sx={{ textTransform: 'none' }} 
        >
          Change Themes
        </Button>

        <Button
          fullWidth
          startIcon={<FileText size={16} />}
          className="!justify-start !text-gray-300 hover:!text-white hover:!bg-gray-800"
           sx={{ textTransform: 'none' }} 
        >
          Documentation
        </Button>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t border-gray-700 pt-4">
        <div className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white">
          <HelpCircle size={16} />
          <span>Help</span>
        </div>
        <div
          onClick={handleSignOut}
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileModalSidebar;
