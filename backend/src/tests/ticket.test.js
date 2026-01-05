const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');

describe('Ticket Lifecycle Tests', () => {
  let customerToken;
  let agentToken;
  let adminToken;
  let customerId;
  let agentId;
  let ticketId;

  beforeAll(async () => {
    // Create test users
    const bcrypt = require('bcrypt');
    
    // Create customer
    const customerPassword = await bcrypt.hash('password123', 10);
    const customerResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['testcustomer', 'customer@test.com', customerPassword, 'customer']
    );
    customerId = customerResult.rows[0].id;

    // Create agent
    const agentPassword = await bcrypt.hash('password123', 10);
    const agentResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['testagent', 'agent@test.com', agentPassword, 'agent']
    );
    agentId = agentResult.rows[0].id;

    // Create admin
    const adminPassword = await bcrypt.hash('password123', 10);
    await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['testadmin', 'admin@test.com', adminPassword, 'admin']
    );

    // Login to get tokens
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    customerToken = jwt.sign(
      { id: customerId, username: 'testcustomer', role: 'customer' },
      secret,
      { expiresIn: '1h' }
    );
    
    agentToken = jwt.sign(
      { id: agentId, username: 'testagent', role: 'agent' },
      secret,
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { id: 999, username: 'testadmin', role: 'admin' },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM files WHERE ticket_id IN (SELECT id FROM tickets WHERE customer_id = $1)', [customerId]);
    await pool.query('DELETE FROM comments WHERE ticket_id IN (SELECT id FROM tickets WHERE customer_id = $1)', [customerId]);
    await pool.query('DELETE FROM tickets WHERE customer_id = $1', [customerId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, 999)', [customerId, agentId]);
    await pool.end();
  });

  test('Customer can create a ticket', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Test Ticket',
        description: 'This is a test ticket',
        priority: 'high',
      });

    expect(response.status).toBe(201);
    expect(response.body.ticket).toHaveProperty('id');
    expect(response.body.ticket.status).toBe('open');
    ticketId = response.body.ticket.id;
  });

  test('Customer cannot update ticket status', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'closed' });

    expect(response.status).toBe(403);
  });

  test('Agent can update ticket status', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.ticket.status).toBe('in_progress');
  });

  test('Agent can add comment to ticket', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${agentToken}`)
      .send({
        ticket_id: ticketId,
        content: 'This is a test comment',
      });

    expect(response.status).toBe(201);
    expect(response.body.comment).toHaveProperty('id');
  });

  test('Customer cannot add comment', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ticket_id: ticketId,
        content: 'This should fail',
      });

    expect(response.status).toBe(403);
  });

  test('Agent can close ticket', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ status: 'closed' });

    expect(response.status).toBe(200);
    expect(response.body.ticket.status).toBe('closed');
    expect(response.body.ticket.closed_at).toBeTruthy();
  });

  test('Admin can view all tickets', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tickets)).toBe(true);
  });

  test('Customer can only view own tickets', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.tickets)).toBe(true);
    // All tickets should belong to the customer
    response.body.tickets.forEach((ticket) => {
      expect(ticket.customer_id).toBe(customerId);
    });
  });
});





