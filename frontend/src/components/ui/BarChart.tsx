interface BarChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  className?: string;
}

const BarChart = ({ 
  data = [], 
  height = 200, 
  className = '' 
}: BarChartProps) => {
  if (data.length === 0) {
    return (
      <div className={`h-${height} w-full ${className}`}>
        <div className="flex h-full items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const barHeight = height - 40; // Leave room for labels
  const barWidth = 30;
  const gap = 10;
  const startX = 20; // Padding for y-axis labels

  return (
    <div className={`relative h-${height} w-full ${className}`}>
      {/* X-axis label */}
      <div className="absolute bottom-0 left-0 w-full text-center text-xs text-gray-500 dark:text-gray-400 pb-2">
        {data.map((d, i) => (
          <span key={i} className="block" style={{ width: `${barWidth}px`, marginLeft: `${startX + i * (barWidth + gap)}px` }}>
            {d.name}
          </span>
        ))}
      </div>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full w-20 flex flex-col justify-between items-end pr-2">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <div key={i} className="mb-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">{Math.round(maxValue * ratio)}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <svg className="absolute inset-0" width="100%" height="100%">
        {data.map((d, i) => {
          const barHeightScaled = (d.value / maxValue) * barHeight;
          const x = startX + i * (barWidth + gap);
          const y = height - barHeightScaled - 20; // 20 for x-axis label at bottom

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeightScaled}
              fill="url(#barGradient)"
              rx="2"
            />
          );
        })}

        {/* Definitions for gradient */}
        <defs>
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.8 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.4 }} />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default BarChart;