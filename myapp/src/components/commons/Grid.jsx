export const Grid = ({ 
  children, 
  cols = "grid-cols-1 md:grid-cols-2 xl:grid-cols-3", 
  gap = "gap-6", 
  className = "" 
}) => (
  <div className={`grid ${cols} ${gap} ${className}`}>
    {children}
  </div>
);
