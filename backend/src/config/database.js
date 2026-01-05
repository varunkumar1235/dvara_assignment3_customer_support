const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ticketing_db",
  user: "postgres",
  password: "kumar",
});

// Initialize database schema
const initDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'agent', 'customer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
        priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        closed_at TIMESTAMP,
        sla_deadline TIMESTAMP,
        first_response_at TIMESTAMP,
        escalated BOOLEAN DEFAULT FALSE,
        escalation_count INTEGER DEFAULT 0
      )
    `);

    // Comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100),
        uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_agent ON tickets(agent_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_files_ticket ON files(ticket_id);
    `);

    // Add SLA columns if they don't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='first_response_at') THEN
          ALTER TABLE tickets ADD COLUMN first_response_at TIMESTAMP;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='escalated') THEN
          ALTER TABLE tickets ADD COLUMN escalated BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='escalation_count') THEN
          ALTER TABLE tickets ADD COLUMN escalation_count INTEGER DEFAULT 0;
        END IF;
      END $$;
    `);

    // Add customer_response_deadline column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tickets' AND column_name='customer_response_deadline') THEN
          ALTER TABLE tickets ADD COLUMN customer_response_deadline TIMESTAMP;
        END IF;
      END $$;
    `);

    // Update existing tickets to set default values
    await pool.query(`
      UPDATE tickets SET escalated = FALSE WHERE escalated IS NULL;
    `);

    await pool.query(`
      UPDATE tickets SET escalation_count = 0 WHERE escalation_count IS NULL;
    `);

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

module.exports = { pool, initDatabase };
