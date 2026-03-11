import { NextRequest, NextResponse } from 'next/server'

// This endpoint receives webhook callbacks from external services
// The data is stored temporarily and can be polled by the frontend

const pendingResults = new Map<string, { data: unknown; timestamp: number }>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const maxAge = 30 * 60 * 1000 // 30 minutes
  for (const [key, value] of pendingResults.entries()) {
    if (now - value.timestamp > maxAge) {
      pendingResults.delete(key)
    }
  }
}, 5 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const batchId = body.batch_id || body.batchId || `auto_${Date.now()}`

    pendingResults.set(batchId, {
      data: body,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true, batch_id: batchId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get('batch_id')

  if (!batchId) {
    return NextResponse.json({ success: false, error: 'batch_id is required' }, { status: 400 })
  }

  const result = pendingResults.get(batchId)

  if (!result) {
    return NextResponse.json({ success: false, pending: true })
  }

  // Remove from pending after retrieval
  pendingResults.delete(batchId)

  return NextResponse.json({ success: true, data: result.data })
}
