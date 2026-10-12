# Municipal Clock-In/Out Management System (MCMS)

A municipal/provincial employee attendance and workforce management prototype built with React, Node.js/Express and MySQL.

## Core features

- JWT authentication with role-based access control.
- Worker, Supervisor, HR Admin, Finance, Admin and legacy Manager access separation.
- Employee attendance clock-in/clock-out.
- Server-side 50 metre geofence verification.
- Face-profile verification before attendance actions.
- Automatic clock-out after repeated verified geofence exits.
- Automatic stale-shift closure for review.
- Daily, weekly, monthly, hours-worked and absenteeism reporting.
- CSV attendance exports.
- Leave application, approval/denial workflow and the 30% workforce conflict rule.
- Employee leave balances.
- Employee document/certification records with expiry warnings.
- Audit logs.
- Weekly attendance SHA-256 digital report signatures.
- Employee leave-decision notifications with persistent read/unread state.
- Authoritative server/database time endpoint for verification.

## Technology stack

- Frontend: React 19 / Create React App
- Backend: Node.js + Express
- Database: MySQL (`mysql2/promise`)
- Authentication: JSON Web Tokens + bcrypt
- Face verification: `@vladmandic/face-api`

## Local setup

1. Install Node.js and MySQL.
2. Clone this repository.
3. Run `npm install` in the repository root.
4. Create a local `.env` file using `.env.example` as a guide.
5. Ensure the `municipal_db` database exists and contains the project schema.
6. Start the backend with `npm run server`.
7. In a second terminal start the React frontend with `npm start`.
8. Open `http://localhost:3000`.

Environment files are ignored by Git and must never be committed.

## Useful commands

```bash
npm start
npm run server
npm run check:backend
npm run test:ci
npm run build
```

## Database support files

- `database/phase4_supporting_tables.sql` documents the additional Phase 4 support tables.
- `database/phase4_verification.sql` contains read-only verification queries.

A database dump containing real employee information should not be committed to a public repository. Keep assessment backups separately and securely.

## Final Phase 4 status

The final branch includes the tested Phase 4 notification, digital-signature, geofence, leave-balance, reporting, RBAC and reliability work. See `PHASE4_COMPLETION.md` and `FINAL_AUDIT.md` for the verification record and known limitations.

## Important assessment note

The current implementation is React + Node/Express + MySQL. If the assessment specification requires Java as the prescribed implementation language, this must be disclosed accurately in the final report/presentation rather than describing the Node backend as Java.
