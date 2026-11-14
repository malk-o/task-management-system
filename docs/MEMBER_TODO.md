# Starting points (everyone: write the test first)

## Member A - FR1 Recurring Tasks, NFR1 Reliability (Strategy)
- [ ] `recurrence_rules` table + repository; add `rule_id` and `occurrence_date` to `tasks` in `db/schema.js`
- [ ] `UNIQUE (rule_id, occurrence_date)` constraint (NFR1)
- [ ] Strategy: Daily / Weekly / Monthly implementations in `strategies/`
- [ ] `recurrenceService.generateDue(date)` using the task factory, then `scheduler/recurrenceJob.js`
- [ ] Controller + `frontend/src/pages/RecurringRulesPage.jsx`
- [ ] Paradigms evidence (declarative vs imperative) for the document

## Member B - FR2 Task Creation and Assignment, NFR2 Usability (Factory, Repository)
- [x] `factories/taskFactory.js` (default status TODO) and `taskService.createTask / assignTask`
- [x] Publish `events.taskAssigned(...)` after assigning
- [x] Project controller (create project, add members) and `controllers/taskController.js` (create, assign)
- [x] `frontend/src/pages/ProjectsPage.jsx`: create and assign in 3 steps or fewer
- [x] Extend the seed data if needed; keep the README run section correct

## Member C - FR3 Status Workflow and Reports, NFR3 Auditability (State)
- [ ] `states/` one object per status with allowed transitions
- [ ] `status_log` table (append-only), written in the same transaction as the status change
- [ ] `taskService.changeStatus`, then publish `events.taskStatusChanged(...)`
- [ ] Report service + controller (completion rate, overdue, workload; managers only via accessControlService)
- [ ] `frontend/src/pages/ReportsPage.jsx` and status buttons on the task details page
- [ ] Architecture alignment section of the document

## Member D - FR4 Comments and Mentions, NFR4 Security
- [x] `comments` table + repository, `commentService`, `commentController`
- [x] Detect valid @mentions of project members; publish `events.mentionCreated(...)` once per mentioned user
- [x] Make `security/accessControlService.js` real (member of project? manager?) and throw `ForbiddenError`
- [x] Call it from controllers (tell the others): the services of B and C already call it; reportService now checks the project exists before the manager check, so an unknown project still returns 404
- [x] Comments UI on `TaskDetailsPage.jsx`
- [x] SOLID evidence section of the document

## Member E - done in the base
FR5 Notifications and NFR5 are implemented with tests (`notificationService`, `dueSoonService`, `dueSoonCheckJob`, `notificationController`, `NotificationsPage.jsx`). Remaining: integration, demo script, submission.
