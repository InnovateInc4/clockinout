# MCMS Phase 4 Completion Notes

This document records the final Phase 4 implementation state of the Municipal Clock-In/Out Management System.

## Technology decision

The original project brief listed Java as the prescribed implementation language. The lecturer subsequently confirmed that alternative programming languages were permitted. The final system therefore uses React for the frontend, Node.js/Express for the backend and MySQL for persistence.

## Working features preserved

- JWT authentication and role-based access control.
- Worker, Supervisor, HR Admin, Finance and Admin/Manager access separation.
- Server-verified 50 metre geofencing across authorised work locations.
- Face-profile verification before manual attendance actions.
- Geofence-exit monitoring and automatic clock-out after repeated outside-zone checks.
- Automatic stale-shift closure for review.
- Daily, weekly and monthly attendance reporting and CSV export.
- Hours-worked and absenteeism reporting.
- Leave application workflow with the 30% workforce conflict rule.
- Employee personnel files and document/certification expiry warnings.
- Audit logging.
- Weekly attendance SHA-256 digital signatures and validation.
- Employee leave-decision notifications with persistent read/unread state.

## Offline attendance synchronization

The final system implements an offline-first attendance queue instead of silently failing when connectivity disappears.

When the browser is offline, a manual attendance event is queued only when:

- the employee has previously loaded authorised geofence data while online;
- the current GPS position is inside the cached 50 metre work zone;
- GPS coordinates and accuracy are available;
- face verification has succeeded; and
- the event receives a unique client transaction ID.

The queued event also records the captured timestamp, timezone offset, face-match distance and the most recent trusted server-time reference. The last known duty state is cached locally so an offline refresh does not accidentally turn an active shift into a second clock-in workflow.

When connectivity returns, pending events are sent to `/api/attendance/sync-offline`. The backend:

1. authenticates the employee;
2. checks event ownership and unique transaction ID;
3. validates event type, timestamp age, GPS bounds and GPS accuracy;
4. re-runs the server-side authorised-geofence calculation;
5. prevents duplicate clock-in/clock-out processing;
6. reconciles the event with the employee's active attendance state;
7. records the result in `attendance_offline_events`; and
8. writes successful synchronization to the audit log.

The browser removes events from its local queue only after the server returns a final `Synced`, `Duplicate` or `Rejected` result. Transient server/network errors remain queued for a later retry.

The same cached-geofence monitoring continues while a worker is offline. After three consecutive cached checks outside the authorised zone, an automatic geofence-exit clock-out event is queued for later server verification.

Offline synchronization is intentionally auditable rather than invisible. Relevant statuses include `Offline - Synced`, `Offline - Synced - Time Review` and `Offline - Synced Auto Clock-Out`.

## Trusted time / NTP verification

Online attendance timestamps remain MySQL-authoritative. The backend also runs an external NTP verification service using UDP and, by default, `time.google.com`.

The service periodically compares external NTP time with the database/server clock and stores the verification result in `time_sync_audit`, including drift and round-trip time. `/api/system/time` returns the MySQL time together with the latest NTP verification state.

If the NTP service is unreachable, attendance is not stopped. MySQL time remains authoritative and the failed NTP check is recorded as `ntp_unavailable` for audit purposes.

While online, the worker browser caches the server-time offset. That offset is used as the trusted reference for offline capture. If the trusted-time reference is older than 24 hours when synchronized, the server flags the attendance record for time review rather than pretending that the offline timestamp has the same assurance as a live server timestamp.

## Leave-cycle rollover and South African public holidays

The final leave-balance workflow now:

- automatically creates balances for newly registered employees;
- ensures active employees have the configured current calendar-year leave cycle at backend startup;
- archives the previous balance in `leave_balance_history` when a new calendar year begins;
- resets the configured allocation for the new cycle;
- recalculates approved leave inside the applicable cycle; and
- requires leave spanning two calendar years to be submitted as two requests so each cycle remains auditable.

Working-day calculations exclude Saturdays, Sundays and the standard South African public-holiday calendar, including Good Friday, Family Day and the observed Monday rule when a public holiday falls on a Sunday.

The prototype policy currently uses configured allocations of 21 Annual Leave days, 30 Sick Leave days and 3 Family Responsibility Leave days per configured calendar cycle. Those values are application policy settings for this project and should be adjusted to the organisation's approved HR policy before real deployment.

## Notification and reporting reliability work

The final Phase 4 completion also includes:

- employee notification display using the existing UI;
- unread badge loading when the worker workspace opens;
- mark-one and mark-all notifications as read;
- employee-owned notification read endpoints;
- leave-decision notification failure isolation;
- duplicate leave-decision notification protection when a status is saved repeatedly;
- weekly-report signing permissions aligned with HR/Admin access while Finance remains report-viewing only;
- blocking signatures for empty weekly reports;
- audit logging for successful weekly digital signatures; and
- authenticated trusted-time verification at `/api/system/time`.

## Database files

- `database/phase4_supporting_tables.sql` documents the Phase 4 support tables.
- `database/phase4_completion_upgrade.sql` creates the final offline-attendance, leave-history and time-sync audit tables.
- `database/phase4_verification.sql` contains read-only final verification queries.

The backend also uses `CREATE TABLE IF NOT EXISTS` for the final support tables at startup, allowing a clean Phase 4 environment to self-initialize those support structures.

Do not commit a database dump containing personal employee information to the public repository.

## Automated verification

The repository CI verifies:

- backend JavaScript syntax;
- Phase 4 server helper tests for Easter/public-holiday and leave-cycle calculations;
- frontend tests, including offline geofence/queue utilities; and
- a full optimized React production build.

Manual verification already completed during finalisation also confirmed notification creation/read persistence, database support tables, the existing digitally signed weekly report and geofence auto-clock-out reporting.

## Remaining deployment considerations

The implemented features satisfy the Phase 4 prototype goals, but a real production deployment should still define organisational policies for device trust, leave entitlement rules, NTP/network firewall access, retention periods and administrator provisioning. These are deployment/governance decisions rather than missing prototype features.
