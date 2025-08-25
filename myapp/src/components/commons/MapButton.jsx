// src/components/MapControlButton.jsx
import { motion } from "framer-motion";

const MapControlButton = ({ onClick, active, children, title }) => {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      className="bg-blue-200 shadow-md px-3 py-2 rounded hover:bg-gray-100"
      animate={{
        scale: active ? 1.15 : 1,   // bigger when active
      }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
    >
      {children}
    </motion.button>
  );
};

export default MapControlButton;
