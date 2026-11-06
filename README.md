# Task & Project Management System

Software Construction and Testing, Winter 2026 (GIU). Team kiwi.

A layered monolith: **React** frontend, **Node.js (Express)** backend, **SQLite** database (built into Node).

```
frontend/   React (Vite) UI
backend/    Express API
  src/
    controllers/  HTTP only (routes, status codes)
    services/     business rules
    repositories/ SQL / data access
    db/           schema, seed data
    domain/ events/ strategies/ states/ factories/ scheduler/ security/ errors/ middleware/
    container.js  the one place where objects are created and connected
  tests/      unit, integration, api
docs/         CONTRACTS.md (shared interfaces) and MEMBER_TODO.md
```

## Requirements
- Node 22.13 or newer (the team uses 24). Nothing else: no Java, no Maven, no database to install.

## Run
Open two terminals.

Backend (http://localhost:8080):
```
cd backend
npm install
npm start
```
Frontend (http://localhost:5173):
```
cd frontend
npm install
npm run dev
```
The beta uses an in-memory SQLite database seeded with demo data (`backend/src/db/seed.js`): a manager (user 1, Mona) and three members (users 2 to 4). Pick the user from the dropdown in the top bar. A task due in 23 hours is seeded, so a due-soon notification for Sara appears as soon as the backend starts.

Data resets every time the backend restarts. To keep data, start it with `DB_PATH=tasks.db`.

## Test
```
cd backend
npm test
```
Tests use Node's built-in test runner (`node:test`); there is nothing extra to install.

## Team workflow
- `main` is protected. Never push to it directly.
- One branch per task: `feature/<letter>-<topic>` (example: `feature/b-create-task`).
- Write the test first, then the code. Open a pull request; one other member reviews; CI must be green before merging.
- Only edit your own files. If you need a change in a shared file (task repository, schema), tell the owner or keep the change tiny.
- Pull `main` into your branch often.

## Who owns what
| Member | Requirement | Pattern |
|---|---|---|
| A | FR1 Recurring Tasks, NFR1 Reliability | Strategy |
| B | FR2 Task Creation and Assignment, NFR2 Usability | Factory, Repository |
| C | FR3 Status Workflow and Reports, NFR3 Auditability | State |
| D | FR4 Comments and Mentions, NFR4 Security | - |
| E | FR5 Notifications, NFR5 Performance, base project | Observer |

See `docs/CONTRACTS.md` for how the pieces connect and `docs/MEMBER_TODO.md` for each member's starting point.
