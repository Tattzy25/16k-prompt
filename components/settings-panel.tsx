'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { ColumnMapping, ColumnSettings, TablePageSize } from '@/lib/types'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableColumns: string[]
  columnSettings: ColumnSettings
  onSave: (settings: ColumnSettings, uiSettings: UISettings) => void
  blobStorageEnabled?: boolean
  tablePageSize?: TablePageSize
  apiStatus?: 'connected' | 'disconnected' | 'checking'
}

interface UISettings {
  blobStorageEnabled: boolean
  tablePageSize: TablePageSize
}

const STORAGE_KEY = 'batch-processor-column-settings'
const UI_SETTINGS_KEY = 'batch-processor-ui-settings'

function loadSettings(): ColumnSettings {
  if (typeof window === 'undefined') {
    return { mappings: [], customColumns: [] }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return { mappings: [], customColumns: [] }
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
    if (stored) {
      return JSON.parse(stored)
    }
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
  { value: 25, label: '25 rows' },
  { value: 50, label: '50 rows' },
  { value: 100, label: '100 rows' },
  { value: 200, label: '200 rows' },
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
}: SettingsPanelProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [customColumns, setCustomColumns] = useState<string[]>([])
  const [newColumnKey, setNewColumnKey] = useState('')
  const [blobEnabled, setBlobEnabled] = useState(true)
  const [pageSize, setPageSize] = useState<TablePageSize>(50)

  // Initialize from props when dialog opens
  useEffect(() => {
    if (open) {
      setMappings([...columnSettings.mappings])
      setCustomColumns([...columnSettings.customColumns])
      setBlobEnabled(initialBlobEnabled)
      setPageSize(initialPageSize)
    }
  }, [open, columnSettings, initialBlobEnabled, initialPageSize])

  // Sync available columns that aren't in mappings yet
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
      setMappings([
        ...mappings,
        { key, displayName: key, visible: true },
      ])
      setNewColumnKey('')
    }
  }

  const handleRemoveColumn = (key: string) => {
    setMappings(mappings.filter((m) => m.key !== key))
    setCustomColumns(customColumns.filter((c) => c !== key))
  }

  const handleToggleVisibility = (key: string) => {
    setMappings(
      mappings.map((m) =>
        m.key === key ? { ...m, visible: !m.visible } : m
      )
    )
  }

  const handleDisplayNameChange = (key: string, newName: string) => {
    setMappings(
      mappings.map((m) =>
        m.key === key ? { ...m, displayName: newName } : m
      )
    )
  }

  const handleReset = () => {
    setMappings([])
    setCustomColumns([])
  }

  const handleSave = () => {
    const settings: ColumnSettings = {
      mappings: getAllColumns().filter((m) => m.visible || m.displayName !== m.key),
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

  // Get status color and text
  const getStatusInfo = () => {
    switch (apiStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: 'Connected', desc: 'API is responding normally' }
      case 'disconnected':
        return { color: 'bg-red-500', text: 'Disconnected', desc: 'Cannot reach the API' }
      default:
        return { color: 'bg-yellow-500', text: 'Checking...', desc: 'Testing connection...' }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full gap-6 p-6 sm:p-8" showCloseButton>
        <DialogHeader>
          <DialogTitle className="text-xl">⚙️ Settings</DialogTitle>
          <DialogDescription>
            Configure your batch processor settings. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-8">
            {/* Connection Status Section */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 0 1 7.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                Connection Status
              </h2>
              
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className={`h-3 w-3 rounded-full ${statusInfo.color} animate-pulse`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{statusInfo.text}</p>
                  <p className="text-xs text-muted-foreground">{statusInfo.desc}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
            </section>

            {/* Storage Settings Section */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                Storage Settings
              </h2>
              
              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="blob-toggle" className="text-sm font-medium">
                      Blob Storage
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload processed images to cloud storage
                    </p>
                  </div>
                  <Switch
                    id="blob-toggle"
                    checked={blobEnabled}
                    onCheckedChange={setBlobEnabled}
                  />
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {blobEnabled ? (
                    <p>✅ <strong>Enabled:</strong> Processed images will be uploaded to Vercel Blob storage and you'll get public URLs in your results.</p>
                  ) : (
                    <p>⚠️ <strong>Disabled:</strong> Images will be processed but NOT uploaded to cloud storage. Results will only contain metadata.</p>
                  )}
                </div>
              </div>
            </section>

            {/* Table Settings Section */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 2.625h7.5" />
                </svg>
                Table Display
              </h2>
              
              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="page-size" className="text-sm font-medium">
                      Rows per page
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      How many results to show at once
                    </p>
                  </div>
                  <select
                    id="page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value) as TablePageSize)}
                    className="h-9 rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PAGE_SIZE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Smaller numbers load faster when you have many results (500+ rows)
                </p>
              </div>
            </section>

            {/* Column Settings Section */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Column Visibility
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose which columns to show in your results table. Toggle visibility or rename columns.
              </p>

              <div className="rounded-md border border-border max-h-[200px] overflow-y-auto">
                {allColumns.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No columns available yet. Process some images first!
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="px-3 py-2 text-left font-medium text-xs">Show</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Column Name</th>
                        <th className="px-3 py-2 text-left font-medium text-xs">Display As</th>
                        <th className="px-3 py-2 text-right font-medium text-xs"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {allColumns.map((col) => (
                        <tr key={col.key} className="border-b border-border/50">
                          <td className="px-3 py-2">
                            <Switch
                              checked={col.visible}
                              onCheckedChange={() => handleToggleVisibility(col.key)}
                              className="h-4 w-7"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {col.key}
                            </code>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={col.displayName}
                              onChange={(e) => handleDisplayNameChange(col.key, e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Display name"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveColumn(col.key)}
                              className="h-6 text-xs text-destructive hover:text-destructive"
                            >
                              Hide
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Add Custom Column */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Add Custom Column</h2>
              <p className="text-xs text-muted-foreground">
                Add a custom column header if you need one that doesn't exist in the data yet.
              </p>

              <div className="flex gap-2">
                <Input
                  value={newColumnKey}
                  onChange={(e) => setNewColumnKey(e.target.value)}
                  placeholder="e.g., Meta Keywords, Custom Note..."
                  className="h-9"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                />
                <Button onClick={handleAddColumn} size="sm">
                  Add
                </Button>
              </div>

              {customColumns.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customColumns.map((col) => (
                    <Badge key={col} variant="secondary" className="gap-1 text-xs">
                      {col}
                      <button
                        onClick={() => handleRemoveColumn(col)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Help Section for Non-Tech Users */}
            <section className="space-y-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
              <h2 className="text-base font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
                Quick Help
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-xs text-blue-800 dark:text-blue-200">
                <li><strong>Blob Storage:</strong> Keep ON to save processed images to the cloud. Turn OFF if you only want text data.</li>
                <li><strong>Rows per page:</strong> Use smaller numbers (25-50) if the page feels slow with many results.</li>
                <li><strong>Columns:</strong> Hide columns you don't need to make the table easier to read.</li>
                <li><strong>Export:</strong> Use CSV or JSON buttons above the table to download your data.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Columns
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

