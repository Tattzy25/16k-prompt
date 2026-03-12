'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ResultRow, ColumnSettings } from '@/lib/types'

interface ResultsTableProps {
  data: ResultRow[]
  onExportCSV: () => void
  onExportJSON: () => void
  columnSettings?: ColumnSettings
}

export function ResultsTable({ 
  data, 
  onExportCSV, 
  onExportJSON,
  columnSettings 
}: ResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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
      <div className="flex items-center justify-between">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                {columns.map(column => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.displayName)}
                    className="cursor-pointer px-4 py-3 text-left font-medium text-foreground transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{column.displayName}</span>
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
              {sortedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'border-b border-border/30 transition-colors hover:bg-muted/20',
                    rowIndex === sortedData.length - 1 && 'border-b-0'
                  )}
                >
                  {columns.map(column => (
                    <td key={column.key} className="px-4 py-3 text-muted-foreground">
                      <span className="block max-w-xs truncate">{formatCellValue(row[column.key])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

