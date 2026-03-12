# Settings Panel Update Plan

## Files to Edit

### 1. lib/types.ts
- Add `ColumnMapping` interface for header mapping
- Add `UISettings` updates for column configuration

### 2. components/settings-panel.tsx
- Replace textarea notes with real column management UI
- Add column list with add/remove functionality
- Add header mapping (rename) functionality
- Add Save/Cancel buttons
- Add "Reset to defaults" option

### 3. app/page.tsx
- Add column settings state management
- Pass settings to SettingsPanel and ResultsTable

### 4. components/results-table.tsx
- Accept column settings props
- Filter columns based on settings
- Display mapped names instead of original keys
- Support hidden columns

## UI Components Needed in SettingsPanel
1. Column list with visibility toggle (show/hide)
2. Column rename/mapping input
3. Add custom column button
4. Remove column button
5. Save/Cancel/Reset buttons

