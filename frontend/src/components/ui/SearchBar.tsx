import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = 'Search jobs...', 
  className = '' 
}: SearchBarProps) => {
  return (
    <div className={`relative w-full max-w-xs ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full pl-10 pr-3 py-2 px-2 border border-gray-300 rounded-md 
                   bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                   sm:text-sm`}
      />
    </div>
  );
};

export default SearchBar;