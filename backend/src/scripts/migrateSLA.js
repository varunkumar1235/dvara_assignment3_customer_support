const { pool } = require('../config/database');
require('dotenv').config();

const migrateSLA = async () => {
  try {
    console.log('Starting SLA migration...');

    // Add new columns if they don't exist
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

    // Update existing tickets to set escalated to false if null
    await pool.query(`
      UPDATE tickets SET escalated = FALSE WHERE escalated IS NULL;
    `);

    // Update existing tickets to set escalation_count to 0 if null
    await pool.query(`
      UPDATE tickets SET escalation_count = 0 WHERE escalation_count IS NULL;
    `);

    console.log('SLA migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during SLA migration:', error);
    process.exit(1);
  }
};

migrateSLA();

