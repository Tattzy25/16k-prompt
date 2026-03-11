'use client'

import { cn } from '@/lib/utils'
import type { BatchStatus } from '@/lib/types'

interface StatusCardsProps {
  currentStatus: BatchStatus
  imageCount: number
  retryCount: number
  maxRetries: number
  completedCount?: number
  processingIndex?: number
}

const statuses: { key: BatchStatus; label: string; description: string }[] = [
  { key: 'idle', label: 'Ready', description: 'Awaiting images' },
  { key: 'uploading', label: 'Uploading', description: 'Preparing batch' },
  { key: 'processing', label: 'Processing', description: 'Running workflow' },
  { key: 'completed', label: 'Completed', description: 'Results ready' },
  { key: 'failed', label: 'Failed', description: 'Error occurred' },
]

export function StatusCards({ 
  currentStatus, 
  imageCount, 
  retryCount, 
  maxRetries,
  completedCount = 0,
  processingIndex = -1
}: StatusCardsProps) {
  const getStatusIndex = (status: BatchStatus) => statuses.findIndex(s => s.key === status)
  const currentIndex = getStatusIndex(currentStatus)

  return (
    <div className="grid grid-cols-5 gap-3">
      {statuses.map((status, index) => {
        const isActive = status.key === currentStatus
        const isPast = index < currentIndex && currentStatus !== 'failed'
        const isFailed = status.key === 'failed' && currentStatus === 'failed'

        return (
          <div
            key={status.key}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl border p-4 transition-all duration-300',
              'bg-card/50 backdrop-blur-sm',
              isActive && status.key !== 'failed' && 'border-info/50 bg-info/5',
              isPast && 'border-success/30 bg-success/5',
              isFailed && 'border-destructive/50 bg-destructive/5',
              !isActive && !isPast && !isFailed && 'border-border/50 opacity-40'
            )}
          >
            <div
              className={cn(
                'mb-2 flex h-10 w-10 items-center justify-center rounded-full transition-all',
                isActive && status.key !== 'failed' && 'bg-info/20 text-info',
                isPast && 'bg-success/20 text-success',
                isFailed && 'bg-destructive/20 text-destructive',
                !isActive && !isPast && !isFailed && 'bg-muted text-muted-foreground'
              )}
            >
              {isPast ? (
                <CheckIcon />
              ) : isFailed ? (
                <XIcon />
              ) : (
                <StatusIcon status={status.key} isActive={isActive} />
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                isActive && status.key !== 'failed' && 'text-info',
                isPast && 'text-success',
                isFailed && 'text-destructive',
                !isActive && !isPast && !isFailed && 'text-muted-foreground'
              )}
            >
              {status.label}
            </span>
            <span className="mt-0.5 text-xs text-muted-foreground">{status.description}</span>

            {isActive && status.key === 'uploading' && imageCount > 0 && (
              <span className="mt-2 text-xs font-mono text-info">{imageCount} images</span>
            )}

            {isActive && status.key === 'processing' && (
              <div className="mt-2 flex flex-col items-center gap-1">
                <span className="text-xs font-mono text-info">
                  {processingIndex + 1}/{imageCount}
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-info" />
                </span>
              </div>
            )}

            {isActive && status.key === 'completed' && (
              <span className="mt-2 text-xs font-mono text-success">{completedCount} done</span>
            )}

            {isFailed && (
              <span className="mt-2 text-xs font-mono text-destructive">
                {completedCount}/{imageCount} done
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatusIcon({ status, isActive }: { status: BatchStatus; isActive: boolean }) {
  const baseClass = 'h-5 w-5'

  switch (status) {
    case 'idle':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    case 'uploading':
      return (
        <svg className={cn(baseClass, isActive && 'animate-bounce')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
        </svg>
      )
    case 'processing':
      return (
        <svg className={cn(baseClass, isActive && 'animate-spin')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      )
    case 'completed':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )
    case 'failed':
      return (
        <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      )
  }
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
