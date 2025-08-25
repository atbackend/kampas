import { createSelector } from '@reduxjs/toolkit';

export const selectProjects = (state) => state.projects.projects;
export const selectSearchTerm = (state) => state.projects.searchTerm;
// add more selectors for other filters if needed

export const selectFilteredProjects = createSelector(
  [selectProjects, selectSearchTerm],
  (projects, searchTerm) => {
    if (!projects) return [];

    return projects.filter((project) =>
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
);

// Optional: paginated selector if needed
export const selectPaginatedProjects = createSelector(
  [selectFilteredProjects, state => state.projects.currentPage, state => state.projects.itemsPerPage],
  (filteredProjects, currentPage, itemsPerPage) => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }
);

// Total pages selector
export const selectTotalPages = createSelector(
  [selectFilteredProjects, state => state.projects.itemsPerPage],
  (filteredProjects, itemsPerPage) => {
    return Math.ceil(filteredProjects.length / itemsPerPage);
  }
);
