// Enhanced App.js
import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppWrapper from "./AppWrapper";
import { useDispatch, useSelector } from 'react-redux';
import { logout } from './redux/authSlice';
import { useTokenExpiry } from './utils/useTokenExpiry';
import { isTokenExpired } from './utils/tokenUtils';


const App = () => {
  const currentTheme = useSelector((state) => state.theme.mode);
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector(state => state.auth);
  
  // Use the token expiry hook
  useTokenExpiry();
 useEffect(() => {
    if (currentTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [currentTheme]);

  // Initial token validation on app load
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    console.log("🔍 Checking stored tokens on app load");
    
    if (!storedAccessToken || !storedRefreshToken) {
      console.log("🔴 No tokens found - logging out");
      dispatch(logout());
      const publicRoutes = ["/sign-in", "/signup", "/verify-email", "/emailres", "/emailpass", "/reset-password"];
      if (!publicRoutes.includes(window.location.pathname)) {
        window.location.href = "/sign-in";
      }
      return;
    }

    // Check if tokens are expired
    if (isTokenExpired(storedAccessToken)) {
      console.log("🔴 Access token expired on app load - logging out");
      dispatch(logout());
      window.location.href = "/sign-in";
      return;
    }

    if (isTokenExpired(storedRefreshToken)) {
      console.log("🔴 Refresh token expired on app load - logging out");
      dispatch(logout());
      window.location.href = "/sign-in";
      return;
    }

    console.log("✅ Tokens are valid on app load");
  }, [dispatch]);

  // Handle multi-tab signin/signout
  useEffect(() => {
    const onStorageChange = (e) => {
      if (e.key === "accessToken" || e.key === "refreshToken" || e.key === "isLoggedOut") {
        const currentAccessToken = localStorage.getItem('accessToken');
        const currentRefreshToken = localStorage.getItem('refreshToken');
        const isLoggedOut = localStorage.getItem('isLoggedOut');

        console.log("🔍 Storage change detected:", e.key);

        if (isLoggedOut === 'true') {
          console.log("🔴 Logout flag detected from another tab");
          dispatch(logout());
          window.location.href = "/sign-in";
        } else if (!currentAccessToken || !currentRefreshToken) {
          console.log("🔴 Tokens removed in another tab");
          dispatch(logout());
          window.location.href = "/sign-in";
        }
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener("storage", onStorageChange);
    };
  }, [dispatch]);

  // Focus/visibility change handler for additional token checks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && accessToken) {
        console.log("🔍 Tab became visible - checking token validity");
        if (isTokenExpired(accessToken)) {
          console.log("🔴 Token expired while tab was hidden");
          dispatch(logout());
          window.location.href = "/sign-in";
        }
      }
    };

    const handleFocus = () => {
      if (accessToken) {
        console.log("🔍 Window focused - checking token validity");
        if (isTokenExpired(accessToken)) {
          console.log("🔴 Token expired while window was unfocused");
          dispatch(logout());
          window.location.href = "/sign-in";
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [accessToken, dispatch]);

  return (
    <Router>
      <AppWrapper />
    </Router>
  );
};

export default App;