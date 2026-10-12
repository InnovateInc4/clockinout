# MCMS Final Phase 4 Audit

Audit date: 12 October 2026

## Executive result

The final Phase 4 codebase preserves the working attendance/management features and now includes the three previously documented gaps: offline attendance synchronization, external NTP clock verification, and automatic leave-cycle/public-holiday handling.

The project is implemented with React + Node.js/Express + MySQL. Although the original brief listed Java, the lecturer subsequently confirmed that alternative programming languages were permitted, so the chosen stack is not treated as a compliance gap.

## Verification completed

Verified during finalisation:

- `server/server.js` and `server/phase4Enhancements.js` pass Node syntax checks.
- Phase 4 Node tests pass for Easter calculation, South African public holidays, working-day calculation and calendar leave-cycle rollover.
- Frontend tests pass, including offline geofence caching and queue de-duplication.
- React optimized production build completes successfully.
- MySQL verification queries completed successfully against `municipal_db` before the final enhancement branch.
- Worker leave-decision notification was tested end-to-end.
- Notification read state persisted after refresh.
- Weekly attendance report retained the existing `Digitally Signed` state.
- `Auto Clock-Out - Left Geofence` remained visible in reporting.
- The complete offline/NTP/leave-lifecycle enhancement branch passed the guarded CI workflow before source changes were committed.
- Additional offline continuity/geofence-exit polish also passed backend syntax, Phase 4 server tests, frontend tests and production build before commit.

## Final functional coverage

### Authentication and access control

- JWT session authentication.
- bcrypt password hashing and migration support for legacy plaintext records.
- Per-account password verification; the earlier repository-wide shared login password gate has been removed.
- Public registration creates a normal employee account and enforces a minimum password length.
- Active employment/account status enforcement.
- Worker, Supervisor, HR Admin, Finance, Admin and Manager role handling.
- Backend role middleware protects management routes.
- Worker management-route protection remains in place.

### Attendance

- Clock-in and clock-out stored in MySQL.
- MySQL-authoritative online timestamps.
- 50 metre server-side geofence validation.
- Multiple authorised work locations.
- Face-profile verification in the worker attendance workflow.
- Geofence-exit monitoring with automatic clock-out after repeated outside-zone checks.
- Stale active shifts automatically closed for review.
- Attendance history and duty-state restoration.
- Offline queue with local duty-state continuity.
- Automatic synchronization after connectivity returns.
- Server-side offline event re-validation, duplicate protection and reconciliation.
- GPS accuracy captured and validated.
- Offline automatic geofence-exit event support.
- Final sync/rejection evidence stored in `attendance_offline_events` and audit logs.

### Trusted time

- MySQL/server time remains the official timestamp source for live attendance.
- Periodic external NTP verification is implemented using UDP.
- Configurable NTP server, timeout and refresh interval.
- Database/NTP drift and request round-trip recorded in `time_sync_audit`.
- Authenticated `/api/system/time` reports MySQL time and latest NTP verification state.
- NTP outage falls back safely to MySQL time and is auditable.
- Offline browser capture uses the last cached server-time offset.
- Offline events synchronized with a trusted-time reference older than 24 hours are flagged for time review.

### Leave management

- Worker leave application.
- Supervisor/HR approval and denial workflow.
- 30% workforce conflict rule.
- Automatic leave-balance initialization for new employees.
- Automatic current-cycle checks for active employees on backend startup.
- Calendar-year rollover with previous-cycle archive in `leave_balance_history`.
- Leave balance recalculation from approved requests in the applicable cycle.
- Weekend exclusion.
- Standard South African public-holiday exclusion, including Good Friday, Family Day and Sunday-observed Monday handling.
- Cross-calendar-year leave requests must be split so the correct cycle is charged.
- Employee leave history.
- Leave-decision notifications and read/unread persistence.
- Duplicate notification protection when a saved leave decision does not actually change.

### Personnel and compliance

- Employee profile/personnel management.
- Employment and account status controls.
- Document/certification records.
- Expiry-date warnings.
- HR-oriented document permissions.
- Audit logging for key management, attendance, digital-signature and offline-sync actions.

### Reporting

- Daily attendance report.
- Weekly attendance report.
- Monthly attendance report.
- Hours-worked report.
- Absenteeism report.
- CSV exports.
- Geofence/auto-clock-out statuses preserved in reports and CSV logic.
- SHA-256 weekly attendance report hash/signature.
- Saved signature validation on report reload.
- Empty weekly report signing blocked.
- Successful signature action in audit logs.
- Finance report access separated from HR/Admin signing permissions.

## Final support tables

Phase 4 uses the existing support tables plus:

- `notifications`
- `leave_balances`
- `attendance_report_signatures`
- `leave_balance_history`
- `attendance_offline_events`
- `time_sync_audit`

Reference/migration/verification SQL is stored under `database/`.

## Offline integrity design

The official attendance table is not written directly by an offline browser. The client queues an event and the server later decides whether that event can become official attendance.

Server checks include employee authentication, event ownership, event age, GPS bounds, GPS accuracy, the current configured geofences, duplicate event IDs and attendance-state reconciliation. Rejected events are retained server-side with a rejection reason rather than being silently discarded.

The offline client uses cached geofence/time data from an earlier online session. This gives the system genuine offline-first behaviour while still making the later server reconciliation explicit and auditable.

## Repository/security review

- `.env` and local environment files are ignored by Git.
- `.env.example` documents database, NTP and offline-sync configuration without real secrets.
- Old unused `server/config.js` and `server/database.js` development files are no longer present in the active final branch; the runtime database connection is `server/db.js`.
- A live MySQL dump containing employee data must not be committed to this public repository.
- Offline client storage is appropriate for this academic prototype, but a production deployment should use stronger managed-device/device-attestation controls if offline attendance has payroll/legal consequences.

## Known deployment considerations (not missing Phase 4 features)

1. The configured leave allocations/cycle model are project HR policy settings and must be aligned with the employer's approved policy before production deployment.
2. Standard South African public holidays are calculated automatically; exceptional one-off holidays declared for a specific year should be added to the organisational calendar if applicable.
3. Some corporate networks block outbound UDP/123. In that case the application records NTP unavailability and safely continues with MySQL-authoritative time.
4. Offline attendance depends on an earlier online session to cache authorised geofences and a trusted time reference. This is intentional; the system will not invent trusted configuration on a never-connected device.
5. The Create React App dependency tree reports upstream package audit/deprecation warnings. The tested application build succeeds; a future production modernization should migrate the frontend build tooling rather than using forced dependency upgrades immediately before assessment.

## Final submission recommendation

After the final enhancement branch is merged and MySQL receives `database/phase4_completion_upgrade.sql`, use `main` as the code submission source. Create a fresh database backup after the migration and keep that backup, along with the presentation/demo recording, outside the public GitHub repository unless the assessment platform explicitly requires it.
