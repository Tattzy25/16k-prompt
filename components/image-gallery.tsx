'use client'

import { cn } from '@/lib/utils'
import type { ImageFile, BatchStatus } from '@/lib/types'
import { useMemo } from 'react'

interface ImageGalleryProps {
  images: ImageFile[]
  status: BatchStatus
  currentProcessingIndex: number
  onRemoveImage: (id: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageGallery({ images, status, currentProcessingIndex, onRemoveImage }: ImageGalleryProps) {
  const totalSize = useMemo(() => {
    return images.reduce((acc, img) => acc + img.size, 0)
  }, [images])

  const completedCount = images.filter(img => img.status === 'completed').length
  const failedCount = images.filter(img => img.status === 'failed').length

  if (images.length === 0) {
    return null
  }

  // Allow removing images whenever they are not the one currently processing.
  const canRemoveAny = status !== 'processing'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Batch Queue
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </span>
        </h3>
        <div className="flex items-center gap-3">
          {status === 'processing' && (
            <span className="font-mono text-xs text-info">
              {completedCount}/{images.length} done
            </span>
          )}
          {failedCount > 0 && (
            <span className="font-mono text-xs text-destructive">
              {failedCount} failed
            </span>
          )}
          <span className="font-mono text-xs text-muted-foreground">{formatFileSize(totalSize)} total</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {images.map((image, index) => {
          const isCurrentlyProcessing = status === 'processing' && index === currentProcessingIndex
          const isPending = image.status === 'pending'
          const isCompleted = image.status === 'completed'
          const isFailed = image.status === 'failed'

          return (
            <div
              key={image.id}
              className={cn(
                'group relative aspect-square overflow-hidden rounded-lg border bg-card/50 backdrop-blur-sm transition-all',
                'border-border/50',
                isCurrentlyProcessing && 'border-info/50 ring-1 ring-info/30'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={image.preview} 
                alt={image.name} 
                className={cn(
                  "h-full w-full object-cover transition-all duration-300",
                  isCurrentlyProcessing && "brightness-75"
                )} 
              />

              {(canRemoveAny || !isCurrentlyProcessing) && (
                <button
                  onClick={() => onRemoveImage(image.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Processing indicator - only for current image */}
              {isCurrentlyProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <div className="flex flex-col items-center gap-1">
                    <svg
                      className="h-6 w-6 animate-spin text-info"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  </div>
                </div>
              )}

              {/* Completed indicator */}
              {isCompleted && (
                <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-success/90">
                  <svg className="h-3 w-3 text-success-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              )}

              {/* Failed indicator */}
              {isFailed && (
                <div className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90">
                  <svg className="h-3 w-3 text-destructive-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v7" strokeLinecap="round" />
                    <path d="M12 16.5h.01" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {/* Retry count badge */}
              {image.retryCount > 0 && (
                <div className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/90 px-1">
                  <span className="text-[10px] font-bold text-warning-foreground">{image.retryCount}</span>
                </div>
              )}

              {/* Pending badge for clarity */}
              {isPending && status === 'processing' && !isCurrentlyProcessing && (
                <div className="absolute bottom-1 right-1 flex h-5 items-center justify-center rounded-full bg-muted/80 px-1.5">
                  <span className="text-[9px] font-medium text-muted-foreground">PENDING</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
