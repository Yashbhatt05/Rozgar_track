import React from 'react';

interface StatusBadgeProps {
  variant: 'new' | 'reactivated' | 'active' | 'inactive';
  children: React.ReactNode;
  className?: string;
}

const StatusBadge = ({ variant, children, className = '' }: StatusBadgeProps) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const variantClasses = {
    new: 'bg-blue-100 text-blue-800',
    reactivated: 'bg-green-100 text-green-800',
    active: 'bg-purple-100 text-purple-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default StatusBadge;