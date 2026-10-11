-- MCMS Phase 4 supporting tables
-- Reproducible schema documentation for the final project.

USE municipal_db;

CREATE TABLE IF NOT EXISTS notifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_report_signatures (
    id INT NOT NULL AUTO_INCREMENT,
    report_type VARCHAR(30) NOT NULL DEFAULT 'weekly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    signed_by INT NOT NULL,
    signer_name VARCHAR(200) NOT NULL,
    signer_role VARCHAR(50) NOT NULL,
    record_count INT NOT NULL DEFAULT 0,
    report_hash CHAR(64) NOT NULL,
    signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_report_signature (report_type, start_date, end_date),
    CONSTRAINT fk_attendance_signature_user
        FOREIGN KEY (signed_by) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS leave_balances (
    id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    allocated_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(6,2) NOT NULL DEFAULT 0,
    cycle_start DATE NULL,
    cycle_end DATE NULL,
    PRIMARY KEY (id),
    UNIQUE KEY unique_employee_leave_cycle (employee_id, leave_type, cycle_start, cycle_end),
    CONSTRAINT fk_leave_balance_employee
        FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
);
