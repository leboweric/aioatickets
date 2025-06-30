import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  const store = getStore('comments')

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, store, headers)
      case 'POST':
        return await handlePost(req, store, headers)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers
        })
    }
  } catch (error) {
    console.error('Error in comments function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    })
  }
}

async function handleGet(req, store, headers) {
  try {
    const url = new URL(req.url)
    const ticketId = url.searchParams.get('ticketId')

    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId parameter required' }), {
        status: 400,
        headers
      })
    }

    const commentsData = await store.get(`ticket-${ticketId}`)
    const comments = commentsData ? JSON.parse(commentsData) : []
    
    // Sort by creation date (oldest first)
    comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    
    return new Response(JSON.stringify(comments), { status: 200, headers })
  } catch (error) {
    console.error('Error getting comments:', error)
    return new Response(JSON.stringify([]), { status: 200, headers })
  }
}

async function handlePost(req, store, headers) {
  try {
    const body = await req.json()
    const { ticketId, content, created_at } = body

    if (!ticketId || !content) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers
      })
    }

    // Get existing comments for this ticket
    const commentsData = await store.get(`ticket-${ticketId}`)
    const comments = commentsData ? JSON.parse(commentsData) : []

    // Create new comment
    const newComment = {
      id: comments.length + 1,
      content,
      created_at: created_at || new Date().toISOString()
    }

    // Add to comments array
    comments.push(newComment)

    // Save back to store
    await store.set(`ticket-${ticketId}`, JSON.stringify(comments))

    return new Response(JSON.stringify(newComment), { status: 201, headers })
  } catch (error) {
    console.error('Error creating comment:', error)
    return new Response(JSON.stringify({ error: 'Failed to create comment' }), {
      status: 500,
      headers
    })
  }
}

