// 11. USER AVATAR COMPONENT
export const UserAvatar = ({ 
  name, 
  size = "md", 
  src = null, 
  className = "" 
}) => {
  const sizes = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-16 h-16 text-lg"
  };

  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '??';

  return (
    <div className={`${sizes[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold ${className}`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};
