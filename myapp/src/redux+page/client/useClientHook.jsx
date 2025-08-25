// hooks/useClientForm.js
import { useState, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";

export const useClientForm = (editingClient) => {
  const { clients } = useSelector((state) => state.clients);
  const [formData, setFormData] = useState({
    company_name: "",
    email: "",
    primary_contact: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pin: "",
    country: "",
    client_type: "individual",
    description: "",
    status: true,
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [hasSelectedFromDropdown, setHasSelectedFromDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Load client data if editing
  useEffect(() => {
    if (editingClient) {
      setFormData({
        company_name: editingClient.company_name || editingClient.companyName || "",
        email: editingClient.email || "",
        primary_contact: editingClient.primary_contact || "",
        phone: editingClient.phone || "",
        address: editingClient.address || "",
        city: editingClient.city || "",
        state: editingClient.state || "",
        pin: editingClient.pin || "",
        country: editingClient.country || "",
        client_type: (editingClient.client_type || "individual").toLowerCase(),
        description: editingClient.description || "",
        status: editingClient.status !== undefined ? editingClient.status : true,
      });
    } else {
      setFormData({
        company_name: "",
        email: "",
        primary_contact: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pin: "",
        country: "",
        client_type: "individual",
        description: "",
        status: true,
      });
    }
    setValidationErrors({});
  }, [editingClient]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCompanyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "company_name") {
      setHasSelectedFromDropdown(false);
      setShowCompanyDropdown(value.length >= 2);
    }

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const filteredCompanies = useMemo(() => {
    if (formData.company_name.length < 2 || hasSelectedFromDropdown) return [];
    const searchTerm = formData.company_name.toLowerCase().trim();
    return clients
      .filter((c) => (c.company_name || "").toLowerCase().includes(searchTerm))
      .slice(0, 10);
  }, [clients, formData.company_name, hasSelectedFromDropdown]);

  const handleCompanySelect = (company) => {
    setFormData((prev) => ({ ...prev, company_name: company.company_name }));
    setShowCompanyDropdown(false);
    setHasSelectedFromDropdown(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.company_name.trim()) errors.company_name = "Company name required";
    if (!formData.email.trim()) errors.email = "Email required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = "Invalid email";
    if (!formData.primary_contact.trim()) errors.primary_contact = "Primary contact required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    showCompanyDropdown,
    setShowCompanyDropdown,
    hasSelectedFromDropdown,
    setHasSelectedFromDropdown,
    dropdownRef,
    handleInputChange,
    filteredCompanies,
    handleCompanySelect,
    validateForm,
  };
};
