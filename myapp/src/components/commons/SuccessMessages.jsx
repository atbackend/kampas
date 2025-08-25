export const SuccessMessage = ({ message, className = "" }) => (
  <div className={`bg-green-500/10 border border-green-500/30 rounded-xl p-4 ${className}`}>
    <p className="text-green-400 text-sm flex items-center gap-2">
      <CheckCircle size={16} />
      {message}
    </p>
  </div>
);