'use client';

// Reusable admin table (step 6.3) on TanStack Table: sorting, search, pagination, column
// visibility, sticky header, CSV export and row selection with bulk actions.
import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';
import { toCsv, downloadCsv } from './csv';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    /** Header label for CSV and the column menu (defaults to the column id). */
    label?: string;
    /** Value written to CSV; defaults to the accessor value. `false` excludes the column. */
    csv?: ((row: TData) => string | number | null | undefined) | false;
    align?: 'left' | 'right' | 'center';
    className?: string;
  }
}

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  getRowId?: (row: T) => string;
  searchPlaceholder?: string;
  /** Text the search box matches against (lower-cased). */
  searchText?: (row: T) => string;
  toolbar?: React.ReactNode;
  csvFilename?: string;
  selectable?: boolean;
  bulkActions?: (rows: T[], clearSelection: () => void) => React.ReactNode;
  initialSorting?: SortingState;
  initialHidden?: string[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = 'Search…',
  searchText,
  toolbar,
  csvFilename,
  selectable,
  bulkActions,
  initialSorting = [],
  initialHidden = [],
  pageSize = 25,
  onRowClick,
  emptyMessage = 'Nothing to show.',
  rowClassName,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [visibility, setVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(initialHidden.map((id) => [id, false])),
  );

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns;
    const select: ColumnDef<T, unknown> = {
      id: '_select',
      enableSorting: false,
      enableHiding: false,
      meta: { csv: false, className: 'w-10' },
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label="Select all rows on this page"
          className="size-4 accent-primary"
          checked={table.getIsAllPageRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
          }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label="Select row"
          className="size-4 accent-primary"
          checked={row.getIsSelected()}
          onClick={(e) => e.stopPropagation()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    };
    return [select, ...columns];
  }, [columns, selectable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId: getRowId ? (r) => getRowId(r) : undefined,
    state: { sorting, globalFilter, rowSelection, columnVisibility: visibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setVisibility,
    globalFilterFn: (row, _col, value: string) => {
      if (!value) return true;
      const hay = searchText ? searchText(row.original) : JSON.stringify(row.original).toLowerCase();
      return value
        .toLowerCase()
        .split(/\s+/)
        .every((t) => hay.toLowerCase().includes(t));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    autoResetPageIndex: true,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);
  const filteredCount = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize: size } = table.getState().pagination;

  const exportCsv = () => {
    const cols = table
      .getAllLeafColumns()
      .filter((c) => c.getIsVisible() && c.columnDef.meta?.csv !== false && c.id !== '_select');
    const rows = (selected.length ? table.getSelectedRowModel() : table.getSortedRowModel()).rows;
    const csv = toCsv(
      cols.map((c) => c.columnDef.meta?.label ?? c.id),
      rows.map((r) =>
        cols.map((c) => {
          const fn = c.columnDef.meta?.csv;
          return typeof fn === 'function'
            ? fn(r.original)
            : (r.getValue(c.id) as string | number | null | undefined);
        }),
      ),
    );
    downloadCsv(csvFilename ?? 'export.csv', csv);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {toolbar}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {c.columnDef.meta?.label ?? c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {csvFilename && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download /> CSV{selected.length ? ` (${selected.length})` : ''}
            </Button>
          )}
        </div>
      </div>

      {selectable && selected.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          {bulkActions(selected, () => setRowSelection({}))}
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      )}

      <div className="max-h-[70vh] overflow-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta;
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                      }
                      className={cn(
                        'h-10 whitespace-nowrap border-b px-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                        meta?.align === 'right' && 'text-right',
                        meta?.className,
                      )}
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={h.column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1 hover:text-foreground',
                            meta?.align === 'right' && 'flex-row-reverse',
                          )}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(
                    'border-b transition-colors last:border-0 hover:bg-muted/50 data-[state=selected]:bg-primary/5',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-3 py-2 align-middle',
                          meta?.align === 'right' && 'tabular text-right',
                          meta?.className,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {filteredCount === 0
            ? 'No rows'
            : `Showing ${pageIndex * size + 1}–${Math.min((pageIndex + 1) * size, filteredCount)} of ${filteredCount}`}
          {filteredCount !== data.length && ` (filtered from ${data.length})`}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={size}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            aria-label="Rows per page"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="tabular">
            {pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
