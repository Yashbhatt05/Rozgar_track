interface ErrorStateProps {
  message: string;
  className?: string;
}

const ErrorState = ({ 
  message, 
  className = '' 
}: ErrorStateProps) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-lg text-red-500 dark:text-red-400 max-w-xl mx-auto">
        {message}
      </p>
    </div>
  );
};

export default ErrorState;