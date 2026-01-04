const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  createTicket,
  getTickets,
  getTicket,
  updateTicketStatus,
  assignAgent,
  confirmResolved,
  rejectResolved,
} = require("../controllers/ticketController");
const { authenticate, authorize } = require("../middlewares/auth");

// All routes require authentication
router.use(authenticate);

// Configure multer for ticket file uploads
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
  fileFilter: (req, file, cb) => {
    // Allow images, text files, PDFs, and videos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|mp4|avi|mov|wmv/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype || extname) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only images, PDFs, text files, and videos are allowed."
        )
      );
    }
  },
});

// Customers can create tickets (with optional file uploads)
router.post("/", upload.array("files", 5), createTicket);

// Everyone can view tickets (with role-based filtering)
router.get("/", getTickets);

// Get single ticket
router.get("/:id", getTicket);

// Only agents can update status (admins cannot)
router.patch("/:id/status", authorize("agent"), updateTicketStatus);

// Only agents can assign agents (admins cannot)
router.patch("/:id/assign", authorize("agent"), assignAgent);

// Customers can confirm resolved tickets
router.post("/:id/confirm", confirmResolved);

// Customers can reject resolved tickets
router.post("/:id/reject", rejectResolved);

module.exports = router;
