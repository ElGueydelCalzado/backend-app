import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { folderId } = params
    
    // Google Drive API v3 - List files in folder
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY
    
    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      nodeEnv: process.env.NODE_ENV,
      folderId
    })
    
    if (!apiKey) {
      console.error('Google Drive API key not found in environment variables')
      return NextResponse.json(
        { 
          success: false,
          error: 'Google Drive API key not configured',
          debug: {
            hasApiKey: false,
            nodeEnv: process.env.NODE_ENV
          }
        },
        { status: 500 }
      )
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`
    
    console.log('Calling Google Drive API:', driveUrl.replace(apiKey, 'API_KEY_HIDDEN'))
    
    const response = await fetch(driveUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    console.log('Google Drive API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Drive API error response:', errorText)
      throw new Error(`Google Drive API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    // Convert to proxied image URLs that bypass CSP
    const images = data.files?.map((file: any) => {
      // Use our proxy endpoint to serve images from our domain
      const proxyUrl = `/api/drive-proxy/${file.id}`
      return proxyUrl
    }) || []

    return NextResponse.json({
      success: true,
      images: images,
      count: images.length
    })

  } catch (error) {
    console.error('Drive API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        images: [] 
      },
      { status: 500 }
    )
  }
}