# MCMS Phase 4 Completion Notes

This document records the final Phase 4 implementation state of the Municipal Clock-In/Out Management System.

## Working features preserved

- JWT authentication and role-based access control.
- Worker, Supervisor, HR Admin, Finance and Admin/Manager access separation.
- Server-verified 50 metre geofencing across authorised work locations.
- Face-profile verification before attendance actions.
- Geofence-exit monitoring and automatic clock-out after repeated outside-zone checks.
- Automatic stale-shift closure for review.
- Daily, weekly and monthly attendance reporting and CSV export.
- Hours-worked and absenteeism reporting.
- Leave application workflow with the 30% workforce conflict rule.
- Leave balances and weekday deductions.
- Employee personnel files and document/certification expiry warnings.
- Audit logging.
- Weekly attendance SHA-256 digital signatures and validation.
- Employee leave-decision notifications with persistent read/unread state.
- Authenticated MySQL server-time verification endpoint.

## Final reliability work

The final Phase 4 completion added or hardened:

- employee notification display using the existing glass-card UI;
- unread badge loading when the worker workspace opens;
- mark-one and mark-all notifications as read;
- employee-owned notification read endpoints;
- leave-decision notification failure isolation so a notification problem does not falsely report an already-saved leave decision as failed;
- weekly-report signing permissions aligned with HR/Admin access while Finance remains report-viewing only;
- blocking of signatures for empty weekly reports;
- audit logging for successful weekly digital signatures;
- authenticated database/server time verification at `/api/system/time`;
- a clear integrity-safe message when attendance cannot reach the server.

## Offline attendance decision

The system deliberately does **not** create attendance records while fully offline. A fully offline browser cannot ask the server to verify the 50 metre geofence or obtain authoritative database time. Queuing an unverifiable clock event could weaken attendance integrity and create duplicate or disputed records.

The final behaviour therefore tells the employee that attendance was not recorded and requires reconnection before retrying.

This is an integrity-safe offline failure mode, not a claim of full offline synchronization.

## Time source

Official attendance timestamps use MySQL/server time. The authenticated `/api/system/time` endpoint exposes the database clock for verification. The project does not claim a dedicated external NTP implementation.

## Database files

- `database/phase4_supporting_tables.sql` documents the Phase 4 support tables.
- `database/phase4_verification.sql` contains read-only final verification queries.

Do not commit a production/student database dump containing personal employee information to the public repository.

## Final verification completed

- Backend syntax check passed with `node --check server/server.js`.
- React production build completed successfully (warnings only).
- MySQL verification queries completed successfully.
- Worker leave-decision notifications were tested end-to-end.
- Notification read state persisted after refresh.
- Weekly signed attendance report remained valid after the final changes.
- Geofence auto-clock-out status remained visible in reporting.

See `FINAL_AUDIT.md` for the consolidated audit record and known limitations.

## Important assessment disclosure

The current implementation is React + Node/Express + MySQL. If the assessment requires Java as a prescribed implementation language, that requirement remains a compliance issue that must be disclosed accurately to the lecturer/supervisor. The project documentation must not describe the Node backend as Java.
