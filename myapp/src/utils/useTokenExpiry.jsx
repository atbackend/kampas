// hooks/useTokenExpiry.js
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../redux/authSlice';
import { isTokenExpired, getTimeUntilExpiry } from '../utils/tokenUtils';

export const useTokenExpiry = () => {
  const dispatch = useDispatch();
  const { accessToken, refreshToken, isAuthenticated } = useSelector(state => state.auth);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const logoutUser = useCallback(() => {
    console.log('🔴 Token expired - logging out user');
    dispatch(logout());
    window.location.href = '/sign-in';
  }, [dispatch]);

  const scheduleLogout = useCallback((token, tokenType) => {
    if (!token || !isAuthenticated) return;

    const timeUntilExpiry = getTimeUntilExpiry(token);
    
    if (timeUntilExpiry <= 0) {
      console.log(`🔴 ${tokenType} token already expired`);
      logoutUser();
      return;
    }

    console.log(`⏰ ${tokenType} token expires in ${Math.floor(timeUntilExpiry / 1000)}s`);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule logout slightly before token expires
    const logoutTime = Math.max(0, timeUntilExpiry - 5000); // 5 seconds before expiry
    
    timeoutRef.current = setTimeout(() => {
      console.log(`🔴 ${tokenType} token expiring - logging out`);
      logoutUser();
    }, logoutTime);

  }, [logoutUser, isAuthenticated]);

  const checkTokenStatus = useCallback(() => {
    if (!isAuthenticated) return;

    // Check access token
    if (accessToken && isTokenExpired(accessToken)) {
      console.log('🔴 Access token expired during check');
      logoutUser();
      return;
    }

    // Check refresh token
    if (refreshToken && isTokenExpired(refreshToken)) {
      console.log('🔴 Refresh token expired during check');
      logoutUser();
      return;
    }

    console.log('✅ Tokens are still valid');
  }, [accessToken, refreshToken, isAuthenticated, logoutUser]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Clear timers if not authenticated
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Initial check
    checkTokenStatus();

    // Schedule logout based on access token expiry
    scheduleLogout(accessToken, 'Access');

    // Set up periodic checks every 30 seconds
    intervalRef.current = setInterval(checkTokenStatus, 30000);

    // Cleanup function
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [accessToken, refreshToken, isAuthenticated, scheduleLogout, checkTokenStatus]);

  // Return token status for UI display
  return {
    isTokenValid: accessToken ? !isTokenExpired(accessToken) : false,
    accessTokenExpiry: accessToken ? getTimeUntilExpiry(accessToken) : 0,
    refreshTokenExpiry: refreshToken ? getTimeUntilExpiry(refreshToken) : 0
  };
};
