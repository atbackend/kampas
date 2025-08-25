import { MapPin } from "lucide-react";
import { Card } from "./Card";

export const ProjectList = ({ projects, loading, selectedProjectId, onProjectSelect, searchTerm, filterStatus, onClearFilters }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
        <span className="text-sm text-gray-300">Loading projects...</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <MapPin size={32} className="mx-auto text-gray-500 mb-3" />
        <p className="text-sm text-gray-400 mb-2">
          {searchTerm || filterStatus !== 'all'
            ? "No projects match your criteria."
            : "No projects available."}
        </p>
        {(searchTerm || filterStatus !== 'all') && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {projects.map((project) => (
        <Card
          key={project.id}
          project={project}
          isSelected={project.id === selectedProjectId}
          onSelect={onProjectSelect}
        />
      ))}
    </div>
  );
};