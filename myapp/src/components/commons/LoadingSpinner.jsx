export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <div className={`${sizes[size]} border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin ${className}`}></div>
  );
};