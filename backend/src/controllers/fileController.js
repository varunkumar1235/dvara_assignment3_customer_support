const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow all file types
    cb(null, true);
  },
});

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { ticket_id, comment_id } = req.body;
    const userId = req.user.id;

    if (!ticket_id) {
      // Delete uploaded file if ticket_id is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ticket ID is required' });
    }

    // Verify ticket exists
    const ticketResult = await pool.query('SELECT id FROM tickets WHERE id = $1', [ticket_id]);
    if (ticketResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Save file info to database
    const result = await pool.query(
      `INSERT INTO files (ticket_id, comment_id, filename, original_name, file_path, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        ticket_id,
        comment_id || null,
        req.file.filename,
        req.file.originalname,
        req.file.path,
        req.file.size,
        req.file.mimetype,
        userId,
      ]
    );

    res.status(201).json({ file: result.rows[0] });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Get file with ticket info
    const result = await pool.query(
      `SELECT f.*, t.customer_id, t.agent_id
       FROM files f
       JOIN tickets t ON f.ticket_id = t.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Check permissions: customer can only access files from their own tickets
    // Agents and admins can access all files
    if (role === 'customer' && file.customer_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../../uploads', file.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, file.original_name);
  } catch (error) {
    next(error);
  }
};

const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { role } = req.user;

    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Only admin, agent, or file uploader can delete
    if (role !== 'admin' && role !== 'agent' && file.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '../../uploads', file.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.query('DELETE FROM files WHERE id = $1', [id]);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { upload, uploadFile, getFile, deleteFile };

