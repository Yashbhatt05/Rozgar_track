interface TrendCardProps {
  title: string;
  value: string;
  trend: number; // percentage change
  sparklineData: number[]; // data points for sparkline
  tooltip?: string;
  className?: string;
}

const TrendCard = ({ 
  title, 
  value, 
  trend, 
  sparklineData = [], 
  tooltip, 
  className = '' 
}: TrendCardProps) => {
  const trendColor = trend > 0 ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend > 0 ? '↑' : '↓';
  const trendLabel = trend > 0 ? 'up' : 'down';

  // Normalize sparkline data to 0-1 range for SVG path
  const getNormalizedPath = (data: number[]) => {
    if (data.length === 0) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) {
      // All values are the same
      return data.map((_, i) => `${i * 20 + 10} 50`).join(' ');
    }
    
    return data.map((value, i) => {
      const normalized = (value - min) / range;
      const y = 60 - (normalized * 40); // 40px height, 20px padding
      const x = i * 20 + 10;
      return `${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow duration-200 ${className}`}>
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
      
      {/* Sparkline */}
      {sparklineData.length > 0 && (
        <div className="mt-4 h-10">
          <svg className="w-full h-10" viewBox="0 0 100 60" preserveAspectRatio="none">
            <path
              d={`M ${getNormalizedPath(sparklineData)}`}
              fill="none"
              stroke="url(#sparklineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.6 }} />
                <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}
      
      {tooltip && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default TrendCard;