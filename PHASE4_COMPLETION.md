# MCMS Phase 4 completion notes

This branch is intentionally isolated from `main`. The last known working system remains protected on `main` at the backup commit `9c62a6c9e4e3dd4d6744cf292c70e3a3abb419f4`.

## Working features preserved

- JWT authentication and role-based access control.
- Worker, Supervisor, HR Admin, Finance and Admin/Manager access separation.
- Server-verified 50 metre geofencing across authorised work locations.
- Face-profile verification before attendance actions.
- Geofence-exit monitoring and automatic clock-out after repeated outside-zone checks.
- Automatic stale-shift closure for review.
- Daily, weekly and monthly attendance reporting and CSV export.
- Finance-safe absenteeism report.
- Leave application workflow with the 30% workforce conflict rule.
- Leave balances and weekday deductions.
- Employee personnel files and document/certification expiry warnings.
- Audit logging.
- Weekly attendance SHA-256 digital signatures and validation.
- Employee leave-decision notifications.

## Final guarded completion patch

`tools/apply_phase4_completion.py` is an idempotent, anchor-checked patcher. It creates `.phase4_backup` copies before changing the three large source files and aborts instead of guessing if an expected code anchor has changed.

It completes the remaining low-risk Phase 4 work without redesigning the existing UI:

- employee notification display using the existing glass-card UI;
- unread badge loaded when the workspace opens;
- mark-one and mark-all notifications as read;
- employee-owned notification read endpoints;
- prevents duplicate leave notifications when a leave status has not actually changed;
- prevents a notification-delivery error from falsely reporting an already-saved leave decision as failed;
- aligns weekly-report signing with HR/Admin permissions while Finance remains report-viewing only;
- blocks signing of an empty weekly report;
- adds an audit entry for a successful weekly digital signature;
- exposes authenticated MySQL server time at `/api/system/time` for verification;
- gives a clear integrity-safe message when attendance cannot reach the server.

## Offline attendance decision

The system deliberately does **not** create attendance records while fully offline. A fully offline browser cannot ask the server to verify the 50 metre geofence or obtain authoritative database time. Queuing an unverifiable clock event would weaken the attendance controls and could create duplicates. The final behaviour therefore tells the employee that attendance was not recorded and requires reconnection before retrying.

This is an integrity-safe offline failure mode, not a claim of full offline synchronization.

## Time source

Official attendance timestamps use MySQL `NOW()` on the server side. `/api/system/time` exposes the same database clock for verification. The project does not claim that a dedicated external NTP service is implemented.

## Database files

- `database/phase4_supporting_tables.sql` documents the supporting Phase 4 tables.
- `database/phase4_verification.sql` contains read-only final verification queries.

Do not blindly rerun table creation against a populated database if the tables already exist; verify the existing schema first.

## Final acceptance test order

1. Backend starts without a syntax/database error.
2. React compiles successfully.
3. Worker can log in and cannot access Management.
4. Worker clock-in/out still requires geofence and face verification.
5. Geofence-exit automatic clock-out still works.
6. Worker submits leave; Supervisor/HR processes it.
7. Worker sees the resulting notification, unread badge and mark-read controls.
8. Approved leave changes the employee leave balance correctly.
9. HR can view document expiry information.
10. Finance can view reports but cannot digitally sign them.
11. HR/Admin can digitally sign a non-empty weekly report and the signature remains valid on reload.
12. Audit Logs show the report-sign action.
13. Run `database/phase4_verification.sql`.
14. Create a fresh MySQL backup after final testing.

## Important assessment disclosure

The current working implementation is React + Node/Express + MySQL. If the assessment requires Java as a prescribed implementation language, that requirement must be discussed transparently with the lecturer/supervisor. This project documentation must not describe the Node backend as Java.
