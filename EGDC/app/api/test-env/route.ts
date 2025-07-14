import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    envType: process.env.NODE_ENV,
    preview: apiKey ? `${apiKey.substring(0, 8)}...` : 'not found'
  })
}