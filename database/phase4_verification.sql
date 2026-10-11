-- MCMS Phase 4 read-only verification queries
-- This script does not delete or update application data.

USE municipal_db;

SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS attendance_count FROM attendance;
SELECT COUNT(*) AS leave_request_count FROM leave_requests;
SELECT COUNT(*) AS notification_count FROM notifications;
SELECT COUNT(*) AS leave_balance_count FROM leave_balances;
SELECT COUNT(*) AS weekly_signature_count FROM attendance_report_signatures;

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
