const { pool } = require("../config/database");

const createTicket = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    const customerId = req.user.id;
    const files = req.files || [];

    if (!title || !description) {
      // Clean up uploaded files if validation fails
      if (files.length > 0) {
        const fs = require("fs");
        files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res
        .status(400)
        .json({ error: "Title and description are required" });
    }

    // Calculate SLA deadline (5 minutes from now for first response)
    const slaDeadline = new Date();
    slaDeadline.setMinutes(slaDeadline.getMinutes() + 5);

    const result = await pool.query(
      `INSERT INTO tickets (title, description, priority, customer_id, sla_deadline, escalated, escalation_count)
       VALUES ($1, $2, $3, $4, $5, FALSE, 0)
       RETURNING *`,
      [title, description, priority || "medium", customerId, slaDeadline]
    );

    const ticket = result.rows[0];

    // Save uploaded files
    const savedFiles = [];
    if (files.length > 0) {
      for (const file of files) {
        const fileResult = await pool.query(
          `INSERT INTO files (ticket_id, filename, original_name, file_path, file_size, mime_type, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            ticket.id,
            file.filename,
            file.originalname,
            file.path,
            file.size,
            file.mimetype,
            customerId,
          ]
        );
        savedFiles.push(fileResult.rows[0]);
      }
    }

    res.status(201).json({ ticket, files: savedFiles });
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      const fs = require("fs");
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    next(error);
  }
};

const getTickets = async (req, res, next) => {
  try {
    const { role, id } = req.user;

    // Check all tickets for SLA breaches and auto-close resolved tickets before returning
    const slaService = require("../services/slaService");
    await slaService.checkAllTicketsForSLA();

    let query;
    let params;

    if (role === "customer") {
      // Customers can only see their own tickets
      query = `
        SELECT t.*, 
               u1.username as customer_name, 
               u2.username as agent_name
        FROM tickets t
        LEFT JOIN users u1 ON t.customer_id = u1.id
        LEFT JOIN users u2 ON t.agent_id = u2.id
        WHERE t.customer_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [id];
    } else if (role === "agent") {
      // Agents see tickets organized by assignment
      // First: tickets assigned to this agent (in progress)
      // Then: unassigned tickets
      // Then: tickets assigned to other agents (in progress)
      // Finally: closed tickets
      query = `
        SELECT t.*, 
               u1.username as customer_name, 
               u2.username as agent_name,
               CASE 
                 WHEN t.agent_id = $1 AND t.status != 'closed' THEN 1
                 WHEN t.agent_id IS NULL AND t.status != 'closed' THEN 2
                 WHEN t.agent_id IS NOT NULL AND t.agent_id != $1 AND t.status != 'closed' THEN 3
                 WHEN t.status = 'closed' THEN 4
                 ELSE 5
               END as sort_order
        FROM tickets t
        LEFT JOIN users u1 ON t.customer_id = u1.id
        LEFT JOIN users u2 ON t.agent_id = u2.id
        ORDER BY sort_order, t.created_at DESC
      `;
      params = [id];
    } else {
      // Admin can see all tickets
      query = `
        SELECT t.*, 
               u1.username as customer_name, 
               u2.username as agent_name
        FROM tickets t
        LEFT JOIN users u1 ON t.customer_id = u1.id
        LEFT JOIN users u2 ON t.agent_id = u2.id
        ORDER BY t.created_at DESC
      `;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json({ tickets: result.rows });
  } catch (error) {
    next(error);
  }
};

const getTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Check for SLA breach and escalate if needed, also check for auto-close
    const slaService = require("../services/slaService");
    await slaService.checkTicketSLA(id);
    await slaService.checkAndAutoCloseResolvedTickets();

    const ticketResult = await pool.query(
      `SELECT t.*, 
              u1.username as customer_name, 
              u1.email as customer_email,
              u2.username as agent_name,
              u2.email as agent_email
       FROM tickets t
       LEFT JOIN users u1 ON t.customer_id = u1.id
       LEFT JOIN users u2 ON t.agent_id = u2.id
       WHERE t.id = $1`,
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (role === "customer" && ticket.customer_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get comments
    const commentsResult = await pool.query(
      `SELECT c.*, u.username, u.role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [id]
    );

    // Get files
    const filesResult = await pool.query(
      `SELECT f.*, u.username as uploaded_by_name
       FROM files f
       JOIN users u ON f.uploaded_by = u.id
       WHERE f.ticket_id = $1
       ORDER BY f.created_at ASC`,
      [id]
    );

    res.json({
      ticket,
      comments: commentsResult.rows,
      files: filesResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { role, id: userId } = req.user;

    if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Only agents can change status (admins cannot)
    if (role !== "agent") {
      return res
        .status(403)
        .json({ error: "Only agents can update ticket status" });
    }

    // Check if ticket is assigned and verify agent has permission
    const ticketCheck = await pool.query(
      "SELECT agent_id, status, first_response_at, sla_deadline FROM tickets WHERE id = $1",
      [id]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketCheck.rows[0];

    // Don't allow changes to closed tickets
    if (ticket.status === "closed") {
      return res.status(400).json({ error: "Cannot modify closed tickets" });
    }

    // Agent can only update tickets that are unassigned or assigned to them
    if (ticket.agent_id && ticket.agent_id !== userId) {
      return res
        .status(403)
        .json({
          error:
            "This ticket is assigned to another agent. Only the assigned agent can update it.",
        });
    }

    const now = new Date();
    const updateFields = { updated_at: now };
    let customerResponseDeadline = null;

    // If ticket is unassigned, assign it to the current agent
    const agentIdToSet = ticket.agent_id || userId;

    // Handle first response vs resolution timers
    let firstResponseAt = ticket.first_response_at;
    let slaDeadline = ticket.sla_deadline;

    // If moving to in_progress and there was no first response yet,
    // treat this status change as the first response and start the 15 min resolution SLA.
    if (status === "in_progress" && !firstResponseAt) {
      firstResponseAt = now;
      const resolutionDeadline = new Date(now);
      resolutionDeadline.setMinutes(resolutionDeadline.getMinutes() + 15);
      slaDeadline = resolutionDeadline;
    }

    if (status === "resolved") {
      updateFields.resolved_at = now;
      // Set customer response deadline to 5 minutes from now
      customerResponseDeadline = new Date(now);
      customerResponseDeadline.setMinutes(
        customerResponseDeadline.getMinutes() + 5
      );
    } else if (status === "closed") {
      updateFields.closed_at = now;
      // Clear customer response deadline when closed
      customerResponseDeadline = null;
    } else {
      // Clear customer response deadline when status changes from resolved to something else
      customerResponseDeadline = null;
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET status = $1,
           agent_id = $2,
           updated_at = $3,
           resolved_at = $4,
           closed_at = $5,
           customer_response_deadline = $6,
           first_response_at = $7,
           sla_deadline = $8
       WHERE id = $9
       RETURNING *`,
      [
        status,
        agentIdToSet,
        updateFields.updated_at,
        updateFields.resolved_at || null,
        updateFields.closed_at || null,
        customerResponseDeadline,
        firstResponseAt,
        slaDeadline,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    res.json({ ticket: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const assignAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agent_id } = req.body;
    const { role, id: userId } = req.user;

    // Only agents can assign (and they can only assign themselves or other agents)
    if (role !== "agent") {
      return res.status(403).json({ error: "Only agents can assign tickets" });
    }

    // Check if ticket already has an agent assigned
    const ticketCheck = await pool.query(
      "SELECT agent_id, status FROM tickets WHERE id = $1",
      [id]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketCheck.rows[0];

    // If ticket already has an agent and it's not the current user, prevent assignment
    if (
      ticket.agent_id &&
      ticket.agent_id !== userId &&
      ticket.agent_id !== agent_id
    ) {
      return res
        .status(403)
        .json({ error: "Ticket is already assigned to another agent" });
    }

    // If agent_id is provided, use it; otherwise, assign to current user
    const assignedAgentId = agent_id || userId;

    const result = await pool.query(
      `UPDATE tickets 
       SET agent_id = $1, status = 'in_progress', updated_at = $2
       WHERE id = $3
       RETURNING *`,
      [assignedAgentId, new Date(), id]
    );

    res.json({ ticket: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

const confirmResolved = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Only customers can confirm resolved tickets
    if (role !== "customer") {
      return res
        .status(403)
        .json({ error: "Only customers can confirm resolved tickets" });
    }

    // Get ticket and verify it belongs to the customer
    const ticketResult = await pool.query(
      "SELECT id, status, customer_id FROM tickets WHERE id = $1",
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // Verify ticket belongs to customer
    if (ticket.customer_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify ticket is in resolved status
    if (ticket.status !== "resolved") {
      return res
        .status(400)
        .json({ error: "Ticket must be in resolved status to confirm" });
    }

    // Update ticket to closed status and clear customer response deadline
    const result = await pool.query(
      `UPDATE tickets 
       SET status = 'closed', closed_at = $1, updated_at = $1, customer_response_deadline = NULL
       WHERE id = $2
       RETURNING *`,
      [new Date(), id]
    );

    res.json({
      ticket: result.rows[0],
      message: "Ticket confirmed and closed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const rejectResolved = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Only customers can reject resolved tickets
    if (role !== "customer") {
      return res
        .status(403)
        .json({ error: "Only customers can reject resolved tickets" });
    }

    // Get ticket and verify it belongs to the customer
    const ticketResult = await pool.query(
      "SELECT id, status, customer_id, priority FROM tickets WHERE id = $1",
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // Verify ticket belongs to customer
    if (ticket.customer_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Verify ticket is in resolved status
    if (ticket.status !== "resolved") {
      return res
        .status(400)
        .json({ error: "Ticket must be in resolved status to reject" });
    }

    // Escalate priority
    const priorityLevels = {
      low: "medium",
      medium: "high",
      high: "urgent",
      urgent: "urgent", // Can't escalate beyond urgent
    };
    const newPriority = priorityLevels[ticket.priority] || ticket.priority;

    const now = new Date();
    // Reset SLA deadline to 5 minutes from now
    const newSlaDeadline = new Date();
    newSlaDeadline.setMinutes(newSlaDeadline.getMinutes() + 5);

    // Reopen ticket: unassign agent, set status to open, escalate priority, reset timers
    const result = await pool.query(
      `UPDATE tickets 
       SET status = 'open',
           agent_id = NULL,
           priority = $1,
           escalated = TRUE,
           escalation_count = COALESCE(escalation_count, 0) + 1,
           sla_deadline = $2,
           first_response_at = NULL,
           resolved_at = NULL,
           customer_response_deadline = NULL,
           updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [newPriority, newSlaDeadline, now, id]
    );

    res.json({
      ticket: result.rows[0],
      message: "Ticket rejected and reopened. Priority has been escalated.",
    });
  } catch (error) {
    next(error);
  }
};

const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Only agents can delete tickets
    if (role !== "agent") {
      return res
        .status(403)
        .json({ error: "Only agents can delete tickets" });
    }

    // Get ticket and check permissions
    const ticketResult = await pool.query(
      "SELECT id, agent_id FROM tickets WHERE id = $1",
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // Agent can only delete unassigned tickets or tickets assigned to them
    if (ticket.agent_id && ticket.agent_id !== userId) {
      return res
        .status(403)
        .json({
          error:
            "You can only delete unassigned tickets or tickets assigned to you",
        });
    }

    // Delete the ticket (CASCADE will handle related comments and files)
    await pool.query("DELETE FROM tickets WHERE id = $1", [id]);

    res.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getAgentStatistics = async (req, res, next) => {
  try {
    const { role } = req.user;

    // Only admins can view agent statistics
    if (role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can view agent statistics" });
    }

    // Get all agents with their ticket counts
    const agentStatsQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN t.status = 'closed' THEN 1 END) as closed_count
      FROM users u
      LEFT JOIN tickets t ON u.id = t.agent_id
      WHERE u.role = 'agent'
      GROUP BY u.id, u.username, u.email
      ORDER BY u.username
    `;

    const agentStatsResult = await pool.query(agentStatsQuery);

    // Get count of unassigned tickets
    const unassignedCountResult = await pool.query(
      "SELECT COUNT(*) as count FROM tickets WHERE agent_id IS NULL"
    );

    const unassignedCount = parseInt(unassignedCountResult.rows[0].count, 10);

    res.json({
      agents: agentStatsResult.rows.map((agent) => ({
        id: agent.id,
        username: agent.username,
        email: agent.email,
        in_progress: parseInt(agent.in_progress_count, 10) || 0,
        resolved: parseInt(agent.resolved_count, 10) || 0,
        closed: parseInt(agent.closed_count, 10) || 0,
      })),
      unassigned_tickets: unassignedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  updateTicketStatus,
  assignAgent,
  confirmResolved,
  rejectResolved,
  deleteTicket,
  getAgentStatistics,
};
