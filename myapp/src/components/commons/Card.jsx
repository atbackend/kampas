// Card.jsx
export const Card = ({ title, children, className = "" }) => (
  <div 
    className={`rounded-2xl p-8 shadow-sm border transition-all duration-200 ${className}`}
    style={{
      backgroundColor: "var(--color-card)",
      borderColor: "var(--color-border)"
    }}
  >
    {title && (
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--color-fg)" }}>
          {title}
        </h2>
        <p style={{ color: "var(--color-muted)" }}>
          Update your personal details and account settings
        </p>
      </div>
    )}
    {children}
  </div>
);