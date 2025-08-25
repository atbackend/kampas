const AlertBox = ({ type = "success", message }) => {
  const color = type === "success" ? "green" : "red";
  const icon = type === "success" ? "✓" : "!";

  return (
    <div className={`mb-4 p-3 bg-${color}-500 bg-opacity-20 border border-${color}-500 rounded-lg`}>
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 bg-${color}-500 rounded-full flex items-center justify-center`}>
          <span className="text-white text-xs">{icon}</span>
        </div>
        <span className={`text-${color}-300 text-sm`}>{message}</span>
      </div>
    </div>
  );
};

export default AlertBox;
