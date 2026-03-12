'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ResultRow, ColumnSettings, TablePageSize } from '@/lib/types'

interface ResultsTableProps {
  data: ResultRow[]
  onExportCSV: () => void
  onExportJSON: () => void
  columnSettings?: ColumnSettings
  pageSize?: TablePageSize
  onPageSizeChange?: (size: TablePageSize) => void
}

const PAGE_SIZES: TablePageSize[] = [25, 50, 100, 200]

export function ResultsTable({ 
  data, 
  onExportCSV, 
  onExportJSON,
  columnSettings,
  pageSize = 50,
  onPageSizeChange
}: ResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Get all unique columns from data
  const allColumns = useMemo(() => {
    if (data.length === 0) return []
    const allKeys = new Set<string>()
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key))
    })
    return Array.from(allKeys)
  }, [data])

  // Get visible columns with their display names
  const columns = useMemo(() => {
    const settingsMap = new Map(
      (columnSettings?.mappings || []).map(m => [m.key, m])
    )
    
    return allColumns.map(key => {
      const setting = settingsMap.get(key)
      return {
        key,
        displayName: setting?.displayName || key,
        visible: setting?.visible !== false // default to visible
      }
    }).filter(col => col.visible)
  }, [allColumns, columnSettings])

  // Build a map for sorting - map display name back to key
  const displayToKeyMap = useMemo(() => {
    const map = new Map<string, string>()
    columns.forEach(col => map.set(col.displayName, col.key))
    return map
  }, [columns])

  const sortedData = useMemo(() => {
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Reset to page 1 when data changes
  useMemo(() => {
    setCurrentPage(1)
  }, [data.length, pageSize])

  const handleSort = (displayName: string) => {
    const key = displayToKeyMap.get(displayName)
    if (!key) return
    
    if (sortColumn === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  const handlePageSizeChange = (newSize: TablePageSize) => {
    onPageSizeChange?.(newSize)
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  if (data.length === 0) {
    return null
  }

  // Get the original data key for a display name
  const getDataKey = (displayName: string): string => {
    // First check if there's a mapping
    if (columnSettings?.mappings) {
      const mapping = columnSettings.mappings.find(m => m.displayName === displayName)
      if (mapping) return mapping.key
    }
    // Otherwise assume display name equals key
    return displayName
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">
          Results
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {data.length} {data.length === 1 ? 'row' : 'rows'}
          </span>
          {columnSettings && columnSettings.mappings.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({columns.length} visible columns)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            CSV
          </button>
          <button
            onClick={onExportJSON}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            JSON
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-md">
        {/* Table Container with Internal Scroll */}
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/50 bg-muted/80 shadow-sm">
                {columns.map(column => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.displayName)}
                    className="cursor-pointer px-3 py-2.5 text-left font-medium text-foreground transition-colors hover:bg-muted"
                    title={`Click to sort by ${column.displayName}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs">{column.displayName}</span>
                      {sortColumn === column.key && (
                        <svg
                          className={cn('h-3.5 w-3.5 flex-shrink-0 transition-transform', sortDirection === 'desc' && 'rotate-180')}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'border-b border-border/30 transition-colors hover:bg-muted/20',
                    rowIndex === paginatedData.length - 1 && 'border-b-0'
                  )}
                >
                  {columns.map(column => (
                    <td key={column.key} className="px-3 py-2 text-muted-foreground">
                      <span className="block max-w-[200px] truncate text-xs" title={formatCellValue(row[column.key])}>
                        {formatCellValue(row[column.key])}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-muted-foreground whitespace-nowrap">Rows per page:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value) as TablePageSize)}
              className="h-7 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PAGE_SIZES.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>

          {/* Page Info and Navigation */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, data.length)} of {data.length}
            </span>
            
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                title="First page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded text-xs transition-colors",
                        currentPage === pageNum 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "border border-border bg-background text-foreground hover:bg-accent"
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded border border-border bg-background text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last page"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

