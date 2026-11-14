# Login module (authentication)

Added after the TA's feedback: users must sign up and sign in, and every action is tied to a verified user.
This replaces the old "X-User-Id header" idea in `docs/CONTRACTS.md` (the "Beta authentication" paragraph).

## What it does
- **Sign up** (`POST /api/auth/register`): name, email, password (8 to 128 characters, at least one letter and one number). Signs the user in.
- **Sign in** (`POST /api/auth/login`): returns a session token that lasts 8 hours.
- **Sign out** (`POST /api/auth/logout`): ends the session on the server.
- **Who am I** (`GET /api/auth/me`): the user and their role in every project (`MANAGER` or `MEMBER`).
- **Everything else under `/api` needs a signed-in user.** This is enforced once, in `app.js`, so a router that forgets `requireUserId` is still protected.

## Security choices (for the NFR4 section of the report)
- Passwords are never stored: only a salted `scrypt` hash (Node built-in `crypto`).
- Session tokens are random; only their SHA-256 hash is stored, so a leaked database cannot be used to sign in. Signing out really ends the session.
- Wrong email and wrong password give the same error and take the same time (no account guessing).
- 5 wrong passwords for an email locks sign-in for that email for 10 minutes.
- The user is taken from the session token only. The old `X-User-Id` header is ignored (it is accepted only by the automated tests, through `trustUserIdHeader`).

## Roles
Roles are per project (`project_members.role`). The login module tells the rest of the system WHO is calling; deciding what each role may do is `AccessControlService` (Member D, NFR4).

## For every member
- In a router keep using `router.use(requireUserId)` and read `req.userId`. It is now a verified id.
- Frontend: keep calling `api(path, userId, options)`. The token is added for you.
- Need the user's roles in the UI? `useAuth().user.memberships`.
- Tests: `buildTestContainer()` accepts the `X-User-Id` header, so existing API tests keep working. A missing user now gives **401** (not 400).
- A new account has no projects until a manager adds it to one.

## Demo accounts (beta)
The seeded users keep their ids and names. Their password is `Demo@12345` (emails: `mona@`, `sara@`, `omar@`, `layla@` + `example.com`; a user added to the seed by a teammate gets the same password and appears on the login page too). In development the login page shows buttons that fill the form. The default can be changed with the `demoPassword` config value.

## Files
Backend: `src/auth/*` (new), `src/middleware/currentUser.js` (now checks the session), `src/app.js` (4 lines).
Frontend: `src/api.js`, `src/auth/*`, `src/components/AccountMenu.jsx`, `src/main.jsx`, `src/App.jsx`.
Tests: `tests/auth/*` (21 tests).
