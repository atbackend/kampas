import React, { useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ProjectPagination = ({ 
  totalItems, 
  itemsPerPage = 10, 
  currentPage, 
  onPageChange,
  className = ""
}) => {
  // Memoize pagination calculations to prevent recalculation on every render
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    // Calculate visible page numbers (show 5 pages around current page)
    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];
      
      for (let i = Math.max(2, currentPage - delta); 
           i <= Math.min(totalPages - 1, currentPage + delta); 
           i++) {
        range.push(i);
      }
      
      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }
      
      rangeWithDots.push(...range);
      
      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
      
      return rangeWithDots;
    };

    return {
      totalPages,
      startIndex,
      endIndex,
      visiblePages: totalPages > 1 ? getVisiblePages() : [],
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
      showingText: totalItems > 0 ? `${startIndex + 1}-${endIndex} of ${totalItems}` : '0 items'
    };
  }, [totalItems, itemsPerPage, currentPage]);

  // Memoize event handlers to prevent child re-renders
  const handleFirstPage = useCallback(() => {
    if (paginationData.hasPrevious) {
      onPageChange(1);
    }
  }, [paginationData.hasPrevious, onPageChange]);

  const handlePreviousPage = useCallback(() => {
    if (paginationData.hasPrevious) {
      onPageChange(currentPage - 1);
    }
  }, [paginationData.hasPrevious, currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (paginationData.hasNext) {
      onPageChange(currentPage + 1);
    }
  }, [paginationData.hasNext, currentPage, onPageChange]);

  const handleLastPage = useCallback(() => {
    if (paginationData.hasNext) {
      onPageChange(paginationData.totalPages);
    }
  }, [paginationData.hasNext, paginationData.totalPages, onPageChange]);

  const handlePageClick = useCallback((page) => {
    if (page !== '...' && page !== currentPage) {
      onPageChange(page);
    }
  }, [currentPage, onPageChange]);

  // Don't render if there's only one page or no items
  if (paginationData.totalPages <= 1) {
    return (
      <div className={`flex justify-between items-center mt-6 text-gray-400 ${className}`}>
        <div className="text-sm">
          {paginationData.showingText}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 ${className}`}>
      {/* Items count */}
      <div className="text-sm text-gray-400">
        Showing {paginationData.showingText}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1">
        {/* First page */}
        <button
          onClick={handleFirstPage}
          disabled={!paginationData.hasPrevious}
          className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300 transition-colors"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous page */}
        <button
          onClick={handlePreviousPage}
          disabled={!paginationData.hasPrevious}
          className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300 transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center space-x-1">
          {paginationData.visiblePages.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-1 text-gray-500">...</span>
              ) : (
                <button
                  onClick={() => handlePageClick(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next page */}
        <button
          onClick={handleNextPage}
          disabled={!paginationData.hasNext}
          className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300 transition-colors"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last page */}
        <button
          onClick={handleLastPage}
          disabled={!paginationData.hasNext}
          className="p-2 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-800 disabled:hover:text-gray-300 transition-colors"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default React.memo(ProjectPagination);