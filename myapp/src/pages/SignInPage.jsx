import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { loginUser } from '../redux/authSlice';
import { FaEye, FaEyeSlash } from "react-icons/fa";
/* ------------------------------------------------------------------
 * Validation helpers
 * ------------------------------------------------------------------ */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericDomains = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "protonmail.com"
];

function runValidation(fields, { touched = {}, showGeneral = false } = {}) {
  const { email, password } = fields;
  const fieldErrors = {};

  // email -----------------------------------------------------------
  if (showGeneral || touched.email) {
    const e = email?.trim() ?? '';
    const atIndex = e.indexOf("@");
    const domain = e.slice(atIndex + 1).toLowerCase();

    if (!e) {
      fieldErrors.email = 'Email is required.';
    } else if (!emailRegex.test(e) || atIndex === -1) {
      fieldErrors.email = 'Please enter a valid email address.';
    } else if (e !== e.toLowerCase()) {
      fieldErrors.email = 'Email must be in lowercase.';
    } else if (genericDomains.includes(domain)) {
      fieldErrors.email = 'Generic email domains (e.g., gmail.com) are not allowed.';
    }
  }

  // password --------------------------------------------------------
  if (showGeneral || touched.password) {
    const raw = password ?? '';
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      fieldErrors.password = 'Password is required.';
    } else {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
      if (!strongPasswordRegex.test(raw)) {
        fieldErrors.password =
          'Password must be 8+ chars, include 1 upper, 1 lower, 1 digit & 1 special character.';
      }
    }
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;
  const generalError = hasErrors && showGeneral ? 'Please correct the highlighted fields.' : null;

  return {
    isValid: !hasErrors,
    fieldErrors,
    generalError,
  };
}


/* ------------------------------------------------------------------
 * API Error Normalizer
 * ------------------------------------------------------------------ */
function parseApiError(err) {
  if (!err) return 'Login failed.';
  if (typeof err === 'string') return err; // payload passed directly
  if (err?.error) return err.error; // { error: "Invalid email or password" }
  if (err?.detail) return err.detail; // Django REST / FastAPI style
  if (Array.isArray(err?.non_field_errors) && err.non_field_errors.length > 0) return err.non_field_errors[0];
  if (err?.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch (_) {
    return 'Login failed.';
  }
}

/* ------------------------------------------------------------------
 * SignInPage Component
 * ------------------------------------------------------------------ */
const SignInPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  

  // global auth slice state
  const { loading, error: authError } = useSelector((state) => state.auth);

  // form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);

  // track which fields the user has interacted with
  const [touched, setTouched] = useState({ email: false, password: false });

  // validation state
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);

  // ----- session check -----
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      navigate('/'); // Redirect to home page if session exists
    }
  }, [navigate]);

  /* ----------------------------------------------------------------
   * Helper: mark field touched (only once)
   * ---------------------------------------------------------------- */
  const markTouchedIfNeeded = useCallback((field) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  /* ----------------------------------------------------------------
   * Re-validate when fields change (real-time) — only for touched fields
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const { fieldErrors, generalError } = runValidation(
      { email, password },
      { touched, showGeneral: false }
    );
    setFieldErrors(fieldErrors);
    // don't override submit-time generalError during typing; clear only if no errors
    if (!Object.keys(fieldErrors).length) setGeneralError(null);
  }, [email, password, touched]);

  /* ----------------------------------------------------------------
   * onBlur handlers mark field as touched
   * ---------------------------------------------------------------- */
  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /* ----------------------------------------------------------------
   * Submit
   * ---------------------------------------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // run full validation (show all errors)
    const { isValid, fieldErrors, generalError } = runValidation(
      { email, password },
      { showGeneral: true }
    );
    setFieldErrors(fieldErrors);
    setGeneralError(generalError);

    if (!isValid) {
      toast.error(generalError || 'Please fix the errors below.');
      // mark all fields touched so inline errors show
      setTouched({ email: true, password: true });
      return;
    }

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();
      // tokens, user data, etc. available in result
      toast.success('Signed in successfully!');
      navigate('/');
    } catch (err) {
      const msg = parseApiError(err);
      setGeneralError(msg);
      toast.error(msg);
    }
  };
 const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  /* ----------------------------------------------------------------
   * Derived display error from Redux auth slice (if any) BUT prefer local generalError
   * ---------------------------------------------------------------- */
  const apiErrorFromRedux = authError ? parseApiError(authError) : null;
  const topLevelError = generalError || apiErrorFromRedux;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-700 text-white px-4">
      {/* Logo Section */}
      <div className="mb-6">
        <img src="/logo-image.png" alt="Logo"   className="w-64 h-16"/>
       
</div>

      {/* Login Form */}
      <div className="p-6 bg-gray-800 rounded-md shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <form onSubmit={handleSubmit} noValidate>
          {/* Top-level general / API error */}
          {topLevelError && (
            <p className="text-red-500 text-sm mb-4">{topLevelError}</p>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                markTouchedIfNeeded('email'); // mark touched on first change
              }}
              onBlur={() => handleBlur('email')}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="mb-4">
  <label htmlFor="password" className="block text-sm font-medium mb-1">
    Password
  </label>
  <div className="relative">
    <input
      id="password"
      type={showPassword ? 'text' : 'password'} // Toggle between text and password
      name="password"
      className={`w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        fieldErrors.password ? 'border-red-500' : 'border-gray-600'
      }`}
      placeholder="Enter your password"
      value={password}
      onChange={(e) => {
        setPassword(e.target.value);
        // markTouchedIfNeeded('password'); // Uncomment if needed
      }}
      onBlur={() => handleBlur('password')}
      aria-invalid={!!fieldErrors.password}
      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
    />
    <button
      type="button"
      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200 focus:outline-none focus:text-gray-200"
      onClick={() => setShowPassword(!showPassword)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
    {showPassword ? <FaEyeSlash /> : <FaEye />}
    </button>
  </div>
  {fieldErrors.password && (
    <p id="password-error" className="mt-1 text-xs text-red-400">
      {fieldErrors.password}
    </p>
  )}
</div>

          {/* "Don't remember password?" */}
          <div className="mb-4 text-right">
            <Link to="/confirm-email" className="text-sm text-indigo-400 hover:underline">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          {/* <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin w-5 h-5" />
              </div>
            ) : (
              'Sign In'
            )}
          </button> */}
            <button
            type="submit"
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
                Loading...
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>

      {/* Footer Section */}
      <div className="mt-6 text-center">
        <p className="text-sm">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-indigo-400 hover:underline">
            Sign up.
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
