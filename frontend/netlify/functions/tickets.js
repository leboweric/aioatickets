import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  const store = getStore('tickets')

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(store, headers)
      case 'POST':
        return await handlePost(req, store, headers)
      case 'PUT':
        return await handlePut(req, store, headers)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers
        })
    }
  } catch (error) {
    console.error('Error in tickets function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers
    })
  }
}

async function handleGet(store, headers) {
  try {
    const ticketsData = await store.get('all-tickets')
    const tickets = ticketsData ? JSON.parse(ticketsData) : []
    
    // Sort by creation date (newest first)
    tickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    return new Response(JSON.stringify(tickets), { status: 200, headers })
  } catch (error) {
    console.error('Error getting tickets:', error)
    return new Response(JSON.stringify([]), { status: 200, headers })
  }
}

async function handlePost(req, store, headers) {
  try {
    const body = await req.json()
    const { title, category, priority, description, status, created_at } = body

    if (!title || !category || !description) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers
      })
    }

    // Get existing tickets
    const ticketsData = await store.get('all-tickets')
    const tickets = ticketsData ? JSON.parse(ticketsData) : []

    // Generate new ID
    const newId = tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1

    // Create new ticket
    const newTicket = {
      id: newId,
      title,
      category,
      priority: priority || 'Medium',
      description,
      status: status || 'Open',
      created_at: created_at || new Date().toISOString()
    }

    // Add to tickets array
    tickets.unshift(newTicket)

    // Save back to store
    await store.set('all-tickets', JSON.stringify(tickets))

    return new Response(JSON.stringify(newTicket), { status: 201, headers })
  } catch (error) {
    console.error('Error creating ticket:', error)
    return new Response(JSON.stringify({ error: 'Failed to create ticket' }), {
      status: 500,
      headers
    })
  }
}

async function handlePut(req, store, headers) {
  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers
      })
    }

    // Get existing tickets
    const ticketsData = await store.get('all-tickets')
    const tickets = ticketsData ? JSON.parse(ticketsData) : []

    // Find and update ticket
    const ticketIndex = tickets.findIndex(t => t.id === id)
    if (ticketIndex === -1) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404,
        headers
      })
    }

    tickets[ticketIndex].status = status

    // Save back to store
    await store.set('all-tickets', JSON.stringify(tickets))

    return new Response(JSON.stringify(tickets[ticketIndex]), { status: 200, headers })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return new Response(JSON.stringify({ error: 'Failed to update ticket' }), {
      status: 500,
      headers
    })
  }
}

