import React from 'react';

const DataTable = ({ 
  columns, 
  data, 
  loading = false,
  emptyMessage = "No data available",
  className = "",
  rowClassName = "",
  onRowClick
}) => {
  if (loading) {
    return (
      <div className={`overflow-x-auto bg-gray-700 rounded-lg shadow-lg border border-gray-700 ${className}`}>
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto bg-gray-750 rounded-lg shadow-lg border border-gray-600 ${className}`}>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-gray-900 to-gray-900 border-b border-gray-600">
            {columns.map((column, index) => (
              <th 
                key={column.key || index}
                className={`p-4 text-left text-gray-200 font-semibold text-sm uppercase tracking-wider ${column.headerClassName || ''}`}
                style={{ width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td 
                colSpan={columns.length} 
                className="p-12 text-center text-gray-400 bg-gray-800"
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-2">
                    <span className="text-gray-500 text-xl">📋</span>
                  </div>
                  {emptyMessage}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr 
                key={row.id || rowIndex}
                className={`
                  border-b border-gray-700 hover:bg-gray-700 transition-all duration-200
                  ${rowIndex % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}
                  ${onRowClick ? 'cursor-pointer hover:shadow-md' : ''}
                  ${rowClassName}
                `}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
              >
                {columns.map((column, colIndex) => (
                  <td 
                    key={column.key || colIndex}
                    className={`p-4 text-gray-300 ${column.cellClassName || ''}`}
                  >
                    {column.render 
                      ? column.render(row[column.key], row, rowIndex)
                      : row[column.key]
                    }
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;