'use client'

import { useState, useCallback, useRef } from 'react'
import { StatusCards } from '@/components/status-cards'
import { ImageDropzone } from '@/components/image-dropzone'
import { ImageGallery } from '@/components/image-gallery'
import { ResultsTable } from '@/components/results-table'
import { ThemeToggle } from '@/components/theme-toggle'
import type { BatchStatus, ImageFile, ResultRow } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_RETRIES = 3

export default function BatchProcessor() {
  const [status, setStatus] = useState<BatchStatus>('idle')
  const [images, setImages] = useState<ImageFile[]>([])
  const [results, setResults] = useState<ResultRow[]>([])
  const [batchRetryCount, setBatchRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleImagesAdded = useCallback((newImages: ImageFile[]) => {
    const imagesWithStatus = newImages.map(img => ({
      ...img,
      status: 'pending' as const,
      retryCount: 0,
    }))
    setImages(prev => [...prev, ...imagesWithStatus])
    if (status === 'idle' || status === 'failed') {
      setStatus('uploading')
    }
  }, [status])

  const handleRemoveImage = useCallback((id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id)
      if (filtered.length === 0) {
        setStatus('idle')
      }
      const removed = prev.find(img => img.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return filtered
    })
  }, [])

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processImage = async (
    image: ImageFile,
    index: number,
    signal: AbortSignal
  ): Promise<{ success: boolean; data?: ResultRow; error?: string }> => {
    const base64 = await convertToBase64(image.file)

    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: {
          name: image.name,
          base64,
        },
      }),
      signal,
    })

    const result = await response.json()
    return result
  }

  const processImagesSequentially = async (startFromIndex: number = 0) => {
    setStatus('processing')
    setError(null)
    abortControllerRef.current = new AbortController()

    const newResults: ResultRow[] = [...results]

    for (let i = startFromIndex; i < images.length; i++) {
      const image = images[i]
      
      // Skip already completed images
      if (image.status === 'completed') {
        continue
      }

      setCurrentProcessingIndex(i)

      // Update image status to processing
      setImages(prev => prev.map((img, idx) => 
        idx === i ? { ...img, status: 'processing' as const } : img
      ))

      let attempt = 0
      let success = false
      let lastError = ''
      let resultData: ResultRow | undefined

      while (attempt < MAX_RETRIES && !success) {
        try {
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Processing cancelled')
          }

          const result = await processImage(image, i, abortControllerRef.current.signal)
          
          if (result.success) {
            success = true
            resultData = result.data
          } else {
            lastError = result.error || 'Processing failed'
            attempt++
            
            // Update retry count
            setImages(prev => prev.map((img, idx) => 
              idx === i ? { ...img, retryCount: attempt } : img
            ))

            if (attempt < MAX_RETRIES) {
              // Wait before retry with exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            // User cancelled
            setImages(prev => prev.map((img, idx) => 
              idx === i ? { ...img, status: 'pending' as const } : img
            ))
            setCurrentProcessingIndex(-1)
            setStatus('uploading')
            return
          }
          lastError = err instanceof Error ? err.message : 'Unknown error'
          attempt++
          
          setImages(prev => prev.map((img, idx) => 
            idx === i ? { ...img, retryCount: attempt } : img
          ))

          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }

      if (success && resultData) {
        // Mark as completed
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'completed' as const, result: resultData } : img
        ))
        newResults.push(resultData)
        setResults([...newResults])
      } else {
        // Mark as failed
        setImages(prev => prev.map((img, idx) => 
          idx === i ? { ...img, status: 'failed' as const, error: lastError } : img
        ))
        setError(`Image "${image.name}" failed after ${MAX_RETRIES} retries: ${lastError}`)
        setCurrentProcessingIndex(-1)
        setStatus('failed')
        setBatchRetryCount(prev => prev + 1)
        return
      }
    }

    // All done
    setCurrentProcessingIndex(-1)
    setStatus('completed')
  }

  const handleStart = () => {
    if (images.length === 0) return
    processImagesSequentially(0)
  }

  const handleRetry = () => {
    // Find first pending or failed image
    const firstIncompleteIndex = images.findIndex(
      img => img.status === 'pending' || img.status === 'failed'
    )
    
    if (firstIncompleteIndex === -1) return

    // Reset failed images to pending
    setImages(prev => prev.map(img => 
      img.status === 'failed' ? { ...img, status: 'pending' as const, retryCount: 0, error: undefined } : img
    ))
    
    setError(null)
    processImagesSequentially(firstIncompleteIndex)
  }

  const handleReset = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    images.forEach(img => URL.revokeObjectURL(img.preview))
    setImages([])
    setResults([])
    setStatus('idle')
    setError(null)
    setBatchRetryCount(0)
    setCurrentProcessingIndex(-1)
  }

  const exportCSV = useCallback(() => {
    if (results.length === 0) return

    const columns = Array.from(new Set(results.flatMap(row => Object.keys(row))))
    const csvRows = [
      columns.join(','),
      ...results.map(row =>
        columns
          .map(col => {
            const val = row[col]
            if (val === null || val === undefined) return ''
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(',')
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const exportJSON = useCallback(() => {
    if (results.length === 0) return

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const isProcessing = status === 'processing'
  const canStart = images.length > 0 && !isProcessing && status !== 'completed'
  const hasPendingOrFailed = images.some(img => img.status === 'pending' || img.status === 'failed')
  const canRetry = status === 'failed' && hasPendingOrFailed

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                TaTTTy Product Analysis
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Watch Data Flow Directly Into Your Winning Shopify Store 
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              {canRetry && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 rounded-xl border border-warning/50 bg-warning/10 px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/20"
                >
                  <svg
                    className="h-4 w-4"
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
                  Retry Failed
                </button>
              )}
              {(status === "completed" ||
                status === "failed" ||
                images.length > 0) && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-accent"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Status Cards */}
          <StatusCards
            currentStatus={status}
            imageCount={images.length}
            retryCount={batchRetryCount}
            maxRetries={MAX_RETRIES}
            completedCount={
              images.filter((img) => img.status === "completed").length
            }
            processingIndex={currentProcessingIndex}
          />

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Upload & Config */}
            <div className="space-y-6 lg:col-span-1">
              <ImageDropzone
                onImagesAdded={handleImagesAdded}
                disabled={isProcessing || status === "completed"}
              />

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-medium transition-all",
                  canStart
                    ? "bg-foreground text-background hover:opacity-90"
                    : "cursor-not-allowed bg-muted text-muted-foreground opacity-50",
                )}
              >
                {isProcessing ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
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
                    Processing {currentProcessingIndex + 1} of {images.length}
                    ...
                  </>
                ) : status === "completed" ? (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    Complete
                  </>
                ) : (
                  <>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                      />
                    </svg>
                    Start Processing
                  </>
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-destructive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        Processing Error
                      </p>
                      <p className="mt-0.5 text-xs text-destructive/80">
                        {error}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Click "Retry Failed" to continue from where it stopped
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Gallery & Results */}
            <div className="space-y-6 lg:col-span-2">
              <ImageGallery
                images={images}
                status={status}
                currentProcessingIndex={currentProcessingIndex}
                onRemoveImage={handleRemoveImage}
              />

              <ResultsTable
                data={results}
                onExportCSV={exportCSV}
                onExportJSON={exportJSON}
              />

              {/* Empty State */}
              {images.length === 0 && results.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-card/20 py-16">
                  <svg
                    className="h-12 w-12 text-muted-foreground/50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                    />
                  </svg>
                  <p className="mt-4 text-sm text-muted-foreground">
                    No images uploaded yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Drop images on the left to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
