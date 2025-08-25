// /pages/ConfirmEmail.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ForgotPassword } from '../api/services/auth';
import { MdEmail, MdArrowBack } from "react-icons/md";

const ConfirmEmail = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const clearMessages = () => {
    setSuccess('');
    setError('');
  };

  const handleEmailVerification = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const response = await ForgotPassword({ email });
      setSuccess('Verification email sent successfully! Please check your inbox.');
      setEmail('');
    } catch (err) {
      let message = 'Failed to send verification email.';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.code === 'ERR_NETWORK') {
        message = 'Network error. Please check your connection.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleEmailVerification();
  };


  return (
    <div className="flex h-screen justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800 bg-opacity-90 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full text-white font-bold text-xl">
            <MdEmail size={24} />
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

        {/* Email Verification Heading */}
        <h2 className="text-white text-2xl font-semibold text-center mb-4">Email Verification</h2>
        <p className="text-gray-400 text-sm text-center mb-8">
          Enter your email address to receive a verification link
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
          {/* Email Input */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Send Verification Button */}
          <button
            onClick={handleEmailVerification}
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
                Sending...
              </div>
            ) : (
              "Send Verification Email"
            )}
          </button>
        </div>

        {/* Demo Info */}
      </div>
    </div>
  );
};

export default ConfirmEmail;