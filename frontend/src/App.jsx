import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Ticket, Plus, Calendar, User, Tag, AlertCircle, Clock, CheckCircle, Trash2 } from 'lucide-react'
import './App.css'

function App() {
  const [tickets, setTickets] = useState([])
  const [comments, setComments] = useState({})
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilter, setActiveFilter] = useState(null)
  const [newComment, setNewComment] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    priority: 'Medium',
    description: ''
  })

  const categories = [
    'Monthly Financials',
    'Audit', 
    'Journal Entry',
    'Error',
    'Payroll',
    'General'
  ]

  const priorities = ['Low', 'Medium', 'High']
  const statuses = ['Open', 'In Progress', 'Resolved']

  // Load tickets on component mount
  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/.netlify/functions/tickets')
      if (response.ok) {
        const data = await response.json()
        setTickets(data)
      } else {
        console.error('Failed to fetch tickets')
        setTickets([])
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async (ticketId) => {
    try {
      const response = await fetch(`/.netlify/functions/comments?ticketId=${ticketId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(prev => ({ ...prev, [ticketId]: data }))
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const createTicket = async () => {
    if (!formData.title || !formData.category || !formData.description) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/.netlify/functions/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status: 'Open',
          created_at: new Date().toISOString()
        }),
      })

      if (response.ok) {
        const newTicket = await response.json()
        setTickets(prev => [newTicket, ...prev])
        setFormData({ title: '', category: '', priority: 'Medium', description: '' })
        setIsCreateModalOpen(false)
      } else {
        alert('Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      alert('Error creating ticket')
    }
  }

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const response = await fetch('/.netlify/functions/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ticketId,
          status: newStatus
        }),
      })

      if (response.ok) {
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        ))
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => ({ ...prev, status: newStatus }))
        }
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
    }
  }

  const deleteTicket = async (ticketId) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/.netlify/functions/tickets', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: ticketId }),
      })

      if (response.ok) {
        setTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
        setIsTicketModalOpen(false)
        setSelectedTicket(null)
      } else {
        alert('Failed to delete ticket')
      }
    } catch (error) {
      console.error('Error deleting ticket:', error)
      alert('Error deleting ticket')
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !selectedTicket) return

    try {
      const response = await fetch('/.netlify/functions/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          content: newComment,
          created_at: new Date().toISOString()
        }),
      })

      if (response.ok) {
        const comment = await response.json()
        setComments(prev => ({
          ...prev,
          [selectedTicket.id]: [...(prev[selectedTicket.id] || []), comment]
        }))
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleTicketSelect = async (ticket) => {
    setSelectedTicket(ticket)
    setIsTicketModalOpen(true)
    await fetchComments(ticket.id)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-red-100 text-red-800 border-red-200'
      case 'In Progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStats = () => {
    const total = tickets.length
    const open = tickets.filter(t => t.status === 'Open').length
    const inProgress = tickets.filter(t => t.status === 'In Progress').length
    const resolved = tickets.filter(t => t.status === 'Resolved').length
    return { total, open, inProgress, resolved }
  }

  const getFilteredTickets = () => {
    if (!activeFilter) return tickets
    return tickets.filter(ticket => ticket.status === activeFilter)
  }

  const handleFilterClick = (status) => {
    setActiveFilter(activeFilter === status ? null : status)
  }

  const stats = getStats()
  const filteredTickets = getFilteredTickets()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Ticket className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ticketing system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Ticket className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Bennett AOIA Ticket System</h1>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                  <p className="text-sm text-gray-600">Submit a new issue or request to Bennett AOIA.</p>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of your issue"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of your issue or request"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createTicket} className="bg-green-600 hover:bg-green-700">
                      Create Ticket
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeFilter === 'Open' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => handleFilterClick('Open')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeFilter === 'In Progress' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => handleFilterClick('In Progress')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer hover:shadow-md transition-shadow ${activeFilter === 'Resolved' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => handleFilterClick('Resolved')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Status */}
        {activeFilter && (
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {activeFilter} tickets ({filteredTickets.length} of {stats.total})
            </p>
            <Button variant="outline" size="sm" onClick={() => setActiveFilter(null)}>
              Clear Filter
            </Button>
          </div>
        )}

        {/* Tickets List */}
        <Card>
          <CardHeader>
            <CardTitle>All Tickets</CardTitle>
            <CardDescription>Manage and track all your submitted tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {activeFilter ? `No ${activeFilter.toLowerCase()} tickets found.` : 'No tickets yet. Create your first ticket to get started!'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTicketSelect(ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">#{ticket.id} {ticket.title}</h3>
                          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{ticket.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Tag className="h-3 w-3 mr-1" />
                            {ticket.category}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Details Modal */}
        <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle>#{selectedTicket.id} {selectedTicket.title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Ticket Metadata */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs text-gray-500">Status</Label>
                      <div className="flex space-x-1 mt-1">
                        {statuses.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={selectedTicket.status === status ? "default" : "outline"}
                            onClick={() => updateTicketStatus(selectedTicket.id, status)}
                            className={selectedTicket.status === status ? getStatusColor(status) : ''}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Priority</Label>
                      <Badge className={`${getPriorityColor(selectedTicket.priority)} mt-1`}>
                        {selectedTicket.priority}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Category</Label>
                      <p className="text-sm mt-1">{selectedTicket.category}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Created</Label>
                      <p className="text-sm mt-1">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-gray-700 mt-2 p-3 bg-gray-50 rounded-lg">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {/* Comments Section */}
                  <div>
                    <Label className="text-sm font-medium">Comments ({comments[selectedTicket.id]?.length || 0})</Label>
                    <div className="mt-3 space-y-3">
                      {comments[selectedTicket.id]?.map((comment, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={addComment} size="sm">
                        Add Comment
                      </Button>
                    </div>
                  </div>

                  {/* Delete Ticket Section */}
                  <div className="border-t pt-4">
                    <div className="flex justify-end">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteTicket(selectedTicket.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Ticket
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export default App

