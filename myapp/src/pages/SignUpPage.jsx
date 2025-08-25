import { useState } from "react";
import { FaEnvelope, FaUser , FaBuilding, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";

import { useNavigate } from 'react-router-dom';

import { registerUser } from "../api/services/auth";
import LeftImageSection from "../components/LeftImageSection";

export default function SignupPage() {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    password: ""
  });

  const [errors, setErrors] = useState({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    password: "",
    general: ""
  });
const [touched, setTouched] = useState({
  email: false,
  firstName: false,
  lastName: false,
  companyName: false,
  password: false,
});
const [hasSubmitted, setHasSubmitted] = useState(false); // NEW

  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);


const runValidation = (data, options = {}) => {
  const { showGeneral = false } = options;
  const newErrors = {};
  const { email, firstName, lastName, companyName, password } = data;

  // Required checks
  if (!email) newErrors.email = "Email is required.";
  if (!firstName) newErrors.firstName = "First name is required.";
  if (!lastName) newErrors.lastName = "Last name is required.";
  if (!companyName) newErrors.companyName = "Company name is required.";
  if (!password) newErrors.password = "Password is required.";

  // First/Last format (only if present)
  if (firstName && !/^[A-Z][a-z]*$/.test(firstName)) {
    newErrors.firstName =
      "First name must start with a capital letter and rest lowercase.";
  }
  if (lastName && !/^[A-Z][a-z]*$/.test(lastName)) {
    newErrors.lastName =
      "Last name must start with a capital letter and rest lowercase.";
  }

  // Email validation
  if (email) {
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const atIndex = email.indexOf("@");
    const emailDomain = email.slice(atIndex + 1).toLowerCase();
    const genericDomains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "aol.com",
      "icloud.com",
      "protonmail.com"
    ];

    // Check basic format
    if (!basicEmailRegex.test(email) || atIndex === -1) {
      newErrors.email = "Enter a valid email address.";
    } else if (email !== email.toLowerCase()) {
      newErrors.email = "Email must be in lowercase.";
    } else if (genericDomains.includes(emailDomain)) {
      newErrors.email = "Generic domains (e.g., gmail.com) are not allowed.";
    }

 
  }

  // Password strength
  if (password) {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password =
        "Password must be 8+ chars, include 1 upper, 1 lower, 1 digit & 1 special character.";
    }
  }

  // General message (e.g. on submit)
  if (
    showGeneral &&
    (!email || !firstName || !lastName || !companyName || !password)
  ) {
    newErrors.general = "* All fields are required *";
  }

  setErrors(newErrors);
  return Object.values(newErrors).every((err) => err === "");
};
const handleInputChange = (fieldId, value) => {
  let newValue = value;

  // Auto-capitalize first letter for names
  if (fieldId === "firstName" || fieldId === "lastName") {
    newValue =
      value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  // Mark password field as touched when user starts typing
  if (fieldId === "password" && !touched[fieldId]) {
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
  }

  setFormData((prev) => {
    const updated = { ...prev, [fieldId]: newValue };

    // Real-time validation:
    // validate the whole form (needed for cross-field rules like email/company)
    // but don't show general message while typing
    if (touched[fieldId] || hasSubmitted || fieldId === "password") {
      runValidation(updated, { showGeneral: hasSubmitted });
    }

    return updated;
  });
};

const handleBlur = (fieldId) => {
  setTouched((prev) => {
    const updated = { ...prev, [fieldId]: true };
    return updated;
  });

  // Validate after blur using current formData (no general yet unless submitted)
  runValidation(formData, { showGeneral: hasSubmitted });
};

const signupFields = [
  {
    id: "firstName",
    label: "First Name",
    type: "text",
    required: true,
    icon: <FaUser /> // Replace with your actual icon if available
  },
  {
    id: "lastName",
    label: "Last Name",
    type: "text",
    required: true,
    icon: <FaUser />
  },
  {
    id: "companyName",
    label: "Company Name",
    type: "text",
    required: true,
    icon: <FaBuilding /> // Replace with your actual icon
  },
  {
    id: "email",
    label: "Email",
    type: "email",
    required: true,
    icon: <FaEnvelope /> // Replace with your actual icon
  },
  {
    id: "password",
    label: "Password",
    type: "password",
    required: true,
    icon: <FaLock /> // Replace with your actual icon
  }
];

// --- helper ---------------------------------------------------------------
const extractErrorMessage = (
  error,
  fallback = "Registration failed. Please try again."
) => {
  const data = error?.response?.data;

  // No response data? fall back to network/message text.
  if (!data) return error?.message || fallback;

  // DRF-style top-level non_field_errors
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return data.non_field_errors.join(", ");
  }

  // Common single-key patterns
  for (const key of ["message", "error", "detail"]) {
    if (data[key]) {
      return Array.isArray(data[key]) ? data[key].join(", ") : String(data[key]);
    }
  }

  // Validation dict/array patterns
  if (data.errors) {
    const errs = data.errors;
    if (Array.isArray(errs)) return errs.join(", ");
    if (typeof errs === "object") {
      return Object.values(errs)
        .flat()
        .map(String)
        .join(", ");
    }
    return String(errs);
  }

  // Fallback: flatten any remaining object values (arrays/strings)
  if (typeof data === "object") {
    return Object.values(data)
      .flat()
      .map(String)
      .join(", ");
  }

  return String(data);
};

