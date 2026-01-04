const { pool } = require('../config/database');

const createComment = async (req, res, next) => {
  try {
    const { ticket_id, content } = req.body;
    const userId = req.user.id;
    const { role } = req.user;

    if (!ticket_id || !content) {
      return res.status(400).json({ error: 'Ticket ID and content are required' });
    }

    // Only agents can respond to tickets (not customers or admins)
    if (role === 'customer') {
      return res.status(403).json({ error: 'Customers cannot add comments. Please create a new ticket for additional issues.' });
    }
    
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admins can only view tickets. Only agents can respond to tickets.' });
    }

    // Verify ticket exists and check if it's assigned to this agent
    const ticketResult = await pool.query(
      'SELECT id, agent_id, status FROM tickets WHERE id = $1',
      [ticket_id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Don't allow comments on closed tickets
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot comment on closed tickets' });
    }

    // If ticket has an agent assigned, only that agent can comment
    // Exception: if ticket is reopened (status = 'open' and agent_id is NULL), any agent can take it
    if (ticket.agent_id && ticket.agent_id !== userId) {
      return res.status(403).json({ error: 'This ticket is assigned to another agent. Only the assigned agent can respond.' });
    }

    // If no agent assigned, assign current agent to ticket
    if (!ticket.agent_id) {
      await pool.query(
        'UPDATE tickets SET agent_id = $1, status = $2, updated_at = $3 WHERE id = $4',
        [userId, 'in_progress', new Date(), ticket_id]
      );
    }

    // Create comment
    const result = await pool.query(
      `INSERT INTO comments (ticket_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [ticket_id, userId, content]
    );

    const now = new Date();

    // Check if this is the first response (first comment by an agent)
    const existingComments = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE ticket_id = $1',
      [ticket_id]
    );

    const isFirstResponse = existingComments.rows[0].count === '1';

    // Update ticket - set first_response_at if this is the first comment
    if (isFirstResponse) {
      // Set first response timestamp and update SLA deadline (15 minutes from now for resolution)
      const resolutionDeadline = new Date(now);
      resolutionDeadline.setMinutes(resolutionDeadline.getMinutes() + 15);

      await pool.query(
        `UPDATE tickets 
         SET updated_at = $1, 
             first_response_at = $1,
             sla_deadline = $2
         WHERE id = $3`,
        [now, resolutionDeadline, ticket_id]
      );
    } else {
      await pool.query(
        'UPDATE tickets SET updated_at = $1 WHERE id = $2',
        [now, ticket_id]
      );
    }

    // Get comment with user info
    const commentResult = await pool.query(
      `SELECT c.*, u.username, u.role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ comment: commentResult.rows[0] });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { ticket_id } = req.params;

    const result = await pool.query(
      `SELECT c.*, u.username, u.role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [ticket_id]
    );

    res.json({ comments: result.rows });
  } catch (error) {
    next(error);
  }
};

module.exports = { createComment, getComments };

