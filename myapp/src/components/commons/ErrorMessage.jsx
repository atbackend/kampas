// ErrorMessage.jsx
export const ErrorMessage = ({ message, className = "" }) => (
  <div className={`rounded-xl p-4 border ${className}`} style={{
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    color: "var(--color-error)"
  }}>
    <div className="flex items-center gap-3">
      <XCircle className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  </div>
);

