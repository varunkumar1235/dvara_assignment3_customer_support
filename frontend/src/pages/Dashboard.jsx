import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Visibility } from '@mui/icons-material';
import api from '../utils/api';
import { getUserRole } from '../utils/auth';

const Dashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const role = getUserRole();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get('/tickets');
      setTickets(response.data.tickets);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'default',
      in_progress: 'primary',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Tickets
        </Typography>
        {role === 'customer' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/tickets/new')}
          >
            Create Ticket
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              {role !== 'customer' && <TableCell>Customer</TableCell>}
              {role !== 'customer' && <TableCell>Agent</TableCell>}
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow 
                  key={ticket.id}
                  sx={{
                    backgroundColor: ticket.escalated ? 'rgba(255, 152, 0, 0.1)' : 'inherit',
                    borderLeft: ticket.escalated ? '4px solid #ff9800' : 'none',
                  }}
                >
                  <TableCell>#{ticket.id}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {ticket.title}
                      {ticket.escalated && (
                        <Chip
                          label="ESCALATED"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.status.replace('_', ' ')}
                      color={getStatusColor(ticket.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={ticket.priority.toUpperCase()}
                        color={
                          ticket.priority === 'urgent' ? 'error' :
                          ticket.priority === 'high' ? 'warning' :
                          ticket.priority === 'medium' ? 'info' : 'default'
                        }
                        size="small"
                      />
                      {ticket.escalation_count > 0 && (
                        <Typography variant="caption" color="warning.main">
                          (Escalated {ticket.escalation_count}x)
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  {role !== 'customer' && (
                    <TableCell>{ticket.customer_name || 'N/A'}</TableCell>
                  )}
                  {role !== 'customer' && (
                    <TableCell>{ticket.agent_name || 'Unassigned'}</TableCell>
                  )}
                  <TableCell>{formatDate(ticket.created_at)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default Dashboard;


