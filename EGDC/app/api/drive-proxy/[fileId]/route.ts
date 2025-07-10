import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY

    if (!apiKey) {
      console.error('Google Drive API key not found')
      return new NextResponse('API key not configured', { status: 500 })
    }

    // Try multiple Google Drive URLs to get the actual image
    const possibleUrls = [
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}=w1000`
    ]

    for (const url of possibleUrls) {
      try {
        console.log('Trying to fetch:', url)
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Image-Proxy/1.0)'
          }
        })

        if (response.ok) {
          const contentType = response.headers.get('content-type')
          
          // Check if it's actually an image
          if (contentType && contentType.startsWith('image/')) {
            console.log('✅ Successfully fetched image:', url)
            
            // Stream the image through our server
            const imageBuffer = await response.arrayBuffer()
            
            return new NextResponse(imageBuffer, {
              status: 200,
              headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                'Access-Control-Allow-Origin': '*'
              }
            })
          }
        }
      } catch (err) {
        console.log('Failed to fetch from:', url, err)
        continue
      }
    }

    // If no image found, return 404
    return new NextResponse('Image not found', { status: 404 })

  } catch (error) {
    console.error('Drive proxy error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}