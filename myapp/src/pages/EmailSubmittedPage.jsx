import React from 'react';

const EmailSubmittedPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white shadow-xl p-8 rounded-xl max-w-lg w-full text-center">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Registration Successful 🎉</h2>
        <p className="text-gray-700 text-base">
          Your account has been created successfully. Please wait for the admin to verify your email.
        </p>
        <p className="mt-4 text-gray-500 text-sm">
          You will receive a confirmation once your email is approved.
        </p>
      </div>
    </div>
  );
};

export default EmailSubmittedPage;
