# Customer Support System

## 📚 Documentation

- **[SLA & Escalation Policy](./SLA_ESCALATION.md)**: Details on response times, resolution limits, and the auto-escalation process.
- **[Status Explanations](./STATUS_EXPLANATION.md)**: Breakdown of ticket statuses and what they mean.

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

- Node.js (v20.19.6)
- PostgreSQL (v18.1)
- npm (10.8.2)

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

4. **Start the Server**:

   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:5000` by default.

5. **Seed the Database**:
   In another terminal, navigate to backend and populate the database with sample users (Admin, Agent, Customer) and tickets.

   ```bash
   npm run seed
   ```

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

| Variable      | Description                | Default                       |
| ------------- | -------------------------- | ----------------------------- |
| `PORT`        | API Server Port            | `5000`                        |
| `JWT_SECRET`  | Secret key for JWT signing | `change-me-in-production`     |
| `DB_HOST`     | Database Host              | `localhost`                   |
| `DB_PORT`     | Database Port              | `5432`                        |
| `DB_NAME`     | Database Name              | `ticketing_db`                |
| `DB_USER`     | Database User              | `postgres`                    |
| `DB_PASSWORD` | Database Password          | `your_postgres_password_here` |

For the **frontend** (optional `frontend/.env`):

| Variable            | Description       | Default                     |
| ------------------- | ----------------- | --------------------------- |
| `VITE_API_BASE_URL` | Check backend URL | `http://localhost:5000/api` |

---

## Role Credentials

After running `npm run seed`, the following default accounts are available:

| Role         | Email                  | Password      | Permissions                                   |
| ------------ | ---------------------- | ------------- | --------------------------------------------- |
| **Admin**    | `admin@example.com`    | `password123` | Full access to all tickets, users, and stats. |
| **Agent**    | `agent@example.com`    | `password123` | Manage tickets, update status, add comments.  |
| **Customer** | `customer@example.com` | `password123` | Create tickets, view own tickets.             |

### Manual User Creation via CLI

You can also create users manually using the command line:

- **Create Admin**:
  ```bash
  npm run create-user admin admin@example.com password123 admin
  ```
- **Create Agent**:
  ```bash
  npm run create-user agent agent@example.com password123 agent
  ```
- **Create Customer**:
  ```bash
  npm run create-user customer customer@example.com password123 customer
  ```

---

## Database Schema

### `users`

| Column       | Type         | Constraints                             | Description           |
| ------------ | ------------ | --------------------------------------- | --------------------- |
| `id`         | SERIAL       | PRIMARY KEY                             | Unique user ID        |
| `username`   | VARCHAR(255) | UNIQUE, NOT NULL                        | User's display name   |
| `email`      | VARCHAR(255) | UNIQUE, NOT NULL                        | User's email address  |
| `password`   | VARCHAR(255) | NOT NULL                                | Hashed password       |
| `role`       | VARCHAR(50)  | CHECK IN ('admin', 'agent', 'customer') | User's role           |
| `created_at` | TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP               | Account creation time |

### `tickets`

| Column             | Type         | Constraints             | Description                                          |
| ------------------ | ------------ | ----------------------- | ---------------------------------------------------- |
| `id`               | SERIAL       | PRIMARY KEY             | Unique ticket ID                                     |
| `title`            | VARCHAR(500) | NOT NULL                | Ticket title                                         |
| `description`      | TEXT         | NOT NULL                | Detailed description                                 |
| `status`           | VARCHAR(50)  | DEFAULT 'open'          | Current status (open, in_progress, resolved, closed) |
| `priority`         | VARCHAR(50)  | DEFAULT 'medium'        | Priority level (low, medium, high, urgent)           |
| `customer_id`      | INTEGER      | NOT NULL, REF users(id) | The customer who owns the ticket                     |
| `agent_id`         | INTEGER      | REF users(id)           | The assigned support agent                           |
| `escalated`        | BOOLEAN      | DEFAULT FALSE           | Whether ticket is escalated                          |
| `escalation_count` | INTEGER      | DEFAULT 0               | Number of times escalated                            |
| `sla_deadline`     | TIMESTAMP    |                         | Deadline for resolution                              |

### `comments`

| Column      | Type    | Constraints               | Description           |
| ----------- | ------- | ------------------------- | --------------------- |
| `id`        | SERIAL  | PRIMARY KEY               | Unique comment ID     |
| `ticket_id` | INTEGER | NOT NULL, REF tickets(id) | Associated ticket     |
| `user_id`   | INTEGER | NOT NULL, REF users(id)   | Author of the comment |
| `content`   | TEXT    | NOT NULL                  | Comment text          |

### `files`

| Column      | Type         | Constraints     | Description       |
| ----------- | ------------ | --------------- | ----------------- |
| `id`        | SERIAL       | PRIMARY KEY     | Unique file ID    |
| `ticket_id` | INTEGER      | REF tickets(id) | Associated ticket |
| `filename`  | VARCHAR(255) | NOT NULL        | Stored filename   |
| `file_path` | VARCHAR(500) | NOT NULL        | Path on disk      |

### Seed Script Summary

When you run `npm run seed`, the following data is automatically populated:

**1. Users**

- **Admin**: `admin:admin@example.com`
- **Agent**: `agent:agent@example.com`
- **Customer**: `customer:customer@example.com`
  _Password for all is `password123`_

**2. Tickets** (Created for `customer@example.com`)

- **Login Issue**: High Priority, Open status.
- **Feature Request**: Low Priority, Open status.

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
