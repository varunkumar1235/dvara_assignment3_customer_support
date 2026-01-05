const { initDatabase, pool } = require('../config/database');

const verify = async () => {
    try {
        console.log("Starting verification...");
        await initDatabase();
        console.log("Verification successful! Database and tables are ready.");
        await pool.end(); // Close the pool to exit cleanly
    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verify();
