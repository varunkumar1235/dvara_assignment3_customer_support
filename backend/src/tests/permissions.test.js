const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/database');

describe('Permission Tests', () => {
  let customerToken;
  let agentToken;
  let adminToken;
  let customerId;
  let agentId;
  let otherCustomerId;
  let ticketId;

  beforeAll(async () => {
    const bcrypt = require('bcrypt');
    
    // Create customer 1
    const customerPassword = await bcrypt.hash('password123', 10);
    const customerResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['customer1', 'customer1@test.com', customerPassword, 'customer']
    );
    customerId = customerResult.rows[0].id;

    // Create customer 2
    const otherCustomerResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['customer2', 'customer2@test.com', customerPassword, 'customer']
    );
    otherCustomerId = otherCustomerResult.rows[0].id;

    // Create agent
    const agentPassword = await bcrypt.hash('password123', 10);
    const agentResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['agent1', 'agent1@test.com', agentPassword, 'agent']
    );
    agentId = agentResult.rows[0].id;

    // Create admin
    const adminPassword = await bcrypt.hash('password123', 10);
    await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
      ['admin1', 'admin1@test.com', adminPassword, 'admin']
    );

    // Create ticket for customer 1
    const ticketResult = await pool.query(
      'INSERT INTO tickets (title, description, customer_id) VALUES ($1, $2, $3) RETURNING id',
      ['Test Ticket', 'Test Description', customerId]
    );
    ticketId = ticketResult.rows[0].id;

    // Generate tokens
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    customerToken = jwt.sign(
      { id: customerId, username: 'customer1', role: 'customer' },
      secret,
      { expiresIn: '1h' }
    );
    
    agentToken = jwt.sign(
      { id: agentId, username: 'agent1', role: 'agent' },
      secret,
      { expiresIn: '1h' }
    );
    
    adminToken = jwt.sign(
      { id: 999, username: 'admin1', role: 'admin' },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM files WHERE ticket_id = $1', [ticketId]);
    await pool.query('DELETE FROM comments WHERE ticket_id = $1', [ticketId]);
    await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, 999)', [customerId, otherCustomerId, agentId]);
    await pool.end();
  });

  test('Customer cannot access other customer tickets', async () => {
    // Create ticket for other customer
    const otherTicketResult = await pool.query(
      'INSERT INTO tickets (title, description, customer_id) VALUES ($1, $2, $3) RETURNING id',
      ['Other Ticket', 'Other Description', otherCustomerId]
    );
    const otherTicketId = otherTicketResult.rows[0].id;

    const response = await request(app)
      .get(`/api/tickets/${otherTicketId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(response.status).toBe(403);

    // Cleanup
    await pool.query('DELETE FROM tickets WHERE id = $1', [otherTicketId]);
  });

  test('Agent can access all tickets', async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${agentToken}`);

    expect(response.status).toBe(200);
  });

  test('Admin can access all tickets', async () => {
    const response = await request(app)
      .get(`/api/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
  });

  test('Only agent/admin can update ticket status', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'closed' });

    expect(response.status).toBe(403);
  });

  test('Only agent/admin can assign agents', async () => {
    const response = await request(app)
      .patch(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ agent_id: agentId });

    expect(response.status).toBe(403);
  });
});


