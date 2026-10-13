# Municipal Clock-In/Out Management System (MCMS)

A municipal/provincial employee attendance and workforce-management system built with React, Node.js/Express and MySQL.

## Fastest way to run the complete project

For assessment, demonstrations and group members, use the portable Docker setup.

1. Install Docker Desktop once.
2. Download or clone this repository.
3. Make sure Docker Desktop is running.
4. Double-click **`START_DEMO.bat`**.
5. The browser opens automatically at **http://localhost:3000**.

This starts the React frontend, Express backend, MySQL database and synthetic demonstration data automatically. No manual SQL import, `.env` creation, MySQL Workbench setup or `npm install` is required on the host machine.

See **`START_HERE.md`** for demo accounts, reset instructions and database-access details.

## Final Phase 4 feature set

- JWT authentication with bcrypt password hashing and role-based access control.
- Worker, Supervisor, HR Admin, Finance, Admin and Manager access separation.
- Employee clock-in/clock-out using MySQL-authoritative timestamps.
- Server-side 50 metre geofence verification across authorised locations.
- Face-profile verification before manual attendance actions.
- Automatic clock-out after repeated geofence-exit checks.
- Automatic stale-shift closure for review.
- Offline-first attendance queue with automatic reconnect synchronization, duplicate protection, server-side geofence re-validation, GPS-accuracy checks and audit logging.
- External NTP verification of server/database clock drift, with safe MySQL-time fallback if NTP is unavailable.
- Daily, weekly, monthly, hours-worked and absenteeism reporting.
- CSV attendance exports.
- Leave application, approval/denial workflow and the 30% workforce conflict rule.
- Automatic calendar-year leave-cycle creation/rollover and history archiving.
- South African weekends and public holidays excluded from leave working-day calculations.
- Employee document/certification records with expiry warnings.
- Audit logs.
- Weekly attendance SHA-256 digital report signatures.
- Employee leave-decision notifications with persistent read/unread state.

## Technology stack

- Frontend: React 19 / Create React App
- Backend: Node.js + Express
- Database: MySQL (`mysql2/promise`)
- Authentication: JSON Web Tokens + bcrypt
- Face verification: `@vladmandic/face-api`
- Trusted time: MySQL server time with periodic external NTP drift verification
- Offline persistence: browser localStorage queue + server-side reconciliation/audit tables

The original project brief listed Java. The lecturer subsequently confirmed that alternative implementation languages were permitted, so the final implementation uses React, Node.js/Express and MySQL.

## Demo database and privacy

`database/demo_init.sql` creates the complete portable demonstration schema and uses synthetic demo users/data only.

The live development database is intentionally not committed. The public repository must not contain real employee personal information, biometric/profile images, private contact details or real password hashes.

The seeded worker accounts therefore do not contain a real face reference. To demonstrate face verification with a real person, register a new employee inside the local disposable demo database.

## Original development setup

The original non-Docker development workflow is still available:

1. Install Node.js and MySQL.
2. Clone this repository.
3. Run `npm install` in the repository root.
4. Create a local `.env` file using `.env.example` as a guide.
5. Ensure the `municipal_db` database exists and contains the project schema.
6. Run `database/phase4_completion_upgrade.sql` once for the final Phase 4 support tables, or allow the backend to create the same support tables on startup.
7. Start the backend with `npm run server`.
8. In a second terminal start the React frontend with `npm start`.
9. Open `http://localhost:3000`.

Environment files are ignored by Git and must never be committed.

## Useful commands

```bash
npm start
npm run server
npm run check:backend
npm run test:phase4-server
npm run test:ci
npm run build
npm run verify:phase4
```

## Database support files

- `database/demo_init.sql` creates a clean synthetic portable-demo database.
- `database/phase4_supporting_tables.sql` documents the Phase 4 support tables.
- `database/phase4_completion_upgrade.sql` adds the final offline-sync, leave-history and time-sync audit tables.
- `database/phase4_verification.sql` contains read-only final verification queries.

## Offline attendance integrity model

Offline attendance is not inserted directly into the official attendance table. The browser queues the event with GPS coordinates, GPS accuracy, face-verification result, a unique event ID and the latest trusted-time reference. When connectivity returns, the backend re-validates the event, checks the 50 metre geofence, prevents duplicate processing and records the reconciliation in `attendance_offline_events` and the audit log.

If the cached trusted-time reference is more than 24 hours old, the event can be synchronized but is flagged for time review. Events outside the configured synchronization window or failing server verification are rejected rather than silently accepted.

## Time integrity

Official online attendance continues to use MySQL/server time. The backend periodically queries an external NTP server and records the measured drift in `time_sync_audit`. If NTP is temporarily unavailable, attendance continues using MySQL time and the failed verification is auditable.

## Leave lifecycle

The configured prototype leave policy automatically creates/rolls over calendar-year balances, archives the previous cycle in `leave_balance_history`, initializes balances for newly registered employees and excludes weekends plus standard South African public holidays from working-day deductions. Leave requests crossing two calendar years must be submitted separately so each cycle remains auditable.

See `PHASE4_COMPLETION.md` and `FINAL_AUDIT.md` for implementation and verification details.
