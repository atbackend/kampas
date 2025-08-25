// PageLayout.jsx
export const PageLayout = ({ children, className = "" }) => (
  <div
    className={`min-h-screen ${className}`}
    style={{
      backgroundColor: "var(--color-bg)",
      color: "var(--color-fg)",
    }}
  >
    <div className="max-w-6xl mx-auto p-6">
      {children}
    </div>
  </div>
);
