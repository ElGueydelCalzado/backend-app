import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const { folderId } = params
    
    // Google Drive API v3 - List files in folder
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Drive API key not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Google Drive API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Convert to direct image URLs
    const images = data.files?.map((file: any) => ({
      id: file.id,
      name: file.name,
      // Use thumbnailLink for preview, webContentLink for full image
      thumbnailUrl: file.thumbnailLink?.replace('=s220', '=s800'), // Higher quality thumbnail
      fullUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
      directUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${apiKey}`
    })) || []

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