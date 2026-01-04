import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  ArrowBack,
  Send,
  AttachFile,
  Download,
  Delete,
} from '@mui/icons-material';
import api from '../utils/api';
import { getUserRole, getUser } from '../utils/auth';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const role = getUserRole();
  const user = getUser();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data.ticket);
      setComments(response.data.comments || []);
      setFiles(response.data.files || []);
      setStatus(response.data.ticket.status);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      // Upload file if selected
      if (selectedFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);
        fileFormData.append('ticket_id', id);
        await api.post('/files/upload', fileFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Refresh files list
        const filesResponse = await api.get(`/tickets/${id}`);
        setFiles(filesResponse.data.files || []);
      }

      // Add comment
      const response = await api.post('/comments', {
        ticket_id: id,
        content: commentText,
      });

      setComments([...comments, response.data.comment]);
      setCommentText('');
      setSelectedFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus });
      setStatus(newStatus);
      setTicket({ ...ticket, status: newStatus });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleConfirmResolved = async () => {
    try {
      setSubmitting(true);
      const response = await api.post(`/tickets/${id}/confirm`);
      setStatus('closed');
      setTicket({ ...ticket, status: 'closed' });
      setError('');
      // Show success message
      alert('Ticket confirmed and closed successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileDownload = async (fileId, filename) => {
    try {
      // Use the API with authentication token
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download file: ' + error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const calculateSLATime = () => {
    if (!ticket?.sla_deadline) return null;
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diff = deadline - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) {
      return { overdue: true, text: 'SLA Overdue' };
    }
    return { overdue: false, text: `${hours}h ${minutes}m remaining` };
  };

  const slaTime = ticket ? calculateSLATime() : null;

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container>
        <Alert severity="error">Ticket not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3,
          borderLeft: ticket.escalated ? '6px solid #ff9800' : 'none',
          backgroundColor: ticket.escalated ? 'rgba(255, 152, 0, 0.05)' : 'inherit',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h4">Ticket #{ticket.id}</Typography>
            {ticket.escalated && (
              <Chip
                label="ESCALATED"
                color="warning"
                sx={{ mt: 1, fontWeight: 'bold' }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {slaTime && (
              <Chip
                label={slaTime.text}
                color={slaTime.overdue ? 'error' : 'warning'}
                size="small"
              />
            )}
            <Chip
              label={ticket.status.replace('_', ' ')}
              color={ticket.status === 'closed' ? 'default' : 'primary'}
            />
            <Chip
              label={ticket.priority.toUpperCase()}
              color={
                ticket.priority === 'urgent' ? 'error' :
                ticket.priority === 'high' ? 'warning' :
                ticket.priority === 'medium' ? 'info' : 'default'
              }
              size="small"
            />
          </Box>
        </Box>
        
        {ticket.escalated && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This ticket has been escalated due to SLA breach. 
            {ticket.escalation_count > 1 && ` (Escalated ${ticket.escalation_count} times)`}
            Priority has been increased and the ticket has been reset. A new agent needs to be assigned.
          </Alert>
        )}

        <Typography variant="h6" gutterBottom>
          {ticket.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Priority: {ticket.priority} | Created: {formatDate(ticket.created_at)}
        </Typography>
        {ticket.customer_name && (
          <Typography variant="body2" color="text.secondary">
            Customer: {ticket.customer_name}
          </Typography>
        )}
        {ticket.agent_name && (
          <Typography variant="body2" color="text.secondary">
            Agent: {ticket.agent_name}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </Typography>

        {role === 'agent' && (
          <Box sx={{ mt: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
        {role === 'admin' && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="info">
              Admins can only view tickets. Only agents can update ticket status.
            </Alert>
          </Box>
        )}
      </Paper>

      {files.length > 0 && (
        <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Attachments
          </Typography>
          <List>
            {files.map((file) => (
              <ListItem
                key={file.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => handleFileDownload(file.id, file.original_name)}
                  >
                    <Download />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={file.original_name}
                  secondary={`${(file.file_size / 1024).toFixed(2)} KB`}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Comments
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {comments.length === 0 ? (
          <Typography color="text.secondary">No comments yet</Typography>
        ) : (
          <Box>
            {comments.map((comment) => (
              <Card key={comment.id} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {comment.username} ({comment.role})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(comment.created_at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{comment.content}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Paper>

      {role === 'agent' && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add Comment
          </Typography>
          <form onSubmit={handleCommentSubmit}>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              margin="normal"
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFile />}
              >
                Attach File
                <input
                  type="file"
                  hidden
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </Button>
              {selectedFile && (
                <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                  {selectedFile.name}
                </Typography>
              )}
              <Button
                type="submit"
                variant="contained"
                startIcon={<Send />}
                disabled={submitting || !commentText.trim()}
              >
                {submitting ? <CircularProgress size={24} /> : 'Send'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}
      {role === 'admin' && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Alert severity="info">
            Admins can only view tickets. Only agents can respond to tickets.
          </Alert>
        </Paper>
      )}

      {role === 'customer' && (
        <Paper elevation={3} sx={{ p: 3 }}>
          {ticket.status === 'resolved' ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                This ticket has been resolved by an agent. Please confirm if the issue is fixed.
              </Alert>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={handleConfirmResolved}
                disabled={submitting}
                size="large"
              >
                {submitting ? <CircularProgress size={24} /> : 'Confirm Issue is Fixed - Close Ticket'}
              </Button>
            </Box>
          ) : ticket.status === 'closed' ? (
            <Alert severity="success">
              This ticket has been closed. Thank you for your confirmation!
            </Alert>
          ) : (
            <Alert severity="info">
              Only agents can respond to tickets. If you need to add more information,
              please create a new ticket.
            </Alert>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default TicketDetail;

