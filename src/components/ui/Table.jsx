
import { useAuth } from '../../context/AuthContext';

export const Table = ({
  columns = [], // [{ key, header, render: (row) => ... }]
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  className = '',
  ...props
}) => {
  const { theme } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const tableHeaderClass = isDark
    ? 'bg-white/5 text-slate-300 border-white/10'
    : 'bg-slate-100 text-slate-600 border-slate-200';
  
  const tableRowClass = isDark
    ? 'hover:bg-white/5 border-white/5 text-slate-200'
    : 'hover:bg-slate-50 border-slate-100 text-slate-700';

  const skeletonBg = isDark ? 'bg-white/5 animate-pulse' : 'bg-slate-200 animate-pulse';

  return (
    <div className={`w-full overflow-x-auto rounded-xl border ${
      isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'
    } ${className}`} {...props}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className={`border-b ${tableHeaderClass}`}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="p-4 text-xs font-semibold uppercase tracking-wider select-none font-display"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <tr key={idx} className="border-b border-white/5">
                {columns.map((col) => (
                  <td key={col.key} className="p-4">
                    <div className={`h-4 rounded ${skeletonBg}`} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="p-8 text-center text-sm text-slate-500 font-medium font-sans"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                className={`transition-colors border-b ${tableRowClass}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="p-4 text-sm font-medium">
                    {col.render ? col.render(row) : row[col.key]}
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

export default Table;
