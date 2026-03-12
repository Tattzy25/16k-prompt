'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { ColumnMapping, ColumnSettings, TablePageSize, ResultRow } from '@/lib/types'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableColumns: string[]
  columnSettings: ColumnSettings
  onSave: (settings: ColumnSettings, uiSettings: UISettings) => void
  blobStorageEnabled?: boolean
  tablePageSize?: TablePageSize
  apiStatus?: 'connected' | 'disconnected' | 'checking'
  resultsData?: ResultRow[]
}

interface UISettings {
  blobStorageEnabled: boolean
  tablePageSize: TablePageSize
}

const STORAGE_KEY = 'batch-processor-column-settings'
const UI_SETTINGS_KEY = 'batch-processor-ui-settings'

const DEFAULT_COLUMN_MAPPINGS: ColumnMapping[] = [
  { key: 'Prompt', displayName: 'Prompt', visible: true },
  { key: 'Title', displayName: 'Title', visible: true },
  { key: 'Style', displayName: 'Style', visible: true },
  // System columns hidden by default
  { key: 'image_name', displayName: 'Image Name', visible: false },
  { key: 'image_url', displayName: 'Image URL', visible: false },
  { key: 'blob_storage_enabled', displayName: 'Blob Storage Enabled', visible: false },
  { key: 'workflow_run_id', displayName: 'Workflow Run ID', visible: false },
  { key: 'user_id', displayName: 'User ID', visible: false },
  { key: 'elapsed_time', displayName: 'Elapsed Time', visible: false },
  { key: 'blob_upload_error', displayName: 'Blob Upload Error', visible: false },
]

