# Customer Support Ticketing System

A full-stack helpdesk system with role-based access control, ticket management, comment threads, SLA tracking, and file uploads.

## Features

- **Role-Based Access Control**: Admin, Support Agent, and Customer roles
- **Ticket Management**: Create, view, update, and close tickets
- **Comment Threads**: Agents can respond to tickets with threaded comments
- **SLA Timer**: Basic SLA tracking with 24-hour deadline
- **File Uploads**: Attach files to tickets
- **Status Lifecycle**: Open → In Progress → Resolved → Closed

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT Authentication
- Multer for file uploads

### Frontend
- React + Vite
- Material-UI (MUI)
- React Router DOM
- Axios
- JWT Decode

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- PostgreSQL (running on port 5432)
- Database: `ticketing_db` with password: `kumar`

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional, defaults are set):
```env
PORT=5000
JWT_SECRET=your-secret-key-change-this-in-production
```

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Database Schema

The database schema is automatically created on server startup. It includes:

- **users**: User accounts with roles (admin, agent, customer)
- **tickets**: Support tickets with status, priority, and SLA tracking
- **comments**: Threaded comments on tickets
- **files**: File attachments for tickets and comments

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (customer only)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tickets
- `POST /api/tickets` - Create ticket (customer)
- `GET /api/tickets` - List tickets (filtered by role)
- `GET /api/tickets/:id` - Get ticket details
- `PATCH /api/tickets/:id/status` - Update status (agent/admin)
- `PATCH /api/tickets/:id/assign` - Assign agent (agent/admin)

### Comments
- `POST /api/comments` - Add comment (agent/admin)
- `GET /api/comments/ticket/:ticket_id` - Get ticket comments

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Delete file

## Role Permissions

### Customer
- Create tickets
- View own tickets
- Cannot comment or update status

### Support Agent
- View all tickets
- Respond to tickets (add comments)
- Update ticket status
- Assign tickets
- Close tickets

### Admin
- All agent permissions
- Full system access

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Tests include:
- Ticket lifecycle tests
- Permission tests

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middlewares/   # Auth and error handling
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── tests/         # Test files
│   │   └── app.js         # Express app
│   └── uploads/           # File uploads directory
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── utils/         # Utilities (API, auth)
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   └── public/            # Static assets
└── README.md
```

## Notes

- Default JWT secret is `your-secret-key` (change in production)
- File uploads are stored in `backend/uploads/`
- SLA deadline is set to 24 hours from ticket creation
- All timestamps are in UTC
