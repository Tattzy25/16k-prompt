# Implementation Plan: Workflow Toggle + UI Improvements

## Overview
Add workflow toggle system to switch between Main and Small workflows, fix status cards sizing, and improve table usability.

---

## Changes Required

### 1. lib/types.ts - Add Workflow Types
- Add `WorkflowType = 'main' | 'small'`
- Add `WorkflowConfig` interface with workflow-specific settings

### 2. app/page.tsx - Add Workflow Toggle
- Add workflow toggle dropdown next to settings icon
- Load/save workflow preference in localStorage
- Auto-adjust settings when workflow changes:
  - Main workflow: Blob storage ON, all columns visible
  - Small workflow: Blob storage OFF, only 3 columns (Prompt, Title, Style)

### 3. components/settings-panel.tsx - Simplify Based on Workflow
- Accept workflow type prop
- Show/hide sections based on workflow:
  - **Main**: All sections (Connection, Storage, Table, Columns, Help)
  - **Small**: Only Connection Status section (blob always off for this workflow)

### 4. components/status-cards.tsx - Fix Sizing & Responsiveness
- Make all cards equal height using flex
- Fix grid: 5 columns on desktop, 3 on tablet, 2 on mobile
- Add min-height to ensure consistency
- Make cards stack properly on small screens

### 5. components/results-table.tsx - Improve Non-Tech UX
- Make table headers more prominent/clearer
- Add visual distinction for active sort column
- Improve empty state messaging
- Add hover effects for better interactivity

---

## Implementation Order
1. Update types.ts
2. Update page.tsx with toggle
3. Update settings-panel.tsx
4. Update status-cards.tsx
5. Update results-table.tsx

---

## Risk Assessment
- **Low Risk**: Changes are UI-only, no backend modifications
- **localStorage**: Using prefixed keys to avoid conflicts
- **Backward Compatible**: Existing users will default to 'main' workflow

