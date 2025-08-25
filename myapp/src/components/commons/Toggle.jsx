
export const Toggle = ({ checked, onChange, disabled = false, size = "md" }) => {
  const sizes = {
    sm: { container: "h-5 w-9", thumb: "h-3 w-3", translate: "translate-x-5" },
    md: { container: "h-6 w-11", thumb: "h-4 w-4", translate: "translate-x-6" },
    lg: { container: "h-7 w-13", thumb: "h-5 w-5", translate: "translate-x-7" }
  };

  const sizeConfig = sizes[size];

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex items-center rounded-full transition-colors duration-200 
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${sizeConfig.container}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        backgroundColor: checked ? "var(--color-success)" : "var(--color-border)",
        focusRingColor: "var(--color-accent)",
        focusRingOffsetColor: "var(--color-bg)"
      }}
      disabled={disabled}
    >
      <span
        className={`
          inline-block transform rounded-full bg-white transition-transform duration-200
          ${sizeConfig.thumb}
          ${checked ? sizeConfig.translate : 'translate-x-1'}
        `}
        style={{ boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}
      />
    </button>
  );
};