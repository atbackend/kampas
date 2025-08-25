
export const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md", 
  loading = false,
  disabled = false,
  icon: Icon,
  className = "",
  ...props
}) => {
  const baseClasses = "font-medium transition-all duration-200 flex items-center gap-2 justify-center focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "text-white shadow-lg",
    ghost: "bg-transparent hover:bg-opacity-10",
    danger: "text-white shadow-lg"
  };
  
  const sizes = {
    sm: "px-3 py-2 text-sm rounded-lg",
    md: "px-6 py-3 rounded-xl", 
    lg: "px-8 py-4 text-lg rounded-xl"
  };

  const getVariantStyles = () => {
    switch(variant) {
      case 'primary':
        return { 
          backgroundColor: "var(--color-accent)", 
          color: "white"
        };
      case 'ghost':
        return { 
          color: "var(--color-muted)",
          backgroundColor: "transparent"
        };
      case 'danger':
        return { 
          backgroundColor: "var(--color-error)", 
          color: "white"
        };
      default:
        return { 
          backgroundColor: "var(--color-accent)", 
          color: "white"
        };
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
      }`}
      style={{
        ...getVariantStyles(),
        focusRingColor: "var(--color-accent)"
      }}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      )}
      {children}
    </button>
  );
};
