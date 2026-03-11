'use client'

import { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { ImageFile } from '@/lib/types'

interface ImageDropzoneProps {
  onImagesAdded: (images: ImageFile[]) => void
  disabled?: boolean
}

export function ImageDropzone({ onImagesAdded, disabled }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return

      const imageFiles: ImageFile[] = []

      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
          const preview = URL.createObjectURL(file)
          imageFiles.push({
            id,
            file,
            preview,
            name: file.name,
            size: file.size,
            status: 'pending',
            retryCount: 0,
          })
        }
      })

      if (imageFiles.length > 0) {
        onImagesAdded(imageFiles)
      }
    },
    [onImagesAdded, disabled]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      processFiles(e.dataTransfer.files)
    },
    [processFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200',
        'border-border/50 bg-card/30 backdrop-blur-sm',
        'hover:border-info/50 hover:bg-info/5',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-info/10">
        <svg
          className="h-7 w-7 text-muted-foreground transition-colors group-hover:text-info"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </div>

      <p className="mt-4 text-sm font-medium text-foreground">Drop images here or click to browse</p>
      <p className="mt-1 text-xs text-muted-foreground">Upload unlimited images for batch processing</p>
    </div>
  )
}
