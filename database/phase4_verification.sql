-- MCMS Phase 4 read-only verification queries
-- This script does not delete or update application data.

USE municipal_db;

SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS attendance_count FROM attendance;
SELECT COUNT(*) AS leave_request_count FROM leave_requests;
SELECT COUNT(*) AS notification_count FROM notifications;
SELECT COUNT(*) AS leave_balance_count FROM leave_balances;
SELECT COUNT(*) AS weekly_signature_count FROM attendance_report_signatures;
SELECT COUNT(*) AS leave_balance_history_count FROM leave_balance_history;
SELECT COUNT(*) AS offline_attendance_event_count FROM attendance_offline_events;
SELECT COUNT(*) AS time_sync_audit_count FROM time_sync_audit;

-- Current employee leave cycles
SELECT
    employee_id,
    leave_type,
    allocated_days,
    used_days,
    remaining_days,
    cycle_start,
    cycle_end
FROM leave_balances
ORDER BY employee_id, leave_type;

-- Archived rollover history
SELECT
    employee_id,
    leave_type,
    allocated_days,
    used_days,
    remaining_days,
    cycle_start,
    cycle_end,
    archived_at
FROM leave_balance_history
ORDER BY archived_at DESC
LIMIT 20;

-- Latest offline synchronization/reconciliation evidence
SELECT
    id,
    client_event_id,
    employee_id,
    event_type,
    captured_at,
    latitude,
    longitude,
    accuracy_meters,
    geofence_location_id,
    geofence_distance_meters,
    sync_status,
    rejection_reason,
    attendance_id,
    received_at,
    processed_at
FROM attendance_offline_events
ORDER BY id DESC
LIMIT 20;

-- Latest NTP/database clock checks
SELECT
    id,
    ntp_server,
    ntp_time,
    database_time,
    drift_ms,
    round_trip_ms,
    status,
    error_message,
    checked_at
FROM time_sync_audit
ORDER BY id DESC
LIMIT 20;

-- Employee notifications
SELECT
    id,
    user_id,
    notification_type,
    title,
    message,
    is_read,
    created_at
FROM notifications
ORDER BY id DESC
LIMIT 20;

-- Digitally signed weekly attendance reports
SELECT
    id,
    report_type,
    start_date,
    end_date,
    signer_name,
    signer_role,
    record_count,
    signed_at
FROM attendance_report_signatures
ORDER BY id DESC
LIMIT 20;
