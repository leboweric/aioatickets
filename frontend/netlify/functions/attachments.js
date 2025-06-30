import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers })
  }

  const store = getStore('attachments')
  const fileStore = getStore('files')

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, store, headers)
      case 'POST':
        return await handlePost(req, store, fileStore, headers)
      case 'DELETE':
        return await handleDelete(req, store, fileStore, headers)
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers
        })
    }
  } catch (error) {
    console.error('Error in attachments function:', error)
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
      return new Response(JSON.stringify({ error: 'Missing ticketId parameter' }), {
        status: 400,
        headers
      })
    }

    const attachmentsData = await store.get(`ticket-${ticketId}`)
    const attachments = attachmentsData ? JSON.parse(attachmentsData) : []
    
    return new Response(JSON.stringify(attachments), { status: 200, headers })
  } catch (error) {
    console.error('Error getting attachments:', error)
    return new Response(JSON.stringify([]), { status: 200, headers })
  }
}

async function handlePost(req, store, fileStore, headers) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const ticketId = formData.get('ticketId')

    if (!file || !ticketId) {
      return new Response(JSON.stringify({ error: 'Missing file or ticketId' }), {
        status: 400,
        headers
      })
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: 'File size exceeds 100MB limit' }), {
        status: 400,
        headers
      })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/gif'
    ]

    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'File type not allowed' }), {
        status: 400,
        headers
      })
    }

    // Generate unique file ID and store file
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fileKey = `${ticketId}/${fileId}-${file.name}`
    
    // Store file content
    const fileBuffer = await file.arrayBuffer()
    await fileStore.set(fileKey, fileBuffer, {
      metadata: {
        contentType: file.type,
        originalName: file.name
      }
    })

    // Create attachment record
    const attachment = {
      id: fileId,
      ticketId: parseInt(ticketId),
      filename: file.name,
      size: file.size,
      contentType: file.type,
      fileKey: fileKey,
      url: `/.netlify/functions/download?fileKey=${encodeURIComponent(fileKey)}`,
      created_at: new Date().toISOString()
    }

    // Get existing attachments for this ticket
    const attachmentsData = await store.get(`ticket-${ticketId}`)
    const attachments = attachmentsData ? JSON.parse(attachmentsData) : []

    // Add new attachment
    attachments.push(attachment)

    // Save back to store
    await store.set(`ticket-${ticketId}`, JSON.stringify(attachments))

    return new Response(JSON.stringify(attachment), { status: 201, headers })
  } catch (error) {
    console.error('Error uploading attachment:', error)
    return new Response(JSON.stringify({ error: 'Failed to upload attachment' }), {
      status: 500,
      headers
    })
  }
}

async function handleDelete(req, store, fileStore, headers) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing attachment ID' }), {
        status: 400,
        headers
      })
    }

    // Find the attachment across all tickets
    let foundAttachment = null
    let foundTicketId = null

    // This is not the most efficient way, but works for small datasets
    // In a real application, you'd want a better indexing system
    const allKeys = await store.list()
    
    for (const key of allKeys) {
      if (key.startsWith('ticket-')) {
        const attachmentsData = await store.get(key)
        const attachments = attachmentsData ? JSON.parse(attachmentsData) : []
        
        const attachment = attachments.find(att => att.id === id)
        if (attachment) {
          foundAttachment = attachment
          foundTicketId = key.replace('ticket-', '')
          break
        }
      }
    }

    if (!foundAttachment) {
      return new Response(JSON.stringify({ error: 'Attachment not found' }), {
        status: 404,
        headers
      })
    }

    // Delete file from file store
    await fileStore.delete(foundAttachment.fileKey)

    // Remove attachment from ticket's attachment list
    const attachmentsData = await store.get(`ticket-${foundTicketId}`)
    const attachments = attachmentsData ? JSON.parse(attachmentsData) : []
    const updatedAttachments = attachments.filter(att => att.id !== id)

    await store.set(`ticket-${foundTicketId}`, JSON.stringify(updatedAttachments))

    return new Response(JSON.stringify({ message: 'Attachment deleted successfully' }), {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error deleting attachment:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete attachment' }), {
      status: 500,
      headers
    })
  }
}

