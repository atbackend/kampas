const IconButton = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
  >
    <Icon size={20} />
    <span className="text-sm">{label}</span>
  </button>
);

export default IconButton;
