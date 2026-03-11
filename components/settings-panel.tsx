'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

// Very small, focused settings panel: no fake switches, only controls
// that help you reason about columns & mapping.

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  // Local notes-only state – this does not change any logic yet.
  const [visibleColumnsNote, setVisibleColumnsNote] = useState('')
  const [mappingNotes, setMappingNotes] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full gap-6 p-6 sm:p-8" showCloseButton>
        <DialogHeader>
          <DialogTitle>Batch Processor Settings</DialogTitle>
          <DialogDescription>
            Helper settings for how results are displayed. These do not call Dify or
            Shopify directly yet – they exist so you can keep track of how columns are
            mapped and how you want them to look.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-8 text-sm text-foreground">
            {/* Results table / columns section */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Results table</h2>
              <p className="text-xs text-muted-foreground">
                These controls describe how you want the table to behave. Right now they
                are notes for yourself – implementation wiring can be done later without
                touching this UI.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Columns you care about
                  </label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-border bg-card px-3 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    placeholder={
                      'One per line, e.g.\nTitle\nSEO Title\nSEO Description\nBody\nProduct URL\nImage URL\nSku'
                    }
                    value={visibleColumnsNote}
                    onChange={e => setVisibleColumnsNote(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is just a list for you. Later we can wire it so hidden columns
                    never show up in the UI/CSV.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Mapping notes (Dify → column)
                  </label>
                  <textarea
                    className="min-h-[120px] w-full rounded-md border border-border bg-card px-3 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    placeholder={
                      'Example:\nBody = just long description (no SEO Title / SEO Description lines)\nImage URL = products/{sku}.png\nNew fields I want: Meta Keywords, FAQ, Upsell Handle, ...'
                    }
                    value={mappingNotes}
                    onChange={e => setMappingNotes(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use this to write exactly how you expect each header to behave. It
                    keeps the contract clear when wiring the API or Shopify sync.
                  </p>
                </div>
              </div>
            </section>

            {/* Batch behavior (high-level only) */}
            <section className="space-y-3">
              <h2 className="text-base font-semibold tracking-tight">Batch behavior</h2>
              <p className="text-xs text-muted-foreground">
                These describe how retries and failures should work. They are not wired
                to logic yet; they document the rules you actually want.
              </p>

              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Retries per image: currently hard-coded to 3.</li>
                <li>
                  After one image fails all retries: skip it and continue to the next.
                </li>
                <li>
                  After two images in a row fail all retries: stop the batch and mark as
                  failed.
                </li>
              </ul>
            </section>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
