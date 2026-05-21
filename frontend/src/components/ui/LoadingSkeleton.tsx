interface LoadingSkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
  animation?: 'pulse' | 'wave';
}

const LoadingSkeleton = ({ 
  height = 16, 
  width = '100%', 
  className = '', 
  animation = 'pulse' 
}: LoadingSkeletonProps) => {
  const animationClass = animation === 'pulse' ? 'animate-pulse' : 'animate-[wave_2s_linear_infinite]';
  
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-600 rounded ${animationClass} ${className}`}
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width
      }}
    />
  );
};

export default LoadingSkeleton;