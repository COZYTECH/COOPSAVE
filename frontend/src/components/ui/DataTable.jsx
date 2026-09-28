export const DataTable = ({ columns, rows, emptyMessage = 'No records found.', plain = false }) => {
  return (
    <div className={plain ? 'overflow-x-auto overscroll-x-contain' : 'overflow-hidden rounded-xl border border-pamoja-forest/8 bg-white'}>
      <div className={plain ? '' : 'overflow-x-auto overscroll-x-contain'}>
        <table className="min-w-[720px] w-full divide-y divide-pamoja-forest/8 text-sm">
          <thead className="bg-pamoja-sage/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.08em] text-pamoja-muted"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pamoja-forest/8">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-pamoja-muted" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.tableKey || row.id} className="hover:bg-pamoja-sage/40">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-pamoja-body">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
