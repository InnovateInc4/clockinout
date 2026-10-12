# MCMS Final Phase 4 Audit

Audit date: 12 October 2026

## Verification completed

The final Phase 4 branch was reviewed against the current repository structure and the features implemented during Phase 4.

Verified during finalisation:

- `server/server.js` passed `node --check` locally with no syntax errors.
- React production build completed successfully. The remaining output was warnings only (unused variables, one hook-dependency warning, bundle-size notice and stale Browserslist data).
- MySQL verification queries completed successfully against `municipal_db`.
- The notifications table returned live data.
- The weekly report signature table returned the existing signed report for 2026-10-05 through 2026-10-11.
- Worker leave decision notification was tested end-to-end.
- Notification read state was tested and persisted after refresh.
- Weekly attendance report loaded after the final changes and retained the existing `Digitally Signed` state.
- The existing `Auto Clock-Out - Left Geofence` reporting status remained visible in the weekly report.

## Final functional coverage

### Authentication and access control

- JWT session authentication.
- bcrypt password hashing and migration support for legacy plaintext records.
- Active employment/account status enforcement.
- Worker, Supervisor, HR Admin, Finance, Admin and Manager role handling.
- Backend role middleware protects management routes.
- Worker management-route protection remains in place.

### Attendance

- Clock-in and clock-out stored in MySQL.
- Server-authoritative timestamps using MySQL time.
- 50 metre server-side geofence validation.
- Multiple authorised work-location support.
- Face-profile verification in the worker attendance workflow.
- Geofence exit monitoring with automatic clock-out after repeated outside-zone checks.
- Stale active shifts automatically closed for review.
- Attendance history and duty-state restoration.

### Leave management

- Worker leave application.
- Supervisor/HR approval and denial workflow.
- 30% workforce conflict rule.
- Leave balance calculation and deduction.
- Employee leave history.
- Leave-decision notifications.
- Notification read/unread persistence.

### Personnel and compliance

- Employee profile/personnel management.
- Employment and account status controls.
- Document/certification records.
- Expiry-date warnings.
- HR-oriented document permissions.
- Audit logging for key management and attendance events.

### Reporting

- Daily attendance report.
- Weekly attendance report.
- Monthly attendance report.
- Hours-worked report.
- Absenteeism report.
- CSV exports.
- Geofence auto-clock-out status preserved in reports and CSV logic.
- SHA-256 weekly attendance report hash/signature.
- Saved signature validation on report reload.
- Empty weekly report signing blocked.
- Successful signature action added to audit logs.
- Finance report access separated from report-signing permissions.

## Database supporting tables

The final database verification includes the Phase 4 support tables:

- `notifications`
- `leave_balances`
- `attendance_report_signatures`

Reference SQL is stored under `database/`.

## Reliability decisions

### Offline attendance

The final build deliberately does not create an official attendance event while the browser cannot reach the server. A fully offline event cannot be independently checked against the server geofence or authoritative database time. The user is told to reconnect and retry rather than silently creating an unverifiable record.

This is an integrity-safe offline failure mode; it is not full offline synchronization.

### Time source

Official attendance timestamps use server/database time (`NOW()` / MySQL server time). The project does not claim a dedicated external NTP implementation.

## Repository/security review

- `.env` files are ignored by Git.
- `.env.example` documents the required local settings without real secrets.
- The final repository should not contain a live MySQL database dump with employee data.
- The current prototype authentication code contains a fixed additional password-policy gate in `server/server.js`. It is functional for the existing demonstration accounts but should be replaced with an environment-managed or per-user policy before any production deployment.
- Legacy source/config files remain in the repository from earlier development iterations. They are not part of the active `server/server.js` runtime path and should not be presented as the production architecture.

## Known limitations / assessment disclosures

1. The application is implemented with React + Node/Express + MySQL. If the assessment explicitly requires Java as the prescribed implementation language, this remains a compliance gap and must be disclosed accurately to the supervisor/lecturer.
2. Full offline attendance synchronization is not implemented; offline attendance fails safely instead.
3. A dedicated external NTP service is not implemented; the system relies on MySQL/server time.
4. Leave balance cycle rollover and automatic allocation for future calendar cycles are prototype limitations.
5. Public holidays are not automatically excluded from leave-day calculations.
6. The frontend production build currently emits non-blocking lint/bundle warnings; the build itself succeeds.

## Final submission recommendation

Use the final `main` branch as the code submission source after merge. Keep the final MySQL backup and presentation/demo recording outside the public GitHub repository unless the assessment submission platform specifically requires them.
