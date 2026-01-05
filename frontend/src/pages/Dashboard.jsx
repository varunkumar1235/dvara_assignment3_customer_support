import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Divider,
} from "@mui/material";
import { Add, Visibility, Delete } from "@mui/icons-material";
import api from "../utils/api";
import { getUserRole, getUser } from "../utils/auth";

const Dashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentStats, setAgentStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const navigate = useNavigate();
  const role = getUserRole();
  const user = getUser();

  useEffect(() => {
    fetchTickets();
    if (role === "admin") {
      fetchAgentStatistics();
    }
  }, [role]);

  const fetchTickets = async () => {
    try {
      const response = await api.get("/tickets");
      setTickets(response.data.tickets);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  const ticketCounts = tickets.reduce(
    (acc, t) => {
      acc.total += 1;
      acc.byStatus[t.status] = (acc.byStatus[t.status] || 0) + 1;
      acc.byPriority[t.priority] = (acc.byPriority[t.priority] || 0) + 1;
      if (t.escalated) acc.escalated += 1;
      return acc;
    },
    {
      total: 0,
      byStatus: {},
      byPriority: {},
      escalated: 0,
    }
  );

  const fetchAgentStatistics = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get("/tickets/stats/agents");
      setAgentStats(response.data);
    } catch (err) {
      console.error("Failed to fetch agent statistics:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this ticket? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await api.delete(`/tickets/${ticketId}`);
      setTickets(tickets.filter((t) => t.id !== ticketId));
      if (role === "admin" && agentStats) {
        fetchAgentStatistics();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete ticket");
    }
  };

  const canDeleteTicket = (ticket) => {
    if (role !== "agent") return false;
    // Agent can delete if ticket is unassigned or assigned to them
    return !ticket.agent_id || Number(ticket.agent_id) === Number(user.id);
  };

  const getStatusColor = (status) => {
    const colors = {
      open: "default",
      in_progress: "primary",
      resolved: "success",
      closed: "default",
    };
    return colors[status] || "default";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderTicketTable = (ticketList, showAgent = true) => {
    if (ticketList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={showAgent ? 8 : 6} align="center">
            No tickets found
          </TableCell>
        </TableRow>
      );
    }

    return ticketList.map((ticket) => (
      <TableRow
        key={ticket.id}
        sx={{
          backgroundColor: ticket.escalated
            ? "rgba(255, 152, 0, 0.1)"
            : "inherit",
          borderLeft: ticket.escalated ? "4px solid #ff9800" : "none",
        }}
      >
        <TableCell>#{ticket.id}</TableCell>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {ticket.title}
            {ticket.escalated && (
              <Chip
                label="ESCALATED"
                color="warning"
                size="small"
                sx={{ fontWeight: "bold" }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Chip
            label={ticket.status.replace("_", " ")}
            color={getStatusColor(ticket.status)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={ticket.priority.toUpperCase()}
              color={
                ticket.priority === "urgent"
                  ? "error"
                  : ticket.priority === "high"
                  ? "warning"
                  : ticket.priority === "medium"
                  ? "info"
                  : "default"
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
        {showAgent && (
          <>
            <TableCell>{ticket.customer_name || "N/A"}</TableCell>
            <TableCell>{ticket.agent_name || "Unassigned"}</TableCell>
          </>
        )}
        <TableCell>{formatDate(ticket.created_at)}</TableCell>
        <TableCell>
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => navigate(`/tickets/${ticket.id}`)}
            >
              <Visibility />
            </IconButton>
            {canDeleteTicket(ticket) && (
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteTicket(ticket.id)}
              >
                <Delete />
              </IconButton>
            )}
          </Box>
        </TableCell>
      </TableRow>
    ));
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // For agents, organize tickets into sections
  if (role === "agent") {
    const myTickets = tickets.filter(
      (t) => Number(t.agent_id) === Number(user.id) && t.status !== "closed"
    );
    const unassignedTickets = tickets.filter(
      (t) => !t.agent_id && t.status !== "closed"
    );
    const otherAgentTickets = tickets.filter(
      (t) =>
        t.agent_id &&
        Number(t.agent_id) !== Number(user.id) &&
        t.status !== "closed"
    );
    const closedTickets = tickets.filter((t) => t.status === "closed");

    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            gap: 3,
            alignItems: "flex-start",
          }}
        >
          {/* Main tables column (~60%) */}
          <Box sx={{ flex: 3 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
            ></Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* My Tickets Section */}
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "primary.light",
                  color: "primary.contrastText",
                }}
              >
                <Typography variant="h6">My Tickets (In Progress)</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{renderTicketTable(myTickets, false)}</TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Other Tickets Section */}
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Box sx={{ p: 2, backgroundColor: "grey.300" }}>
                <Typography variant="h6">Other Tickets</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Agent</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {renderTicketTable(
                      [...unassignedTickets, ...otherAgentTickets],
                      true
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Closed Tickets Section */}
            {closedTickets.length > 0 && (
              <Paper elevation={3}>
                <Box sx={{ p: 2, backgroundColor: "grey.200" }}>
                  <Typography variant="h6">Closed Tickets</Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Agent</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {renderTicketTable(closedTickets, true)}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Box>

          {/* Right insights sidebar (~40%) */}
          <Box
            sx={{
              flex: 2,
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              gap: 3,
            }}
          >
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Workload Overview
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total Tickets
                  </Typography>
                  <Typography variant="h5">{ticketCounts.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    My Open/In Progress
                  </Typography>
                  <Typography variant="h5">{myTickets.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Unassigned
                  </Typography>
                  <Typography variant="h6">
                    {unassignedTickets.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Escalated
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {ticketCounts.escalated}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                By Priority
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Urgent</Typography>
                  <Chip
                    label={ticketCounts.byPriority.urgent || 0}
                    color="error"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">High</Typography>
                  <Chip
                    label={ticketCounts.byPriority.high || 0}
                    color="warning"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Medium</Typography>
                  <Chip
                    label={ticketCounts.byPriority.medium || 0}
                    color="info"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Low</Typography>
                  <Chip label={ticketCounts.byPriority.low || 0} size="small" />
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Container>
    );
  }

  // For customers and admins, show all tickets in one table with a sidebar
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        {/* Main content column (~60%) */}
        <Box sx={{ flex: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Agent Statistics Table for Admins */}
          {role === "admin" && (
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: "primary.light",
                  color: "primary.contrastText",
                }}
              >
                <Typography variant="h6">Agent Statistics</Typography>
              </Box>
              {statsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : agentStats ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Agent</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Email</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>In Progress</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Resolved</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Closed</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentStats.agents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No agents found
                          </TableCell>
                        </TableRow>
                      ) : (
                        agentStats.agents.map((agent) => (
                          <TableRow key={agent.id}>
                            <TableCell>{agent.username}</TableCell>
                            <TableCell>{agent.email}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={agent.in_progress}
                                color="primary"
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={agent.resolved}
                                color="success"
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={agent.closed}
                                color="default"
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow sx={{ backgroundColor: "grey.100" }}>
                        <TableCell colSpan={2}>
                          <strong>Unassigned Tickets</strong>
                        </TableCell>
                        <TableCell colSpan={3} align="right">
                          <Chip
                            label={agentStats.unassigned_tickets}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: "bold" }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : null}
            </Paper>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h4" component="h1">
              {role === "customer" ? "Your Tickets" : "All Tickets"}
            </Typography>
            {role === "customer" && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate("/tickets/new")}
              >
                Create Ticket
              </Button>
            )}
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Priority</TableCell>
                  {role !== "customer" && <TableCell>Customer</TableCell>}
                  {role !== "customer" && <TableCell>Agent</TableCell>}
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {renderTicketTable(tickets, role !== "customer")}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Right insights sidebar (~40%) */}
        <Box
          sx={{
            flex: 2,
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Overview
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Tickets
                </Typography>
                <Typography variant="h5">{ticketCounts.total}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Open
                </Typography>
                <Typography variant="h5">
                  {ticketCounts.byStatus.open || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  In Progress
                </Typography>
                <Typography variant="h6">
                  {ticketCounts.byStatus.in_progress || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Resolved / Closed
                </Typography>
                <Typography variant="h6">
                  {(ticketCounts.byStatus.resolved || 0) +
                    (ticketCounts.byStatus.closed || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Escalated
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {ticketCounts.escalated}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Priority Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Urgent</Typography>
                <Chip
                  label={ticketCounts.byPriority.urgent || 0}
                  color="error"
                  size="small"
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">High</Typography>
                <Chip
                  label={ticketCounts.byPriority.high || 0}
                  color="warning"
                  size="small"
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Medium</Typography>
                <Chip
                  label={ticketCounts.byPriority.medium || 0}
                  color="info"
                  size="small"
                />
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Low</Typography>
                <Chip label={ticketCounts.byPriority.low || 0} size="small" />
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default Dashboard;
