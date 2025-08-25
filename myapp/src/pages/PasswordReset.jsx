import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdLock, MdArrowBack, MdVisibility, MdVisibilityOff } from 'react-icons/md';

const PasswordResetPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const resetToken = searchParams.get('token');

  const clearMessages = () => {
    setSuccess('');
    setError('');
  };

  // Validation function
  const validateForm = () => {
    if (!newPassword) {
      setError('New password is required');
      return false;
    }
    if (!confirmPassword) {
      setError('Please confirm your password');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (!resetToken) {
      setError('Reset token is missing or invalid');
      return false;
    }
    return true;
  };

  const resetPassword = async ({ token, new_password, confirm_password }) => {
    try {
      const response = await axios.post(
        'http://192.168.29.247:1111/api/auth/reset-password/',
        {
          token,
          new_password,
          confirm_password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Success:', response.data);
      return response.data;
    } catch (error) {
      console.error('Full Reset Password Error:', error);
      throw error;
    }
  };

  // Fixed handlePasswordReset function
  const handlePasswordReset = async () => {
    clearMessages();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const result = await resetPassword({
        token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      
      setSuccess('Password reset successfully! Redirecting to login...');
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login'); // Adjust this path to your login route
      }, 2000);
      
    } catch (error) {
      console.error('Password reset error:', error);
      
      // Handle different types of errors
      if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error.response?.status === 400) {
        setError('Invalid or expired reset token. Please request a new password reset.');
      } else if (error.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePasswordReset();
    }
  };

  return (
    <div className="flex h-screen justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800 bg-opacity-90 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full text-white font-bold text-xl">
            <MdLock size={24} />
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <MdArrowBack size={20} />
          <span className="text-sm">Back to Login</span>
        </button>

        {/* Password Reset Heading */}
        <h2 className="text-white text-2xl font-semibold text-center mb-4">Reset Password</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Enter your new password below
        </p>

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-green-300 text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* New Password Input */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  clearMessages(); // Clear messages when user starts typing
                }}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showNewPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
            {/* Password strength indicator */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  <div className={`h-1 w-1/4 rounded ${newPassword.length >= 6 ? 'bg-red-500' : 'bg-gray-600'}`}></div>
                  <div className={`h-1 w-1/4 rounded ${newPassword.length >= 8 ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                  <div className={`h-1 w-1/4 rounded ${newPassword.length >= 10 && /[A-Z]/.test(newPassword) ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
                  <div className={`h-1 w-1/4 rounded ${newPassword.length >= 12 && /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {newPassword.length < 6 ? 'Too short' : 
                   newPassword.length < 8 ? 'Weak' : 
                   newPassword.length < 10 ? 'Fair' : 
                   /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'Strong' : 'Good'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearMessages(); // Clear messages when user starts typing
                }}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
            {/* Password match indicator */}
            {confirmPassword && (
              <div className="mt-2">
                <p className={`text-xs ${newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              </div>
            )}
          </div>

          {/* Reset Password Button */}
          <button
            onClick={handlePasswordReset}
            disabled={loading}
            className={`w-full font-semibold py-3 px-4 rounded-lg transition-all duration-200 ${
              loading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            } text-white`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Resetting...
              </div>
            ) : (
              "Reset Password"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;