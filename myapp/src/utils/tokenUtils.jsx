// utils/tokenUtils.js
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Add 30 seconds buffer to account for network delays
    return payload.exp < (currentTime + 30);
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
};

export const getTokenExpiryTime = (token) => {
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error decoding token expiry:', error);
    return null;
  }
};

export const getTimeUntilExpiry = (token) => {
  const expiryTime = getTokenExpiryTime(token);
  if (!expiryTime) return 0;
  
  return Math.max(0, expiryTime - Date.now());
};
