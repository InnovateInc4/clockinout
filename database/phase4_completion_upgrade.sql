-- MCMS final Phase 4 upgrade
-- Adds audit/support tables for leave-cycle rollover,
-- offline attendance synchronization and NTP verification.

USE municipal_db;

CREATE TABLE IF NOT EXISTS leave_balance_history (
    id INT NOT NULL AUTO_INCREMENT,
    source_balance_id INT NULL,
    employee_id INT NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    allocated_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    cycle_start DATE NOT NULL,
    cycle_end DATE NOT NULL,
    archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_archived_leave_cycle (
        employee_id,
        leave_type,
        cycle_start,
        cycle_end
    ),
    INDEX idx_leave_history_employee (employee_id, leave_type)
);

CREATE TABLE IF NOT EXISTS attendance_offline_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    client_event_id VARCHAR(100) NOT NULL,
    employee_id INT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    captured_at DATETIME(3) NOT NULL,
    captured_at_epoch_ms BIGINT NOT NULL,
    timezone_offset_minutes INT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy_meters DECIMAL(8,2) NULL,
    face_verified TINYINT(1) NOT NULL DEFAULT 0,
    face_match_distance DECIMAL(8,5) NULL,
    trusted_time_verified_at DATETIME(3) NULL,
    trusted_time_age_ms BIGINT NULL,
    geofence_location_id VARCHAR(100) NULL,
    geofence_distance_meters DECIMAL(10,2) NULL,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    rejection_reason VARCHAR(255) NULL,
    attendance_id INT NULL,
    received_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at TIMESTAMP(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_offline_client_event (client_event_id),
    INDEX idx_offline_employee_status (employee_id, sync_status),
    INDEX idx_offline_captured_at (captured_at)
);

CREATE TABLE IF NOT EXISTS time_sync_audit (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ntp_server VARCHAR(150) NOT NULL,
    ntp_time DATETIME(3) NULL,
    database_time DATETIME(3) NOT NULL,
    drift_ms BIGINT NULL,
    round_trip_ms INT NULL,
    status VARCHAR(40) NOT NULL,
    error_message VARCHAR(255) NULL,
    checked_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_time_sync_checked (checked_at),
    INDEX idx_time_sync_status (status)
);

-- Verification queries
SELECT COUNT(*) AS leave_balance_history_count
FROM leave_balance_history;

SELECT COUNT(*) AS offline_attendance_event_count
FROM attendance_offline_events;

SELECT COUNT(*) AS time_sync_audit_count
FROM time_sync_audit;
