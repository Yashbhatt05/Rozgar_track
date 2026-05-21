interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showBoundaryLinks?: boolean;
}

const PaginationControls = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showBoundaryLinks = true,
  className = ''
}: PaginationControlsProps) => {
  const pageNumbers = [];
  
  // Always show first page
  if (showBoundaryLinks && totalPages > 1) {
    pageNumbers.push(1);
  }
  
  // Show ellipsis if needed
  if (currentPage > 3 && showBoundaryLinks) {
    pageNumbers.push(-1); // ellipsis
  }
  
  // Show pages around current page
  const startPage = Math.max(2, currentPage - 2);
  const endPage = Math.min(totalPages - 1, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  
  // Show ellipsis if needed
  if (currentPage < totalPages - 2 && showBoundaryLinks) {
    pageNumbers.push(-1); // ellipsis
  }
  
  // Always show last page
  if (showBoundaryLinks && totalPages > 1 && totalPages !== 1) {
    pageNumbers.push(totalPages);
  }

  return (
    <nav className={`${className} flex items-center justify-between px-4 py-3 border-t`}>
      <div className="flex-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className={`flex items-center justify-center w-10 h-10 rounded-md 
                     ${currentPage <= 1 ? 'opacity-25 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {pageNumbers.map((page, index) => {
            if (page === -1) {
              // Ellipsis
              return (
                <span key={index} className="mx-2 text-gray-500 dark:text-gray-400">
                  …
                </span>
              );
            }
            
            const isActive = page === currentPage;
            return (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`flex items-center justify-center w-10 h-10 rounded-md 
                         ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {page}
              </button>
            );
          })}
        </div>
        
        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className={`flex items-center justify-center w-10 h-10 rounded-md 
                     ${currentPage >= totalPages ? 'opacity-25 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default PaginationControls;