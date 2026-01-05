# Customer Support Ticketing System

A full-stack helpdesk system with role-based access control, SLA-aware ticket lifecycle, comments, and file uploads.
Frontend is a modern React + MUI dashboard; backend is Node/Express with PostgreSQL and JWT auth.

## Features

- **Role-Based Access Control**: Admin, Agent, and Customer roles.
- **Ticket Lifecycle**: Open → In Progress → Resolved → Closed with SLA timers and escalation.
- **Comments & Attachments**: Agents can comment on tickets and attach files.
- **Auth & Security**: JWT-based authentication, bcrypt password hashing.

---

## Setup Steps

### Prerequisites
- Node.js (v14+)
- PostgreSQL (v12+)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in `backend/` as described in the [Environment Configuration](#environment-configuration) section.

4. **Initialize Database** (Auto-init on start) or manually via seed:
   The application automatically attempts to create tables on startup.

5. **Seed the Database** (Recommended):
   Populate the database with sample users (Admin, Agent, Customer) and tickets.
   ```bash
   npm run seed
   ```

6. **Start the Server**:
   ```bash
   npm run dev
   ```
   Server runs on `http://localhost:5000` by default.

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the Frontend**:
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:5173`.

---

## Environment Configuration

Create a `.env` file in the **backend** folder with the following variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API Server Port | `5000` |
| `JWT_SECRET` | Secret key for JWT signing | `change-me-in-production` |
| `DB_HOST` | Database Host | `localhost` |
| `DB_PORT` | Database Port | `5432` |
| `DB_NAME` | Database Name | `ticketing_db` |
| `DB_USER` | Database User | `postgres` |
| `DB_PASSWORD` | Database Password | `your_postgres_password_here` |

For the **frontend** (optional `frontend/.env`):

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Check backend URL | `http://localhost:5000/api` |

---

## Role Credentials

After running `npm run seed`, the following default accounts are available:

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Admin** | `admin@example.com` | `password123` | Full access to all tickets, users, and stats. |
| **Agent** | `agent@example.com` | `password123` | Manage tickets, update status, add comments. |
| **Customer** | `customer@example.com` | `password123` | Create tickets, view own tickets. |

---

## API Documentation

### Authentication

- **Register (Customer)**
  - `POST /api/auth/register`
  - Body: `{ "username": "user", "email": "user@test.com", "password": "password" }`

- **Login**
  - `POST /api/auth/login`
  - Body: `{ "email": "admin@example.com", "password": "password123" }`
  - Returns `token` (JWT) to be used in `Authorization: Bearer <token>` header.

- **Get Current User**
  - `GET /api/auth/me`

### Tickets

- **Create Ticket**
  - `POST /api/tickets`
  - Body: `{ "title": "Help", "description": "Issue details", "priority": "high" }`

- **List Tickets**
  - `GET /api/tickets` (Filters applied based on user role)

- **Get Ticket Details**
  - `GET /api/tickets/:id`

- **Update Status** (Agent/Admin)
  - `PATCH /api/tickets/:id/status`
  - Body: `{ "status": "in_progress" }`

- **Assign Ticket** (Agent/Admin)
  - `PATCH /api/tickets/:id/assign`
  - Body: `{ "agent_id": 123 }`

### Comments

- **Add Comment** (Agent/Admin)
  - `POST /api/comments`
  - Body: `{ "ticket_id": 1, "content": "Looking into it." }`

### Files

- **Upload File**
  - `POST /api/files/upload` (Multipart form-data)
  
- **Download File**
  - `GET /api/files/:id`

---

## Testing

Backend tests use **Jest + Supertest**.

Run all tests:
```bash
cd backend
npm test
```

Specific suites:
```bash
npm test src/tests/ticket.test.js
npm test src/tests/permissions.test.js
```
