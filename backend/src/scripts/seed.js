const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

const seedData = async () => {
  try {
    console.log('Starting seed process...');

    // 1. Create Users
    const users = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      },
      {
        username: 'agent',
        email: 'agent@example.com',
        password: 'password123',
        role: 'agent'
      },
      {
        username: 'customer',
        email: 'customer@example.com',
        password: 'password123',
        role: 'customer'
      }
    ];

    const userIds = {};

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Check if user exists
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
      
      let userId;
      if (existingUser.rows.length > 0) {
        console.log(`User ${user.username} already exists.`);
        userId = existingUser.rows[0].id;
      } else {
        const result = await pool.query(
          'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [user.username, user.email, hashedPassword, user.role]
        );
        console.log(`Created user: ${user.username}`);
        userId = result.rows[0].id;
      }
      userIds[user.role] = userId;
    }

    // 2. Create Tickets (only if we have a customer)
    if (userIds.customer) {
      const tickets = [
        {
            title: 'Login Issue',
            description: 'I cannot login to my account.',
            status: 'open',
            priority: 'high',
            customer_id: userIds.customer
        },
        {
            title: 'Feature Request',
            description: 'Please add dark mode.',
            status: 'open',
            priority: 'low',
            customer_id: userIds.customer
        }
      ];

      for (const ticket of tickets) {
        // Simple check to avoid duplicates for this run (optional, simpler to just insert or ignore)
         const result = await pool.query(
          'INSERT INTO tickets (title, description, status, priority, customer_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [ticket.title, ticket.description, ticket.status, ticket.priority, ticket.customer_id]
        );
        console.log(`Created ticket: ${ticket.title}`);
      }
    }

    console.log('Seed process completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed process failed:', error);
    process.exit(1);
  }
};

seedData();
