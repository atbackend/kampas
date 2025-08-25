import { NavLink } from "react-router-dom";

const SidebarItem = ({ name, icon, path, isExpanded }) => {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `group flex items-center gap-4 px-3 py-2 rounded-lg w-full 
         transition-all duration-300 ease-in-out
         ${
           isActive
             ? "bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
             : "hover:bg-gray-100 dark:hover:bg-gray-700 text-black dark:text-white"
         }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Icon */}
          <div
            className={`text-xl font-medium transition-all duration-300 transform 
                        group-hover:scale-125
                        ${
                          isActive
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-black dark:text-white"
                        }`}
          >
            {icon}
          </div>

          {/* Text */}
          {isExpanded && (
            <span
              className={`font-medium whitespace-nowrap transition-all duration-300 
                          transform group-hover:scale-110
                          ${
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-black dark:text-white "
                          }`}
            >
              {name}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export default SidebarItem;
