import type { ReactNode } from 'react';

interface DataTableProps<T> {
  columns: Array<{
    header: string;
    accessor: keyof T;
    render?: (value: any, row: T) => ReactNode;
  }>;
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const DataTable = <T,>({ columns, data, loading, emptyMessage = 'No data found', className = '' }: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="animate-pulse bg-gray-50">
        <table className="w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.accessor)} className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="py-6 text-center text-gray-400">
                Loading...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.accessor)}
                className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={`${index}-${row[columns[0].accessor]}`} className="hover:bg-gray-50">
              {columns.map((col) => {
                const value = row[col.accessor];
                if (col.render) {
                  return (
                    <td key={String(col.accessor)} className="py-4 px-4 text-sm text-gray-900">
                      {col.render(value, row)}
                    </td>
                  );
                }
                return (
                  <td key={String(col.accessor)} className="py-4 px-4 text-sm text-gray-900">
                    {value !== null && value !== undefined ? String(value) : '--'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;