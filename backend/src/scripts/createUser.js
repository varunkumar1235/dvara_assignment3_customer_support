const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
require('dotenv').config();

const createUser = async (username, email, password, role) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, role]
    );

    console.log('User created successfully:');
    console.log(result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  }
};

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('Usage: node createUser.js <username> <email> <password> <role>');
  console.log('Roles: admin, agent, customer');
  process.exit(1);
}

const [username, email, password, role] = args;

if (!['admin', 'agent', 'customer'].includes(role)) {
  console.error('Invalid role. Must be: admin, agent, or customer');
  process.exit(1);
}

createUser(username, email, password, role);






