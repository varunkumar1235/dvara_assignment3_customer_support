const { pool } = require('../config/database');

const createTicket = async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    const customerId = req.user.id;
    const files = req.files || [];

    if (!title || !description) {
      // Clean up uploaded files if validation fails
      if (files.length > 0) {
        const fs = require('fs');
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Calculate SLA deadline (24 hours from now for first response)
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + 24);

    const result = await pool.query(
      `INSERT INTO tickets (title, description, priority, customer_id, sla_deadline, escalated, escalation_count)
       VALUES ($1, $2, $3, $4, $5, FALSE, 0)
       RETURNING *`,
      [title, description, priority || 'medium', customerId, slaDeadline]
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
      const fs = require('fs');
      req.files.forEach(file => {
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
    
    // Check all tickets for SLA breaches before returning
    const slaService = require('../services/slaService');
    await slaService.checkAllTicketsForSLA();

    let query;
    let params;

    if (role === 'customer') {
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
    } else {
      // Admin and Agent can see all tickets
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

    // Check for SLA breach and escalate if needed
    const slaService = require('../services/slaService');
    await slaService.checkTicketSLA(id);

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
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (role === 'customer' && ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
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
    const { role } = req.user;

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Only agents can change status (admins cannot)
    if (role !== 'agent') {
      return res.status(403).json({ error: 'Only agents can update ticket status' });
    }

    const updateFields = { updated_at: new Date() };
    if (status === 'resolved') {
      updateFields.resolved_at = new Date();
    }
    if (status === 'closed') {
      updateFields.closed_at = new Date();
    }

    const result = await pool.query(
      `UPDATE tickets 
       SET status = $1, updated_at = $2, resolved_at = $3, closed_at = $4
       WHERE id = $5
       RETURNING *`,
      [status, updateFields.updated_at, updateFields.resolved_at || null, updateFields.closed_at || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
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
    if (role !== 'agent') {
      return res.status(403).json({ error: 'Only agents can assign tickets' });
    }

    // Check if ticket already has an agent assigned
    const ticketCheck = await pool.query(
      'SELECT agent_id, status FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketCheck.rows[0];

    // If ticket already has an agent and it's not the current user, prevent assignment
    if (ticket.agent_id && ticket.agent_id !== userId && ticket.agent_id !== agent_id) {
      return res.status(403).json({ error: 'Ticket is already assigned to another agent' });
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
    if (role !== 'customer') {
      return res.status(403).json({ error: 'Only customers can confirm resolved tickets' });
    }

    // Get ticket and verify it belongs to the customer
    const ticketResult = await pool.query(
      'SELECT id, status, customer_id FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Verify ticket belongs to customer
    if (ticket.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify ticket is in resolved status
    if (ticket.status !== 'resolved') {
      return res.status(400).json({ error: 'Ticket must be in resolved status to confirm' });
    }

    // Update ticket to closed status
    const result = await pool.query(
      `UPDATE tickets 
       SET status = 'closed', closed_at = $1, updated_at = $1
       WHERE id = $2
       RETURNING *`,
      [new Date(), id]
    );

    res.json({ 
      ticket: result.rows[0],
      message: 'Ticket confirmed and closed successfully'
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
};

