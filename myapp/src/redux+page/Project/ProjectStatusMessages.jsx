import React from 'react';

const ProjectStatusMessages = ({ successMessage, error }) => {
  if (!successMessage && !error) return null;

  return (
    <>
      {successMessage && (
        <div className="bg-green-800 border border-green-600 text-green-200 px-4 py-2 rounded mb-4">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-2 rounded mb-4">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      )}
    </>
  );
};

export default ProjectStatusMessages;