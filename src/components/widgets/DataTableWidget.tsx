/**
 * Data Table Widget Component  
 * Displays tabular data with pagination, search, and sorting
 */

import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Plus, X } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { useWidgetData } from '@/hooks/useWidgetData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStore } from '@/store/dashboardStore';
import { POPULAR_SYMBOLS, POPULAR_CRYPTO, INDIAN_SYMBOLS } from '@/lib/constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getValueByPath, getArrayByPath } from '@/lib/api';
import type { WidgetConfig, TableSortConfig, SortDirection } from '@/types/widget';

interface DataTableWidgetProps {
  widget: WidgetConfig;
}

const ITEMS_PER_PAGE = 10;

export function DataTableWidget({ widget }: DataTableWidgetProps) {
  const { data, loading, error, lastFetched, refetch } = useWidgetData(widget);
  const { updateWidget, currentDashboardType } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<TableSortConfig>({ column: '', direction: null });
  const [filterColumn, setFilterColumn] = useState('');
  const [filterType, setFilterType] = useState<'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt'>('contains');
  const [filterValue, setFilterValue] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const symbols = widget.symbols || [];

  // Get popular symbols based on dashboard type
  const popularSymbols = currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS;

  // Extract array data from the response
  const tableData = useMemo(() => {
    if (!data) return [];

    // If arrayPath is specified, use it
    if (widget.arrayPath) {
      return getArrayByPath(data, widget.arrayPath) as Record<string, unknown>[];
    }

    // Try to find the first array in the data
    const findArray = (obj: unknown): unknown[] | null => {
      if (Array.isArray(obj)) return obj;
      if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          const found = findArray(value);
          if (found) return found;
        }
      }
      return null;
    };

    return (findArray(data) || []) as Record<string, unknown>[];
  }, [data, widget.arrayPath]);

  // Extract column headers from first row
  const columns = useMemo(() => {
    if (tableData.length === 0) return [];
    const firstRow = tableData[0];
    if (typeof firstRow !== 'object' || firstRow === null) return [];
    return Object.keys(firstRow as Record<string, unknown>);
  }, [tableData]);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return tableData;

    const query = searchQuery.toLowerCase();
    return tableData.filter((row) => {
      if (typeof row !== 'object' || row === null) return false;
      return Object.values(row).some((value) =>
        String(value).toLowerCase().includes(query)
      );
    });
  }, [tableData, searchQuery]);

  // Column filter
  const columnFilteredData = useMemo(() => {
    if (!filterColumn || !filterValue) return filteredData;

    const valueLower = filterValue.toLowerCase();
    return filteredData.filter((row) => {
      const cell = (row as Record<string, unknown>)[filterColumn];
      if (cell === undefined || cell === null) return false;

      const numericCell = Number(cell);
      const numericFilter = Number(filterValue);

      switch (filterType) {
        case 'gt':
          return !Number.isNaN(numericCell) && numericCell > numericFilter;
        case 'lt':
          return !Number.isNaN(numericCell) && numericCell < numericFilter;
        case 'startsWith':
          return String(cell).toLowerCase().startsWith(valueLower);
        case 'endsWith':
          return String(cell).toLowerCase().endsWith(valueLower);
        default:
          return String(cell).toLowerCase().includes(valueLower);
      }
    });
  }, [filteredData, filterColumn, filterType, filterValue]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return columnFilteredData;

    return [...columnFilteredData].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.column];
      const bVal = (b as Record<string, unknown>)[sortConfig.column];

      // Try numeric comparison first
      const aNum = parseFloat(String(aVal));
      const bNum = parseFloat(String(bVal));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Fall back to string comparison
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');

      return sortConfig.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [columnFilteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  const splitTables = useMemo(() => {
    return [paginatedData];
  }, [paginatedData]);

  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return { column: '', direction: null };
    });
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
      return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.column !== column) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="h-3 w-3" />;
    }
    return <ChevronDown className="h-3 w-3" />;
  };

  const noColumns = columns.length === 0;
  const emptyMessage = searchQuery
    ? 'No matching results'
    : noColumns
      ? 'No data yet.'
      : 'No data available';

  const handleAddSymbol = useCallback(() => {
    const sym = newSymbol.toUpperCase().trim();
    if (sym && !symbols.includes(sym)) {
      updateWidget(widget.id, { symbols: [...symbols, sym] });
      setNewSymbol('');
      refetch();
    }
  }, [newSymbol, symbols, widget.id, updateWidget, refetch]);

  const handleRemoveSymbol = useCallback((sym: string) => {
    const updated = symbols.filter((s) => s !== sym);
    updateWidget(widget.id, { symbols: updated });
    refetch();
  }, [symbols, widget.id, updateWidget, refetch]);


  return (
    <WidgetCard
      widget={widget}
      loading={loading}
      error={error}
      lastFetched={lastFetched}
      onRefresh={refetch}
      hasData={tableData.length > 0 || symbols.length > 0}
    >
      <div className="space-y-3">
        {/* Stock Selector - show when no data or no symbols */}
        {symbols.length === 0 && (
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground">Add stocks to display in table</p>
            <div className="flex gap-2">
              <Input
                placeholder={currentDashboardType === 'crypto' ? 'e.g., BTC, ETH' : currentDashboardType === 'indian-market' ? 'e.g., RELIANCE, TCS' : 'e.g., AAPL, GOOGL'}
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                className="flex-1 h-8 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleAddSymbol} className="h-8 px-2">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Popular:</p>
              <div className="flex flex-wrap gap-1">
                {popularSymbols.slice(0, 8).map((s) => (
                  <Button
                    key={s.symbol}
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      if (!symbols.includes(s.symbol)) {
                        updateWidget(widget.id, { symbols: [...symbols, s.symbol] });
                        refetch();
                      }
                    }}
                    disabled={symbols.includes(s.symbol)}
                  >
                    + {s.symbol}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {symbols.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Selected Stocks:</p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setNewSymbol('')}>
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {symbols.map((sym) => (
                <Badge key={sym} variant="secondary" className="cursor-pointer gap-1">
                  {sym}
                  <X className="h-3 w-3" onClick={() => handleRemoveSymbol(sym)} />
                </Badge>
              ))}
            </div>
            <div className="relative flex gap-2 mt-2">
              <Input
                placeholder="Add more..."
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                className="flex-1 h-8 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleAddSymbol} className="h-8 px-2">
                <Plus className="h-4 w-4" />
              </Button>
              {newSymbol.length >= 1 && (
                <div className="absolute left-0 top-9 z-20 w-full rounded-md border bg-popover p-2 shadow-lg">
                  <div className="flex flex-wrap gap-1">
                    {popularSymbols
                      .filter((s) => s.symbol.toUpperCase().includes(newSymbol))
                      .slice(0, 6)
                      .map((s) => (
                        <Button
                          key={s.symbol}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            if (!symbols.includes(s.symbol)) {
                              updateWidget(widget.id, { symbols: [...symbols, s.symbol] });
                              setNewSymbol('');
                              refetch();
                            }
                          }}
                        >
                          + {s.symbol}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tableData.length > 0 && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search table..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Table */}
            {paginatedData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                {emptyMessage}
                {!searchQuery && noColumns && (
                  <span className="block text-xs mt-1">Try choosing a template, entering a symbol, or testing an API, then refresh.</span>
                )}
              </div>
            ) : (
              <div className="w-full">
                {splitTables.map((chunk, idx) => (
                  <div key={idx} className="w-full">
                    <ScrollArea className="h-[300px] w-full rounded-xl border border-border/40 bg-card/40 shadow-inner">
                      <div className="min-w-[600px] sm:min-w-full">
                        <Table className="w-full">
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              {columns.slice(0, 5).map((column) => (
                                <TableHead
                                  key={column}
                                  className="h-8 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => handleSort(column)}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="truncate max-w-[100px]">{column}</span>
                                    <SortIcon column={column} />
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {chunk.map((row, rowIndex) => (
                              <TableRow key={`${idx}-${rowIndex}`}>
                                {columns.slice(0, 5).map((column) => (
                                  <TableCell key={column} className="py-2 font-mono text-xs">
                                    <span className="truncate block max-w-[150px]">
                                      {formatCellValue((row as Record<string, unknown>)[column])}
                                    </span>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {sortedData.length} of {tableData.length} items
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetCard>
  );
}
