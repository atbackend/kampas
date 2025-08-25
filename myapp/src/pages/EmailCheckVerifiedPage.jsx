// import React from 'react';
// import { CheckCircle, ArrowLeft } from 'lucide-react';

// export default function EmailVerifiedPage() {
//   return (
//     <div className="flex h-screen justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
//       <div className="bg-gray-800 bg-opacity-90 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        
//         {/* Back Button */}
//         <button
//           onClick={() => window.history.back()}
//           className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
//         >
//           <ArrowLeft size={20} />
//           <span className="text-sm">Back to Login</span>
//         </button>

//         {/* Success Icon */}
//         <div className="flex justify-center mb-6">
//           <div className="relative">
//             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
//               <CheckCircle size={48} className="text-white" />
//             </div>
//             <div className="absolute inset-0 w-20 h-20 bg-green-500 rounded-full animate-ping opacity-20"></div>
//           </div>
//         </div>

//         {/* Success Message */}
//         <div className="text-center mb-8">
//           <h2 className="text-white text-2xl font-semibold mb-4">Email Verified!</h2>
//           <p className="text-gray-400 text-sm mb-6">
//             Your email address has been successfully verified. You can now access all features of your account.
//           </p>
//         </div>

//         {/* Success Alert */}
//         <div className="mb-6 p-4 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
//           <div className="flex items-center gap-3">
//             <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
//               <span className="text-white text-xs">✓</span>
//             </div>
//             <div>
//               <span className="text-green-300 text-sm font-medium block">Verification Complete</span>
//               <span className="text-green-400 text-xs">Your account is now fully activated</span>
//             </div>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="space-y-3">
//           <button
//             onClick={() => window.location.href = '/dashboard'}
//             className="w-full font-semibold py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200"
//           >
//             Go to Dashboard
//           </button>
          
//           <button
//             onClick={() => window.location.href = '/login'}
//             className="w-full font-semibold py-3 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
//           >
//             Back to Login
//           </button>
//         </div>

//         {/* Additional Info */}
//         <div className="mt-6 text-xs text-gray-500 text-center border-t border-gray-600 pt-4">
//           <p className="text-gray-400 mb-2">What's next?</p>
//           <div className="bg-gray-700 bg-opacity-50 p-3 rounded-lg text-left">
//             <p className="text-gray-300 mb-1">✓ Complete your profile</p>
//             <p className="text-gray-300 mb-1">✓ Explore available features</p>
//             <p className="text-gray-300">✓ Set up your preferences</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// src/pages/EmailVerifySuccess.js
import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function EmailVerifySuccess() {
  const navigate = useNavigate();
  // If you passed state when navigating, you can read it:
  const { state } = useLocation();
  const msg = state?.message || 'Email verified successfully.';
  const user = state?.user;

  return (
    <div className="flex h-screen justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="bg-gray-800 bg-opacity-90 p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle size={48} className="text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-green-500 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <h2 className="text-white text-2xl font-semibold mb-2">Email Verified!</h2>
        <p className="text-gray-400 text-sm mb-2">{msg}</p>
        {user?.email && (
          <p className="text-gray-500 text-xs mb-6">{user.email}</p>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full font-semibold py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-200"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}
