# Customer Support Ticketing System

A full-stack helpdesk system with role-based access control, SLA-aware ticket lifecycle, comments, and file uploads.  
Frontend is a modern React + MUI dashboard; backend is Node/Express with PostgreSQL and JWT auth.

## Features

- **Role-Based Access Control**: Admin, Agent, and Customer roles.
- **Ticket Lifecycle**: Open → In Progress → Resolved → Closed with SLA timers and escalation.
- **Comments & Attachments**: Agents can comment on tickets and attach files.
- **Auth & Security Basics**:
  - Unique **username** and **email** for every user.
  - Passwords are **hashed with bcrypt** and must be **at least 8 characters**.
  - Email format validation and basic username length validation.

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, JWT, Multer, Jest + Supertest.
- **Frontend**: React (Vite), Material UI (MUI), React Router, Axios.

## Environment Configuration

Create a `.env` file in the **backend** folder (copy from `.env.example` if present) with at least:

```env
PORT=5000
JWT_SECRET=change-me-in-production

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ticketing_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here
```

For the **frontend** (Vite), you can optionally create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

If `VITE_API_BASE_URL` is not set, the frontend defaults to `http://localhost:5000/api`.

## Backend Setup

```bash
cd backend
npm install
npm run dev   # runs Express on http://localhost:5000
```

The database schema (users, tickets, comments, files, etc.) is created automatically on server startup via `initDatabase()`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev   # Vite dev server on http://localhost:5173
```

The frontend talks to the backend via `VITE_API_BASE_URL` (or `http://localhost:5000/api` by default).

## Auth Rules & Validation

- **Registration (`POST /api/auth/register`)**
  - Required fields: `username`, `email`, `password`.
  - `username`:
    - Trimmed and must be **at least 3 characters**.
    - Must be unique.
  - `email`:
    - Trimmed, lowercased, must match a basic email pattern.
    - Must be unique.
  - `password`:
    - Must be **at least 8 characters**.
    - Stored only as a bcrypt hash.
  - `role` is forced to `customer` when registering via the public endpoint.

- **Login (`POST /api/auth/login`)**
  - Requires `email` and `password`.
  - Returns a JWT containing `id`, `username`, and `role`.

## API Overview

- **Auth**
  - `POST /api/auth/register` – Register a new customer.
  - `POST /api/auth/login` – Login.
  - `GET /api/auth/me` – Get current user (requires JWT).

- **Tickets**
  - `POST /api/tickets` – Create ticket (customer).
  - `GET /api/tickets` – List tickets (filtered by role).
  - `GET /api/tickets/:id` – Get ticket details.
  - `PATCH /api/tickets/:id/status` – Update status (agent/admin).
  - `PATCH /api/tickets/:id/assign` – Assign agent (agent/admin).

- **Comments**
  - `POST /api/comments` – Add comment (agent/admin).

- **Files**
  - `POST /api/files/upload` – Upload file.
  - `GET /api/files/:id` – Download file.

## Role Permissions (High Level)

- **Customer**
  - Register, login.
  - Create tickets and view **own** tickets.
  - Confirm or reject resolutions via the ticket detail page.

- **Agent**
  - View all tickets.
  - Update ticket status, add comments, and handle attachments.

- **Admin**
  - All agent permissions.
  - Access agent statistics and all tickets.

## Testing

Backend tests use **Jest + Supertest** and live under `backend/src/tests`.

- Run **all tests**:

```bash
cd backend
npm test
```

- Run only the **Ticket Lifecycle Tests**:

```bash
cd backend
npx jest src/tests/ticket.test.js
```

- Run only the **Permission Tests**:

```bash
cd backend
npx jest src/tests/permissions.test.js
```

Both test suites create their own users/tickets in the database and clean them up afterwards.

## Project Structure (Simplified)

```text
backend/
  src/
    config/        # Database (Pool + schema init)
    controllers/   # Auth, tickets, comments, files
    middlewares/   # Auth, error handler
    routes/        # /api/auth, /api/tickets, etc.
    tests/         # ticket.test.js, permissions.test.js
    app.js         # Express app + initDatabase()

frontend/
  src/
    components/    # Layout, shared UI
    pages/         # Login, Register, Dashboard, TicketDetail, CreateTicket
    utils/         # api client, auth helpers
```

## Notes

- Database connection is now **fully configurable via env vars** (no hardcoded passwords).
- JWT secret should always be overridden in `.env` for real deployments.
- File uploads are stored under `backend/uploads/` and served at `/uploads`.
