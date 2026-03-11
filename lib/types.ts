export type BatchStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

export type ImageStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type QueueDensity = 'compact' | 'comfortable'

export interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  status: ImageStatus
  retryCount: number
  result?: ResultRow
  error?: string
}

export interface BatchState {
  status: BatchStatus
  images: ImageFile[]
  progress: number
  retryCount: number
  maxRetries: number
  error: string | null
  startedAt: Date | null
  completedAt: Date | null
}

export interface ResultRow {
  [key: string]: unknown
}

export interface ProcessingResult {
  success: boolean
  data: ResultRow
  error?: string
}

export interface UISettings {
  queueDensity: QueueDensity
  showCompletedImages: boolean
  resultsPageSize: number
}
