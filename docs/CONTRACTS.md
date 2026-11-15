# Shared contracts

Everyone codes against these. If you must change one, tell the team first.

## Beta authentication
Users sign up and sign in (see docs/AUTH.md). Every route under /api needs a signed-in user. In a router add router.use(requireUserId) (from middleware/currentUser.js) and read req.userId, which is now a verified id. The old X-User-Id header is ignored (only the automated tests accept it).

## Layers (calls go downward only)
`controllers` -> `services` -> `repositories` -> database. Controllers handle HTTP only. Services hold business rules and receive their repositories as arguments (never `require` a repository inside a service). Never use a repository from a controller.

## Adding your code (the pattern every file follows)
1. Write the test first in `backend/tests/`.
2. Repository: `createXRepository(db)` returns an object of functions (SQL lives only here). Add your table to `src/db/schema.js`.
3. Service: `createXService({ deps... })` returns an object of functions.
4. Controller: `createXRouter(container)` returns an Express router.
5. Register them in `src/container.js` (create + return) and `src/app.js` (mount the router).

## Events (Observer pattern, owned by Member E)
Publish an event instead of calling the Notification Service directly:

```js
const events = require('../events/events');
eventPublisher.publish(events.taskAssigned(taskId, assigneeId, actingUserId));
```

| Event | Published by | When |
|---|---|---|
| `events.taskAssigned(taskId, assigneeId, assignedByUserId)` | Member B | after a task is assigned |
| `events.taskStatusChanged(taskId, oldStatus, newStatus, changedByUserId)` | Member C | after a valid transition |
| `events.mentionCreated(taskId, mentionedUserId, mentionedByUserId)` | Member D | once per valid @mention (no duplicates per comment) |
| `events.taskDueSoon(taskId)` | Member E (dueSoonService) | scheduler, task due within 24h |

`eventPublisher` is passed into your service by `container.js`. The task must already be saved (the listener loads it by id).

## Other contracts
| Contract | Owner | Notes |
|---|---|---|
| `userRepository`, `projectRepository`, `projectMemberRepository`, `taskRepository` | B (base provided) | add query functions you need |
| `taskFactory` | B | one place that builds a valid task; Member A reuses it |
| `taskService.createTask / assignTask` | B | publishes the taskAssigned event |
| `taskService.changeStatus` | C | State pattern, status log, publishes taskStatusChanged |
| `accessControlService.requireMember / requireManager` | D | base version allows everything; D makes it real and throws `ForbiddenError` |
| `recurrenceService.generateDue(date)` | A | called daily by `recurrenceJob` |
| Errors | base | throw `NotFoundError` (404), `InvalidRequestError` (400), `ForbiddenError` (403) from `errors/errors.js`; the error middleware turns them into JSON |

## Database
SQLite in memory, tables created from `src/db/schema.js` on start. Dates are stored as ISO-8601 UTC text (`new Date().toISOString()`). Use `runInTransaction(() => { ... })` (passed in by the container) when several changes must succeed or fail together.
