import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params
    
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

    // Try different query formats for Google Drive API
    const queries = [
      `'${folderId}' in parents and mimeType contains 'image/'`,
      `parents in '${folderId}' and mimeType contains 'image/'`,
      `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/gif' or mimeType='image/webp')`,
      `'${folderId}' in parents`
    ]
    
    let driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queries[0])}&key=${apiKey}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`
    
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
    
    console.log('Google Drive API response data:', {
      filesCount: data.files?.length || 0,
      files: data.files?.map((f: any) => ({ id: f.id, name: f.name, mimeType: f.mimeType })) || []
    })
    
    // Convert to proxied image URLs that bypass CSP
    const images = data.files?.map((file: any) => {
      // Use our proxy endpoint to serve images from our domain
      const proxyUrl = `/api/drive-proxy/${file.id}`
      return proxyUrl
    }) || []

    // If no images found, try alternative approach for public folders
    if (images.length === 0) {
      console.log('No images found with API, trying alternative approach for public folder')
      
      // For public folders, sometimes we can access files directly
      // Try to get folder contents using different API endpoint
      const publicFolderUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?key=${apiKey}&fields=*`
      
      try {
        const folderResponse = await fetch(publicFolderUrl)
        console.log('Public folder check response:', {
          status: folderResponse.status,
          ok: folderResponse.ok
        })
        
        if (folderResponse.ok) {
          const folderData = await folderResponse.json()
          console.log('Folder data:', {
            name: folderData.name,
            shared: folderData.shared,
            permissions: folderData.permissions?.length || 0
          })
        }
      } catch (err) {
        console.log('Public folder check failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      images: images,
      count: images.length,
      debug: {
        foundFiles: data.files?.length || 0,
        apiResponse: data.files?.slice(0, 3) // First 3 files for debugging
      }
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