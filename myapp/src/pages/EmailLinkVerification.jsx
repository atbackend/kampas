import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLoader } from 'react-icons/fi';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState(null);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    console.log('Token from URL:', urlToken);

    if (!urlToken) {
      setError('Invalid or missing token in URL');
      toast.error('Invalid or missing token in URL');
      return;
    }

    setToken(urlToken);
    setShowCard(true);
  }, [searchParams]);

  const handleVerify = () => {
    setLoading(true);
    setError(null);

    axios
      .post('http://192.168.29.247:8000/api/auth/verify-email/', { token })
      .then((response) => {
        toast.success('Email verified successfully!');
        setUserInfo(response.data.user);
      })
      .catch((err) => {
        console.error('Verification error:', err);

        let errorMessage = 'Verification failed.';
        if (err.code === 'ERR_NETWORK') {
          errorMessage = 'Network error. Please check if the server is running.';
        } else if (err.response) {
          errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = 'No response from server. Please try again later.';
        }

        setError(errorMessage);
        toast.error(errorMessage);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white font-sans px-4">
      <div className="max-w-md w-full bg-[#1e293b] p-8 rounded-lg shadow-md">
        {loading && (
          <div className="flex flex-col items-center justify-center text-center">
            <FiLoader className="animate-spin text-3xl mb-4 text-blue-500" />
            <p className="text-lg font-medium">Verifying your email...</p>
          </div>
        )}

        {!loading && error && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-red-400">Verification Failed</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-6 py-2 bg-red-600 rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && userInfo && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-green-400">Welcome, {userInfo.first_name}!</h2>
            <p>Email: {userInfo.email}</p>
            <p className="mt-2">Your email has been successfully verified.</p>
            {/* Optionally: Add a button to go to login */}
            <a
              href="/sign-in"
              className="inline-block mt-4 text-sm text-blue-400 hover:underline"
            >
              Go to Login
            </a>
          </div>
        )}

        {!loading && !userInfo && !error && showCard && (
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Email Verification</h2>
            <p>Click the button below to verify your email address.</p>
            <button
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              onClick={handleVerify}
            >
              Verify Email
            </button>
          </div>
        )}

        {!loading && !showCard && !userInfo && !error && (
          <p className="text-center">Preparing verification...</p>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
