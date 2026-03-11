import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'

export const maxDuration = 300

const DIFY_API_BASE = 'https://api.dify.ai/v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image } = body as {
      image: { name: string; base64: string }
    }

    const apiKey = process.env.DIFY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DIFY_API_KEY not configured' },
        { status: 500 }
      )
    }

    if (!image || !image.base64) {
      return NextResponse.json(
        { success: false, error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Generate dynamic IDs
    const userId = `user_${randomUUID().slice(0, 8)}`

    // Determine image type from filename
    const ext = image.name.split('.').pop()?.toLowerCase() || 'png'
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' 
      : ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'image/png'

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image.base64, 'base64')
    
    // Step 1: Upload file to Dify's /files/upload endpoint
    const formData = new FormData()
    const blob = new Blob([imageBuffer], { type: mimeType })
    formData.append('file', blob, image.name)
    formData.append('user', userId)

    console.log('[v0] Uploading to Dify files API...')
    const uploadResponse = await fetch(`${DIFY_API_BASE}/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('[v0] Dify file upload error:', uploadResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: `Dify file upload failed ${uploadResponse.status}: ${errorText}` },
        { status: 502 }
      )
    }

    const uploadResult = await uploadResponse.json()
    const uploadFileId = uploadResult.id
    console.log('[v0] Dify file uploaded, ID:', uploadFileId)

    // Step 2: Call Dify workflow API with file reference
    console.log('[v0] Calling Dify workflow...')
    const workflowResponse = await fetch(`${DIFY_API_BASE}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          product_image: {
            type: 'image',
            transfer_method: 'local_file',
            upload_file_id: uploadFileId,
          },
        },
        response_mode: 'blocking',
        user: userId,
      }),
    })

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text()
      console.error('[v0] Dify workflow error:', workflowResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: `Dify API returned ${workflowResponse.status}: ${errorText}` },
        { status: 502 }
      )
    }

    const result = await workflowResponse.json()
    console.log('[v0] Dify full response:', JSON.stringify(result, null, 2))

    // Handle Dify blocking mode response
    if (result.data?.status === 'failed') {
      return NextResponse.json(
        { success: false, error: result.data.error || 'Workflow execution failed' },
        { status: 500 }
      )
    }

    // Extract outputs from Dify response - check multiple possible locations
    const outputs = result.data?.outputs || result.outputs || {}
    console.log('[v0] Extracted outputs:', JSON.stringify(outputs, null, 2))

    // Try to find the structured data - it might be nested in agent output objects
    let extractedData: Record<string, string> = {}
    
    // Check if outputs contain structured objects from agents
    for (const [key, value] of Object.entries(outputs)) {
      if (typeof value === 'object' && value !== null) {
        // It's an object - could be agent output with structured_output
        const obj = value as Record<string, unknown>
        if (obj.structured_output && typeof obj.structured_output === 'object') {
          Object.assign(extractedData, obj.structured_output)
        } else {
          // Flatten the object
          Object.assign(extractedData, obj)
        }
      } else if (typeof value === 'string') {
        extractedData[key] = value
      }
    }
    
    console.log('[v0] Extracted data:', JSON.stringify(extractedData, null, 2))

    // Get title and sku for final filename - check various key formats
    const title = extractedData['Title'] || extractedData['title'] || 
                  outputs['Title'] || outputs['title'] || ''
    const sku = extractedData['Sku'] || extractedData['sku'] || 
                outputs['Sku'] || outputs['sku'] || ''
    
    console.log('[v0] Title:', title, 'SKU:', sku)
    
    // Clean title and sku for filename (remove special chars)
    const cleanTitle = (title || 'untitled').replace(/[^a-zA-Z0-9-_\s]/g, '').replace(/\s+/g, '_').substring(0, 50)
    const cleanSku = (sku || Date.now().toString()).replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 20)
    
    // Step 3: Upload to Vercel Blob with proper name: {title}_{sku}.{ext}
    const finalFilename = `products/${cleanTitle}_${cleanSku}.${ext}`
    console.log('[v0] Uploading to Blob:', finalFilename)
    
    const finalBlob = await put(finalFilename, imageBuffer, {
      access: 'public',
      contentType: mimeType,
      allowOverwrite: true, // Overwrite if same name exists
    })
    
    console.log('[v0] Blob uploaded:', finalBlob.url)

    // Build the final result object with all fields
    const mappedResult: Record<string, string> = {
      image_name: image.name,
      image_url: finalBlob.url,
    }
    
    // Map all expected fields - try multiple key formats
    const fieldMappings = [
      ['Product URL', ['Product URL', 'product_url', 'ProductURL']],
      ['Title', ['Title', 'title']],
      ['Tags', ['Tags', 'tags']],
      ['Short Description', ['Short Description', 'short_description', 'shortDescription']],
      ['Prompt', ['Prompt', 'prompt']],
      ['Dimensions', ['Dimensions', 'dimensions']],
      ['Image Alt Text', ['Image Alt Text', 'image_alt_text', 'imageAltText']],
      ['Mood', ['Mood', 'mood']],
      ['Style', ['Style', 'style']],
      ['Color Scheme', ['Color Scheme', 'color_scheme', 'colorScheme']],
      ['Sku', ['Sku', 'sku', 'SKU']],
      ['SEO Title', ['SEO Title', 'seo_title', 'seoTitle']],
      ['SEO Description', ['SEO Description', 'seo_description', 'seoDescription']],
      ['Body', ['Body', 'body']],
    ] as const
    
    for (const [displayName, possibleKeys] of fieldMappings) {
      let foundValue = ''
      for (const key of possibleKeys) {
        if (extractedData[key]) {
          foundValue = String(extractedData[key])
          break
        }
        if (outputs[key]) {
          foundValue = String(outputs[key])
          break
        }
      }
      mappedResult[displayName] = foundValue
    }
    
    console.log('[v0] Final mapped result:', JSON.stringify(mappedResult, null, 2))

    return NextResponse.json({
      success: true,
      data: mappedResult,
      workflow_run_id: result.workflow_run_id,
      user_id: userId,
      elapsed_time: result.data?.elapsed_time,
    })
  } catch (error) {
    console.error('[v0] Process error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