function loadSettings(): ColumnSettings {
  if (typeof window === 'undefined') {
    return { mappings: [], customColumns: [] }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return { mappings: DEFAULT_COLUMN_MAPPINGS, customColumns: [] }
}

function saveSettings(settings: ColumnSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

function loadUISettings(): UISettings {
  if (typeof window === 'undefined') {
    return { blobStorageEnabled: true, tablePageSize: 50 }
  }
  try {
    const stored = localStorage.getItem(UI_SETTINGS_KEY)
    if (stored) return JSON.parse(stored)
  } catch (e) {
    console.error('Failed to load UI settings:', e)
  }
  return { blobStorageEnabled: true, tablePageSize: 50 }
}

function saveUISettings(settings: UISettings) {
  try {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save UI settings:', e)
  }
}

const PAGE_SIZE_OPTIONS: { value: TablePageSize; label: string }[] = [
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
]

export function SettingsPanel({
  open,
  onOpenChange,
  availableColumns,
  columnSettings,
  onSave,
  blobStorageEnabled: initialBlobEnabled = true,
  tablePageSize: initialPageSize = 50,
  apiStatus = 'checking',
  resultsData = [],
}: SettingsPanelProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [customColumns, setCustomColumns] = useState<string[]>([])
  const [newColumnKey, setNewColumnKey] = useState('')
  const [blobEnabled, setBlobEnabled] = useState(true)
  const [pageSize, setPageSize] = useState<TablePageSize>(50)
  const [previewColumn, setPreviewColumn] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const savedSettings = loadSettings()
      setMappings([...savedSettings.mappings])
      setCustomColumns([...savedSettings.customColumns])
      setBlobEnabled(initialBlobEnabled)
      setPageSize(initialPageSize)
      setPreviewColumn(null)
    }
  }, [open, initialBlobEnabled, initialPageSize])

  const getColumnSampleData = (key: string): string[] => {
    if (!resultsData || resultsData.length === 0) return []
    const samples: string[] = []
    for (const row of resultsData) {
      const value = row[key]
      if (value !== null && value !== undefined) {
        const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        if (strValue && strValue !== '-' && strValue.length > 0) {
          samples.push(strValue.substring(0, 60))
          if (samples.length >= 2) break
        }
      }
    }
    return samples
  }

  const getAllColumns = () => {
    const mappedKeys = new Set(mappings.map((m) => m.key))
    const available = availableColumns
      .filter((col) => !mappedKeys.has(col))
      .map((col) => ({ key: col, displayName: col, visible: true }))
    return [...mappings, ...available]
  }

  const handleAddColumn = () => {
    if (newColumnKey.trim() && !customColumns.includes(newColumnKey.trim())) {
      const key = newColumnKey.trim()
      setCustomColumns([...customColumns, key])
      setMappings([...mappings, { key, displayName: key, visible: true }])
      setNewColumnKey('')
    }
  }

  const handleDeleteColumn = (key: string) => {
    // If column is a custom column, remove it entirely
    if (customColumns.includes(key)) {
      setMappings(mappings.filter((m) => m.key !== key))
      setCustomColumns(customColumns.filter((c) => c !== key))
    } else {
      // For non-custom columns (from API), hide them by setting visible false
      const existing = mappings.find(m => m.key === key);
      if (existing) {
        setMappings(mappings.map(m => m.key === key ? { ...m, visible: false } : m));
      } else {
        // Add mapping with visible false
        setMappings([...mappings, { key, displayName: key, visible: false }]);
      }
    }
    if (previewColumn === key) setPreviewColumn(null)
  }

  const handleToggleVisibility = (key: string) => {
    const existing = mappings.find(m => m.key === key);
    if (existing) {
      setMappings(mappings.map(m => m.key === key ? { ...m, visible: !m.visible } : m));
    } else {
      // Add new mapping with visible false (since currently it's visible true)
      setMappings([...mappings, { key, displayName: key, visible: false }]);
    }
  }

  const handleDisplayNameChange = (key: string, newName: string) => {
    const existing = mappings.find(m => m.key === key);
    if (existing) {
      setMappings(mappings.map(m => m.key === key ? { ...m, displayName: newName } : m));
    } else {
      // Add new mapping with visible true (default) and custom display name
      setMappings([...mappings, { key, displayName: newName, visible: true }]);
    }
  }

  const handleReset = () => {
    setMappings([...DEFAULT_COLUMN_MAPPINGS])
    setCustomColumns([])
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleSave = () => {
    const settings: ColumnSettings = {
      mappings: getAllColumns(), // Save all columns, including hidden ones
      customColumns,
    }
    const uiSettings: UISettings = {
      blobStorageEnabled: blobEnabled,
      tablePageSize: pageSize,
    }
    saveSettings(settings)
    saveUISettings(uiSettings)
    onSave(settings, uiSettings)
    onOpenChange(false)
  }

  const allColumns = getAllColumns()

  const getStatusInfo = () => {
    switch (apiStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: 'Connected' }
      case 'disconnected':
        return { color: 'bg-red-500', text: 'Disconnected' }
      default:
        return { color: 'bg-yellow-500', text: 'Checking...' }
    }
  }

  const statusInfo = getStatusInfo()
  const previewSamples = previewColumn ? getColumnSampleData(previewColumn) : []

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      {/* Panel */}
      <div className="relative w-full max-w-3xl bg-background rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Settings</h2>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                <span className="text-muted-foreground">{statusInfo.text}</span>
                <button onClick={handleRefresh} className="text-primary hover:underline ml-1">Refresh</button>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Content - with custom scroll */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
          <div className="p-6 space-y-6">
            {/* Top Row: Blob Toggle + Rows */}
            <div className="flex flex-wrap items-center gap-6 p-4 bg-card border border-border rounded-xl">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <Switch id="blob-toggle" checked={blobEnabled} onCheckedChange={setBlobEnabled} />
                  <Label htmlFor="blob-toggle" className="font-medium">Blob Storage</Label>
                </div>
                <span className="text-xs text-muted-foreground">
                  {blobEnabled ? '✅ On' : '⚠️ Off'}
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex items-center gap-3">
                <Label htmlFor="page-size" className="font-medium">Rows:</Label>
                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value) as TablePageSize)}
                  className="h-8 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Default Headers */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Defaults:</span>
              <Badge variant="outline">Prompt</Badge>
              <Badge variant="outline">Title</Badge>
              <Badge variant="outline">Style</Badge>
              <Button variant="ghost" size="sm" onClick={handleReset} className="ml-2 text-xs">Reset</Button>
            </div>

            {/* Column Mapping - BIG SECTION */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Column Mapping
              </h3>
              
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Table Headers Row */}
                <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <span className="w-12">Show</span>
                    <span className="w-32">Data Column</span>
                    <span className="w-32">Display As</span>
                  </div>
                  <span className="w-16 text-sm text-muted-foreground">Action</span>
                </div>

                {/* Column Rows */}
                <div className="max-h-[300px] overflow-y-auto">
                  {allColumns.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Process images to see data columns
                    </div>
                  ) : (
                    allColumns.map((col) => (
                      <div key={col.key} className="px-4 py-3 border-b border-border/50 flex items-center gap-4 hover:bg-muted/30">
                        <div className="w-12">
                          <Switch checked={col.visible} onCheckedChange={() => handleToggleVisibility(col.key)} />
                        </div>
                        <div className="w-32">
                          <button 
                            onClick={() => setPreviewColumn(previewColumn === col.key ? null : col.key)}
                            className="text-left"
                          >
                            <code className="text-xs bg-muted px-2 py-1 rounded block truncate">{col.key}</code>
                            {previewColumn === col.key && previewSamples.length > 0 && (
                              <div className="mt-1 p-2 bg-muted rounded text-xs">
                                <span className="text-muted-foreground">Sample:</span>
                                {previewSamples.map((s, i) => (
                                  <div key={i} className="truncate">{s}</div>
                                ))}
                              </div>
                            )}
                          </button>
                        </div>
                        <div className="w-32">
                          <Input 
                            value={col.displayName} 
                            onChange={(e) => handleDisplayNameChange(col.key, e.target.value)} 
                            className="h-8 text-sm" 
                          />
                        </div>
                        <div className="w-16 flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteColumn(col.key)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Column */}
                <div className="px-4 py-3 border-t border-border bg-muted/30 flex gap-2">
                  <Input 
                    value={newColumnKey} 
                    onChange={(e) => setNewColumnKey(e.target.value)} 
                    placeholder="Add new column header..." 
                    className="h-8 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()} 
                  />
                  <Button onClick={handleAddColumn} size="sm">Add</Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  )
}