// --- submit handler -------------------------------------------------------
const handleSubmit = async (e) => {
  e.preventDefault();

  setHasSubmitted(true); // Mark that the user attempted submission

  // Run validation before attempting API call
  if (!runValidation(formData, { showGeneral: true })) return;

  setIsLoading(true);
  try {
    const payload = {
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      company_name: formData.companyName,
      password: formData.password,
    };

    // registerUser should return either axios response or already-unwrapped data
    const response = await registerUser(payload);
    const data = response?.data ?? response; // normalize

    const token = data?.token ?? response?.token;
    const firstName = data?.first_name ?? response?.first_name ?? formData.firstName;
    const lastName = data?.last_name ?? response?.last_name ?? formData.lastName;
    const email = data?.email ?? response?.email ?? formData.email;

    if (token) localStorage.setItem("verifyToken", token);
    localStorage.setItem("firstName", firstName);
    localStorage.setItem("lastName", lastName);
    localStorage.setItem("email", email);

    const successMessage =
      data?.message ||
      response?.message ||
      "Registration successful! Please verify your email.";

    toast.success(successMessage, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        backgroundColor: "#1e3a8a",
        color: "#fff",
        fontWeight: "bold",
        borderRadius: "8px",
        fontSize: "14px",
      },
    });

    setTimeout(() => navigate("/sign-in"), 2000);
  } catch (error) {
    console.error("Registration error:", error.response?.data || error.message);

    const errorMessage = extractErrorMessage(error);

    toast.error(errorMessage, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: {
        backgroundColor: "#dc2626",
        color: "#fff",
        fontWeight: "bold",
        borderRadius: "8px",
        fontSize: "14px",
      },
    });
  } finally {
    setIsLoading(false);
  }
};



  return (
    <div className="flex h-screen overflow-hidden">
      <LeftImageSection
        title="Welcome to Patrosoft"
        description="Patrosoft is an advanced AI-based software designed to revolutionize the inspection of powerline towers..."
        backgroundColor="bg-gradient-to-br from-blue-500 to-blue-600"
      />
   
      {/* Right Form Section */}
      <div className="w-1/2 h-full flex flex-col justify-center items-center px-10 bg-gray-50">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold mb-2 text-gray-800">Sign Up</h1>

          <form className="space-y-4 mt-8" onSubmit={handleSubmit}>
            {hasSubmitted &&  errors.general && (
              <p className="text-red-500 text-sm">{errors.general}</p>
            )}
            {signupFields.map((field) => (
              <div key={field.id} className="mb-4">
                <div className="relative">
                  <input
                    type={field.type === "password" && showPassword ? "text" : field.type}
                    placeholder={field.label}
                    value={formData[field.id] || ""}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-800 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    // disabled={isLoading}
                     onBlur={() => handleBlur(field.id)}     
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {field.icon}
                  </div>
                  {field.id === "password" && (
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {/* Validation message */}
              {(hasSubmitted || touched[field.id]) && errors[field.id] && (
                  <p className="text-xs text-red-500 px-1">{errors[field.id]}</p>
                )}
              </div>
            ))}

            <div className="flex items-center space-x-2 mt-6 mb-4">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:cursor-not-allowed flex-shrink-0"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:underline font-medium">
                  terms and conditions
                </a>
              </label>
            </div>

            <button
              type="submit"
              disabled={!acceptedTerms || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 mt-2 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing Up...
                </>
              ) : (
                "Sign Up"
              )}
            </button>

            <p className="text-sm text-center mt-4 text-gray-600">
              Already have an account?{" "}
              <a href="/sign-in" className="text-blue-600 hover:underline font-medium">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
