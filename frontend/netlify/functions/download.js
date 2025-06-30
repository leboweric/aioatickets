import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    })
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }

  try {
    const url = new URL(req.url)
    const fileKey = url.searchParams.get('fileKey')

    if (!fileKey) {
      return new Response(JSON.stringify({ error: 'Missing fileKey parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    const fileStore = getStore('files')
    
    // Get file data and metadata
    const fileData = await fileStore.get(fileKey, { type: 'arrayBuffer' })
    const metadata = await fileStore.getMetadata(fileKey)

    if (!fileData) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // Extract filename from fileKey (format: ticketId/fileId-originalName)
    const filename = metadata?.originalName || fileKey.split('/')[1]?.split('-').slice(1).join('-') || 'download'
    const contentType = metadata?.contentType || 'application/octet-stream'

    return new Response(fileData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    })
  } catch (error) {
    console.error('Error downloading file:', error)
    return new Response(JSON.stringify({ error: 'Failed to download file' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

