'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { ColumnMapping, ColumnSettings } from '@/lib/types'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableColumns: string[]
  columnSettings: ColumnSettings
  onSave: (settings: ColumnSettings) => void
}

const STORAGE_KEY = 'batch-processor-column-settings'

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

export function SettingsPanel({
  open,
  onOpenChange,
  availableColumns,
  columnSettings,
  onSave,
}: SettingsPanelProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [customColumns, setCustomColumns] = useState<string[]>([])
  const [newColumnKey, setNewColumnKey] = useState('')

  // Initialize from props when dialog opens
  useEffect(() => {
    if (open) {
      setMappings([...columnSettings.mappings])
      setCustomColumns([...columnSettings.customColumns])
    }
  }, [open, columnSettings])

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
    saveSettings(settings)
    onSave(settings)
    onOpenChange(false)
  }

  const allColumns = getAllColumns()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full gap-6 p-6 sm:p-8" showCloseButton>
        <DialogHeader>
          <DialogTitle>Column Settings</DialogTitle>
          <DialogDescription>
            Manage which columns to display in the results table and how they should be labeled.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-6">
            {/* Column List */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Columns</h2>
              <p className="text-xs text-muted-foreground">
                Toggle visibility and rename columns from the incoming data.
              </p>

              <div className="rounded-md border border-border">
                {allColumns.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No columns available. Process some images first to see the data columns.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Visible</th>
                        <th className="px-3 py-2 text-left font-medium">Original Header</th>
                        <th className="px-3 py-2 text-left font-medium">Display Name</th>
                        <th className="px-3 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allColumns.map((col) => (
                        <tr key={col.key} className="border-b border-border/50">
                          <td className="px-3 py-2">
                            <button
                              onClick={() => handleToggleVisibility(col.key)}
                              className={`flex h-5 w-9 items-center rounded-full p-1 transition-colors ${
                                col.visible ? 'bg-primary' : 'bg-muted'
                              }`}
                            >
                              <div
                                className={`h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                  col.visible ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {col.key}
                            </code>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={col.displayName}
                              onChange={(e) => handleDisplayNameChange(col.key, e.target.value)}
                              className="h-8 text-xs"
                              placeholder="Display name"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveColumn(col.key)}
                              className="h-7 text-destructive hover:text-destructive"
                            >
                              Remove
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
                Add a new column header that doesn't exist in the data yet.
              </p>

              <div className="flex gap-2">
                <Input
                  value={newColumnKey}
                  onChange={(e) => setNewColumnKey(e.target.value)}
                  placeholder="Column key (e.g., Meta Keywords)"
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
                    <Badge key={col} variant="secondary" className="gap-1">
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

            {/* Batch behavior (read-only info) */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Batch behavior</h2>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Retries per image: 3</li>
                <li>After one image fails all retries: skip it and continue to the next.</li>
                <li>After two images in a row fail all retries: stop the batch and mark as failed.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

