interface MetricCardProps {
  title: string;
  value: string;
  trend: number; // positive for up, negative for down
  isNegative?: boolean; // if the trend is negative (e.g., failure rate)
  tooltip?: string;
  className?: string;
}

const MetricCard = ({ 
  title, 
  value, 
  trend, 
  tooltip, 
  className = '' 
}: MetricCardProps) => {
  const trendColor = trend > 0 ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend > 0 ? '↑' : '↓';
  const trendLabel = trend > 0 ? 'up' : 'down';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
      {tooltip && (
        <div className="relative inline-block ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18.104 7.766a.75.75 0 00-1.07-.236l-7 4a.75.75 0 000 1.272l7 4a.75.75 0 101.07-.236l-5.714-3.27a1.5 1.5 0 010-2.478l5.714-3.27z" clipRule="evenodd" />
          </svg>
          <div className="absolute left-0 z-10 mt-2 w-32 px-3 py-2 text-xs font-medium text-white bg-gray-800 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
            {tooltip}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {trend !== 0 ? (
            <>
              <span className={`mr-1 ${trendColor}`}>{trendIcon}</span>
              <span className={`${trendColor}`}>
                {Math.abs(trend)}% {trendLabel}
              </span>
            </>
          ) : (
            <span className="text-gray-500 dark:text-gray-400"> — </span>
          )}
        </p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

export default MetricCard;