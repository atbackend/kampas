import React from 'react';

const LeftImageSection = ({ 
  title = "Welcome to Patrosoft", 
  description = "Patrosoft is an advanced AI-based software designed to revolutionize the inspection of powerline towers. By analyzing images and videos captured by drones, helicopters, or handheld cameras, Patrosoft detects faults with unmatched precision, ensuring your grid stays reliable and efficient.",
  backgroundColor = "bg-gradient-to-br from-blue-500 to-blue-600",
  textColor = "text-white"
}) => {
  return (
    <div className={`w-1/2 h-full flex flex-col justify-center items-start px-12 ${backgroundColor} ${textColor}`}>
      <div className="max-w-md">
        <h1 className="text-4xl font-bold mb-8 leading-tight">
          {title}
        </h1>
        <p className="text-lg leading-relaxed opacity-90">
          {description}
        </p>
      </div>
    </div>
  );
};

export default LeftImageSection;