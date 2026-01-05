const { pool } = require("../config/database");

// Priority escalation mapping
const PRIORITY_LEVELS = {
  low: "medium",
  medium: "high",
  high: "urgent",
  urgent: "urgent", // Can't escalate beyond urgent
};

// SLA Time limits (in milliseconds)
const FIRST_RESPONSE_TIME = 5 * 60 * 1000; // 5 minutes
const RESOLUTION_TIME = 15 * 60 * 1000; // 15 minutes

/**
 * Check if ticket needs escalation and escalate if needed
 */
const checkAndEscalateTicket = async (ticketId) => {
  try {
    const ticketResult = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return { escalated: false, reason: "Ticket not found" };
    }

    const ticket = ticketResult.rows[0];

    // Don't escalate closed or resolved tickets
    if (ticket.status === "closed" || ticket.status === "resolved") {
      return {
        escalated: false,
        reason: `Ticket is ${ticket.status} and should not be escalated`,
      };
    }

    const now = new Date();

    // If ticket was escalated, use updated_at as the new starting point for SLA
    // Otherwise use created_at
    const slaStartTime =
      ticket.escalated && ticket.updated_at
        ? new Date(ticket.updated_at)
        : new Date(ticket.created_at);

    const firstResponseAt = ticket.first_response_at
      ? new Date(ticket.first_response_at)
      : null;

    let needsEscalation = false;
    let escalationReason = "";

    // Check First Response SLA (5 minutes)
    // If ticket was escalated, check from escalation time
    if (!firstResponseAt) {
      // No first response yet - check from SLA start time
      const timeSinceStart = now - slaStartTime;
      if (timeSinceStart > FIRST_RESPONSE_TIME) {
        needsEscalation = true;
        escalationReason = "First response not provided within 5 minutes";
      }
    } else {
      // Check Resolution SLA (15 minutes after first response)
      const timeSinceFirstResponse = now - firstResponseAt;
      if (ticket.status !== "resolved" && ticket.status !== "closed") {
        if (timeSinceFirstResponse > RESOLUTION_TIME) {
          needsEscalation = true;
          escalationReason =
            "Resolution not provided within 15 minutes of first response";
        }
      }
    }

    if (!needsEscalation) {
      return { escalated: false, reason: "SLA not breached" };
    }

    // Perform escalation
    const newPriority = PRIORITY_LEVELS[ticket.priority] || ticket.priority;
    const escalationCount = (ticket.escalation_count || 0) + 1;

    // Reset agent assignment and timers
    const newSlaDeadline = new Date();
    newSlaDeadline.setMinutes(newSlaDeadline.getMinutes() + 5);

    await pool.query(
      `UPDATE tickets 
       SET priority = $1,
           escalated = TRUE,
           escalation_count = $2,
           agent_id = NULL,
           status = 'open',
           sla_deadline = $3,
           first_response_at = NULL,
       updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [newPriority, escalationCount, newSlaDeadline, now, ticketId]
    );

    return {
      escalated: true,
      reason: escalationReason,
      newPriority,
      escalationCount,
    };
  } catch (error) {
    console.error("Error in SLA escalation:", error);
    throw error;
  }
};

/**
 * Auto-close resolved tickets if customer doesn't respond within 5 minutes
 */
const checkAndAutoCloseResolvedTickets = async () => {
  try {
    const now = new Date();
    const result = await pool.query(
      `UPDATE tickets 
       SET status = 'closed', 
           closed_at = $1,
           updated_at = $1,
           customer_response_deadline = NULL
       WHERE status = 'resolved' 
         AND customer_response_deadline IS NOT NULL
         AND customer_response_deadline < $1
       RETURNING id`,
      [now]
    );

    return result.rows.length;
  } catch (error) {
    console.error("Error auto-closing resolved tickets:", error);
    throw error;
  }
};

/**
 * Check all open tickets for SLA breaches
 */
const checkAllTicketsForSLA = async () => {
  try {
    // First, auto-close resolved tickets past customer response deadline
    await checkAndAutoCloseResolvedTickets();

    // Check all non-closed tickets (including previously escalated ones)
    const ticketsResult = await pool.query(
      `SELECT id FROM tickets 
       WHERE status NOT IN ('closed', 'resolved')`
    );

    const escalations = [];
    for (const ticket of ticketsResult.rows) {
      const result = await checkAndEscalateTicket(ticket.id);
      if (result.escalated) {
        escalations.push({
          ticketId: ticket.id,
          ...result,
        });
      }
    }

    return escalations;
  } catch (error) {
    console.error("Error checking all tickets for SLA:", error);
    throw error;
  }
};

/**
 * Check a single ticket for SLA breach (called on ticket access)
 */
const checkTicketSLA = async (ticketId) => {
  return await checkAndEscalateTicket(ticketId);
};

module.exports = {
  checkAndEscalateTicket,
  checkAllTicketsForSLA,
  checkTicketSLA,
  checkAndAutoCloseResolvedTickets,
  FIRST_RESPONSE_TIME,
  RESOLUTION_TIME,
};
