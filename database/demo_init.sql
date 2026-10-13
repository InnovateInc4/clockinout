-- =============================================================
-- MCMS PORTABLE DEMO DATABASE
-- =============================================================
-- Purpose:
--   Creates a clean, self-contained demonstration database for the
--   GitHub/Docker version of the Municipal Clock-In/Out Management
--   System. It contains ONLY synthetic demo data.
--
-- IMPORTANT:
--   Do not replace this file with a dump of the live/student database.
--   The repository is public and real employee/personal information
--   must not be committed.
-- =============================================================

USE municipal_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS time_sync_audit;
DROP TABLE IF EXISTS attendance_offline_events;
DROP TABLE IF EXISTS leave_balance_history;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS attendance_report_signatures;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS suggestions;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------
-- Departments
-- -------------------------------------------------------------
CREATE TABLE departments (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Positions
-- -------------------------------------------------------------
CREATE TABLE positions (
    id INT NOT NULL AUTO_INCREMENT,
    department_id INT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_positions_department (department_id),
    CONSTRAINT fk_position_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Users / Employees
-- -------------------------------------------------------------
CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    surname VARCHAR(150) NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    idNumber VARCHAR(50) NULL,
    phone VARCHAR(50) NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    department VARCHAR(150) NOT NULL DEFAULT 'General',
    department_id INT NULL,
    position VARCHAR(150) NULL,
    position_id INT NULL,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'Active',
    account_status VARCHAR(50) NOT NULL DEFAULT 'Active',
    faceReferenceImage LONGTEXT NULL,
    profile_photo LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_user_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_department (department_id),
    INDEX idx_users_position (position_id),
    CONSTRAINT fk_user_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_user_position
        FOREIGN KEY (position_id) REFERENCES positions(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Attendance
-- -------------------------------------------------------------
CREATE TABLE attendance (
    id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    clock_in DATETIME NULL,
    clock_out DATETIME NULL,
    clock_in_latitude DECIMAL(10,8) NULL,
    clock_in_longitude DECIMAL(11,8) NULL,
    clock_out_latitude DECIMAL(10,8) NULL,
    clock_out_longitude DECIMAL(11,8) NULL,
    location_status VARCHAR(150) NOT NULL DEFAULT 'Not Verified',
    sync_status VARCHAR(100) NOT NULL DEFAULT 'Online',
    total_hours DECIMAL(7,2) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_attendance_employee_clock (employee_id, clock_in),
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Leave requests
-- -------------------------------------------------------------
CREATE TABLE leave_requests (
    id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    employee VARCHAR(255) NULL,
    type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_leave_employee_status (employee_id, status),
    CONSTRAINT fk_leave_employee
        FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Work tickets (kept for compatibility with project scope)
-- -------------------------------------------------------------
CREATE TABLE tickets (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    department_id INT NULL,
    description TEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_tickets_department (department_id),
    CONSTRAINT fk_ticket_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Suggestions / staff feedback
-- -------------------------------------------------------------
CREATE TABLE suggestions (
    id INT NOT NULL AUTO_INCREMENT,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Employee documents
-- -------------------------------------------------------------
CREATE TABLE documents (
    id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    document_type VARCHAR(150) NOT NULL,
    file_path LONGTEXT NULL,
    expiry_date DATE NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_documents_employee (employee_id),
    CONSTRAINT fk_document_employee
        FOREIGN KEY (employee_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Audit log
-- -------------------------------------------------------------
CREATE TABLE audit_logs (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(150) NOT NULL,
    details TEXT NULL,
    ip_address VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_audit_user_created (user_id, created_at),
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Notifications
-- -------------------------------------------------------------
CREATE TABLE notifications (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Weekly attendance report signatures
-- -------------------------------------------------------------
CREATE TABLE attendance_report_signatures (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Leave balances
-- -------------------------------------------------------------
CREATE TABLE leave_balances (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leave_balance_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Offline attendance reconciliation
-- -------------------------------------------------------------
CREATE TABLE attendance_offline_events (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Trusted-time/NTP audit
-- -------------------------------------------------------------
CREATE TABLE time_sync_audit (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- SYNTHETIC DEMO DATA
-- =============================================================

INSERT INTO departments (id, name, description) VALUES
    (1, 'Administration', 'General administration and management'),
    (2, 'Human Resources', 'Employee and personnel management'),
    (3, 'Finance', 'Financial administration and reporting'),
    (4, 'Infrastructure', 'Municipal infrastructure and field services');

INSERT INTO positions (id, department_id, title, description) VALUES
    (1, 1, 'Administrator', 'System and municipal administration'),
    (2, 1, 'Manager', 'Management oversight'),
    (3, 4, 'Supervisor', 'Field workforce supervision'),
    (4, 2, 'HR Administrator', 'Human resources administration'),
    (5, 3, 'Finance Officer', 'Finance and attendance reporting'),
    (6, 4, 'General Worker', 'Municipal field worker');

-- All demo accounts use the password: Demo1234!
-- This bcrypt value is intentionally only for the local demonstration dataset.
SET @demo_password = '$2b$12$VU29ZkEgWmaECDPAC5a4Y.kFHUn7VEjyUpjDrajddto3ga1cyYABO';

INSERT INTO users (
    id, name, surname, email, password, idNumber, phone, role,
    department, department_id, position, position_id,
    employment_status, account_status
) VALUES
    (1, 'Demo', 'Admin', 'admin.demo@ncpg.gov.za', @demo_password, '9001015000001', '0710000001', 'admin', 'Administration', 1, 'Administrator', 1, 'Active', 'Active'),
    (2, 'Demo', 'Manager', 'manager.demo@ncpg.gov.za', @demo_password, '9001015000002', '0710000002', 'manager', 'Administration', 1, 'Manager', 2, 'Active', 'Active'),
    (3, 'Demo', 'Supervisor', 'supervisor.demo@ncpg.gov.za', @demo_password, '9001015000003', '0710000003', 'supervisor', 'Infrastructure', 4, 'Supervisor', 3, 'Active', 'Active'),
    (4, 'Demo', 'HR', 'hr.demo@ncpg.gov.za', @demo_password, '9001015000004', '0710000004', 'hr_admin', 'Human Resources', 2, 'HR Administrator', 4, 'Active', 'Active'),
    (5, 'Demo', 'Finance', 'finance.demo@ncpg.gov.za', @demo_password, '9001015000005', '0710000005', 'finance', 'Finance', 3, 'Finance Officer', 5, 'Active', 'Active'),
    (6, 'Demo', 'Worker', 'worker.demo@ncpg.gov.za', @demo_password, '9001015000006', '0710000006', 'employee', 'Infrastructure', 4, 'General Worker', 6, 'Active', 'Active'),
    (7, 'Demo', 'WorkerTwo', 'worker2.demo@ncpg.gov.za', @demo_password, '9001015000007', '0710000007', 'employee', 'Infrastructure', 4, 'General Worker', 6, 'Active', 'Active');

-- A completed shift for Worker and a current active shift for WorkerTwo.
INSERT INTO attendance (
    employee_id, clock_in, clock_out,
    clock_in_latitude, clock_in_longitude,
    clock_out_latitude, clock_out_longitude,
    location_status, sync_status, total_hours
) VALUES
    (
        6,
        DATE_SUB(NOW(), INTERVAL 1 DAY),
        DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 8 HOUR),
        -28.748350, 24.763800,
        -28.748350, 24.763800,
        'Sol Plaatje University Central Campus - Verified',
        'Online',
        8.00
    ),
    (
        7,
        DATE_SUB(NOW(), INTERVAL 2 HOUR),
        NULL,
        -28.748350, 24.763800,
        NULL, NULL,
        'Sol Plaatje University Central Campus - Verified',
        'Online',
        NULL
    );

INSERT INTO leave_requests (
    id, employee_id, employee, type, start_date, end_date, reason, status
) VALUES
    (
        1,
        6,
        'Demo Worker',
        'Annual Leave',
        CURDATE(),
        DATE_ADD(CURDATE(), INTERVAL 1 DAY),
        'Synthetic approved leave request for demonstration',
        'Approved'
    );

SET @cycle_start = STR_TO_DATE(CONCAT(YEAR(CURDATE()), '-01-01'), '%Y-%m-%d');
SET @cycle_end = STR_TO_DATE(CONCAT(YEAR(CURDATE()), '-12-31'), '%Y-%m-%d');

INSERT INTO leave_balances (
    employee_id, leave_type, allocated_days, used_days, remaining_days, cycle_start, cycle_end
) VALUES
    (6, 'Annual Leave', 21, 2, 19, @cycle_start, @cycle_end),
    (6, 'Sick Leave', 30, 0, 30, @cycle_start, @cycle_end),
    (6, 'Family Responsibility Leave', 3, 0, 3, @cycle_start, @cycle_end);

INSERT INTO notifications (
    user_id, notification_type, title, message, is_read
) VALUES
    (6, 'leave', 'Annual Leave Approved', 'Your demonstration Annual Leave request has been approved.', 0),
    (6, 'general', 'Welcome to MCMS', 'This is a synthetic demonstration account created by the portable setup.', 0);

INSERT INTO suggestions (message) VALUES
    ('Synthetic demo feedback: the dashboard is easy to follow.');

INSERT INTO tickets (title, department_id, description, status) VALUES
    ('Water Line Inspection - Demo', 4, 'Synthetic demonstration work ticket.', 'Active'),
    ('Road Maintenance Check - Demo', 4, 'Synthetic demonstration work ticket.', 'Active');

INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES
    (1, 'DEMO_DATABASE_INITIALISED', 'Portable demonstration database initialised with synthetic records.', '127.0.0.1');

-- The backend will automatically ensure current leave balances for all
-- other active demo users when it starts.
