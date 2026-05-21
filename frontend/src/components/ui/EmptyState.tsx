import React from 'react';

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ 
  message, 
  icon, 
  className = '' 
}: EmptyStateProps) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && <div className="mb-6">{icon}</div>}
      <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;