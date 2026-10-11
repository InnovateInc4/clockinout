from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


def backup(path):
    backup_path = path.with_suffix(path.suffix + ".phase4_backup")
    if not backup_path.exists():
        shutil.copy2(path, backup_path)
    return backup_path


def patch_server():
    path = ROOT / "server" / "server.js"
    backup(path)
    text = path.read_text(encoding="utf-8")

    # Keep notification history bounded.
    old = """          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          `,"""
    new = """          FROM notifications
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 50
          `,"""
    if old in text:
        text = replace_once(text, old, new, "notification list limit")

    # Employee-owned notification read endpoints.
    if "'/api/employee/notifications/:id/read'" not in text:
        anchor = """  }
);

// ------------------------------------------------------
// 4. Get Leave Requests"""
        addition = """  }
);

// ======================================================
// EMPLOYEE - MARK ALL OWN NOTIFICATIONS AS READ
// ======================================================

app.put(
  '/api/employee/notifications/read-all',
  requireAuth,
  async (req, res) => {

    try {

      const [result] = await db.query(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
          AND is_read = 0
        `,
        [req.user.userId]
      );

      return res.status(200).json({
        success: 1,
        message: 'Notifications marked as read.',
        updated: result.affectedRows
      });

    } catch (err) {

      console.error(
        '❌ Mark-all notifications error:',
        err
      );

      return res.status(500).json({
        success: 0,
        message: 'Unable to update notifications.',
        details: err.sqlMessage || err.message
      });

    }

  }
);

// ======================================================
// EMPLOYEE - MARK OWN NOTIFICATION AS READ
// ======================================================

app.put(
  '/api/employee/notifications/:id/read',
  requireAuth,
  async (req, res) => {

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: 0,
        message: 'Invalid notification ID.'
      });
    }

    try {

      const [result] = await db.query(
        `
        UPDATE notifications
        SET is_read = 1
        WHERE id = ?
          AND user_id = ?
        `,
        [notificationId, req.user.userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: 0,
          message: 'Notification not found.'
        });
      }

      return res.status(200).json({
        success: 1,
        message: 'Notification marked as read.'
      });

    } catch (err) {

      console.error(
        '❌ Notification read update error:',
        err
      );

      return res.status(500).json({
        success: 0,
        message: 'Unable to update notification.',
        details: err.sqlMessage || err.message
      });

    }

  }
);

// ------------------------------------------------------
// 4. Get Leave Requests"""
        text = replace_once(text, anchor, addition, "notification read routes")

    # Leave status must remain successful if only notification delivery fails,
    # and repeated processing of an already-equal status should not duplicate alerts.
    old = """await db.query(
  `
  INSERT INTO notifications (
    user_id,
    notification_type,
    title,
    message,
    is_read
  )
  VALUES (?, ?, ?, ?, 0)
  `,
  [
    leaveRequest.employee_id,
    'leave',
    notificationTitle,
    notificationMessage
  ]
);"""
    if old in text:
        new = """const leaveStatusChanged =
  String(leaveRequest.status || '')
    .trim()
    .toLowerCase() !==
  finalStatus.toLowerCase();

if (leaveStatusChanged) {

  try {

    await db.query(
      `
      INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        is_read
      )
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        leaveRequest.employee_id,
        'leave',
        notificationTitle,
        notificationMessage
      ]
    );

  } catch (notificationError) {

    // The leave status has already been stored. A notification
    // failure must not falsely report the leave decision as failed.
    console.error(
      '❌ Leave notification error:',
      notificationError
    );

  }

}"""
        text = replace_once(text, old, new, "leave notification hardening")

    # Weekly reports are visible to Finance, but signing is an HR/Admin action.
    old = """app.post(
  '/api/management/attendance-weekly/sign',
  requireSupervisorAccess,"""
    new = """app.post(
  '/api/management/attendance-weekly/sign',
  requireHRAccess,"""
    if old in text:
        text = replace_once(text, old, new, "weekly signature RBAC")

    # Do not digitally sign an empty weekly report.
    if "There are no attendance records in this weekly report to sign." not in text:
        route_pos = text.find("'/api/management/attendance-weekly/sign'")
        if route_pos < 0:
            raise RuntimeError("weekly signature route not found")
        marker = """      // --------------------------------------------------
      // CREATE REPORT HASH
      // --------------------------------------------------"""
        marker_pos = text.find(marker, route_pos)
        if marker_pos < 0:
            raise RuntimeError("weekly signature hash marker not found")
        guard = """      if (attendance.length === 0) {

        return res.status(400).json({
          success: 0,
          message:
            'There are no attendance records in this weekly report to sign.'
        });

      }


"""
        text = text[:marker_pos] + guard + text[marker_pos:]

    # Audit successful report signatures.
    if "'WEEKLY_ATTENDANCE_REPORT_SIGNED'" not in text:
        route_pos = text.find("'/api/management/attendance-weekly/sign'")
        return_marker = """      return res.status(201).json({"""
        return_pos = text.find(return_marker, route_pos)
        if return_pos < 0:
            raise RuntimeError("weekly signature success response not found")
        audit = """      await writeAuditLog(
        req.user.userId,
        'WEEKLY_ATTENDANCE_REPORT_SIGNED',
        `Weekly attendance report ${start} to ${end} digitally signed. Signature ID: ${result.insertId}. Records: ${attendance.length}.`,
        req.ip
      );


"""
        text = text[:return_pos] + audit + text[return_pos:]

    # Expose the same authoritative database clock used by attendance NOW().
    if "'/api/system/time'" not in text:
        marker = """// ======================================================
// START SERVER
// ======================================================"""
        route = """// ======================================================
// SYSTEM - AUTHORITATIVE DATABASE TIME
// ======================================================

app.get(
  '/api/system/time',
  requireAuth,
  async (req, res) => {

    try {

      const [rows] = await db.query(
        'SELECT NOW(3) AS server_time'
      );

      return res.status(200).json({
        success: 1,
        server_time: rows[0].server_time,
        source: 'MySQL server time'
      });

    } catch (err) {

      console.error(
        '❌ Server time error:',
        err
      );

      return res.status(500).json({
        success: 0,
        message: 'Unable to retrieve authoritative server time.'
      });

    }

  }
);


"""
        text = replace_once(text, marker, route + marker, "server-time route")

    path.write_text(text, encoding="utf-8")


def patch_clock_in_out():
    path = ROOT / "src" / "components" / "ClockInOut.js"
    backup(path)
    text = path.read_text(encoding="utf-8")

    if "const markEmployeeNotificationRead = async" not in text:
        marker = """// ======================================================
// LOAD EMPLOYEE LEAVE BALANCES
// ======================================================"""
        helpers = """// ======================================================
// MARK EMPLOYEE NOTIFICATIONS AS READ
// ======================================================

const markEmployeeNotificationRead = async (notificationId) => {

    try {

        await axios.put(
            `/api/employee/notifications/${notificationId}/read`,
            {},
            props.config
        );

        setEmployeeNotifications(
            (currentNotifications) =>
                currentNotifications.map(
                    (notification) =>
                        notification.id === notificationId
                            ? { ...notification, is_read: 1 }
                            : notification
                )
        );

    } catch (err) {

        console.error(
            "❌ Error marking notification as read:",
            err.response?.data || err.message
        );

    }

};

const markAllEmployeeNotificationsRead = async () => {

    try {

        await axios.put(
            "/api/employee/notifications/read-all",
            {},
            props.config
        );

        setEmployeeNotifications(
            (currentNotifications) =>
                currentNotifications.map(
                    (notification) => ({
                        ...notification,
                        is_read: 1
                    })
                )
        );

    } catch (err) {

        console.error(
            "❌ Error marking notifications as read:",
            err.response?.data || err.message
        );

    }

};

"""
        text = replace_once(text, marker, helpers + marker, "notification helpers")

    # Make the unread badge accurate before the tab is first clicked.
    old = """        // Always load attendance history and current duty state
        populateFields();

        if (props.getTickets) {"""
    new = """        // Always load attendance history and current duty state
        populateFields();

        // Load notifications once so the unread badge is accurate.
        loadEmployeeNotifications();

        if (props.getTickets) {"""
    if old in text:
        text = replace_once(text, old, new, "initial notification load")

    # Integrity-safe offline behaviour: do not fabricate unverifiable attendance.
    old = """        props.showAlert(
            err.response?.data?.message ||
            err.message ||
            "Attendance database error.",
            "danger"
        );"""
    if old in text:
        new = """        const networkFailure = !err.response;

        props.showAlert(
            networkFailure
                ? "You appear to be offline. Attendance was NOT recorded. Reconnect to the network and try again so the geofence and official system time can be verified."
                : err.response?.data?.message ||
                  err.message ||
                  "Attendance database error.",
            networkFailure ? "warning" : "danger"
        );"""
        text = replace_once(text, old, new, "offline attendance message")

    # Notification workspace using the existing visual language.
    if "EMPLOYEE NOTIFICATIONS WORKSPACE" not in text:
        marker = """    {/* GPS VERIFICATION BAR */}"""
        panel = """{/* ======================================================
    EMPLOYEE NOTIFICATIONS WORKSPACE
====================================================== */}

{activeEmployeeSection === "notifications" && (

    <div
        className="glass-card"
        style={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            padding: '32px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(15,23,42,0.06)'
        }}
    >

        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '24px'
            }}
        >

            <div>
                <div
                    style={{
                        fontSize: '0.75rem',
                        fontWeight: '900',
                        color: '#047857',
                        textTransform: 'uppercase',
                        letterSpacing: '0.7px',
                        marginBottom: '6px'
                    }}
                >
                    Employee Alerts
                </div>

                <h2
                    style={{
                        margin: 0,
                        color: '#0f172a',
                        fontSize: '1.6rem'
                    }}
                >
                    🔔 My Notifications
                </h2>
            </div>

            {employeeNotifications.some(
                (notification) =>
                    Number(notification.is_read) === 0
            ) && (
                <button
                    type="button"
                    onClick={markAllEmployeeNotificationsRead}
                    style={{
                        padding: '10px 15px',
                        borderRadius: '11px',
                        border: '1px solid #a7f3d0',
                        background: '#ecfdf5',
                        color: '#047857',
                        fontWeight: '900',
                        cursor: 'pointer'
                    }}
                >
                    Mark all as read
                </button>
            )}
        </div>

        {notificationsLoading ? (
            <div style={{ padding: '20px', color: '#64748b' }}>
                Loading notifications...
            </div>
        ) : employeeNotifications.length === 0 ? (
            <div
                style={{
                    padding: '22px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '14px',
                    color: '#64748b',
                    border: '1px solid #e2e8f0'
                }}
            >
                You have no notifications.
            </div>
        ) : (
            employeeNotifications.map((notification) => (
                <div
                    key={notification.id}
                    style={{
                        padding: '18px',
                        marginBottom: '12px',
                        borderRadius: '16px',
                        backgroundColor:
                            Number(notification.is_read) === 0
                                ? '#ecfdf5'
                                : '#ffffff',
                        border:
                            Number(notification.is_read) === 0
                                ? '1px solid #6ee7b7'
                                : '1px solid #e2e8f0'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: '15px'
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: '900',
                                    color: '#0f172a',
                                    fontSize: '1rem'
                                }}
                            >
                                {notification.title}
                            </div>

                            <div
                                style={{
                                    marginTop: '8px',
                                    color: '#475569',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5'
                                }}
                            >
                                {notification.message}
                            </div>
                        </div>

                        {Number(notification.is_read) === 0 && (
                            <span
                                style={{
                                    backgroundColor: '#047857',
                                    color: '#ffffff',
                                    padding: '5px 10px',
                                    borderRadius: '999px',
                                    fontSize: '0.7rem',
                                    fontWeight: '900'
                                }}
                            >
                                NEW
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap',
                            marginTop: '14px'
                        }}
                    >
                        <div
                            style={{
                                color: '#94a3b8',
                                fontSize: '0.75rem'
                            }}
                        >
                            {notification.created_at
                                ? new Date(notification.created_at).toLocaleString()
                                : ''}
                        </div>

                        {Number(notification.is_read) === 0 && (
                            <button
                                type="button"
                                onClick={() =>
                                    markEmployeeNotificationRead(notification.id)
                                }
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #a7f3d0',
                                    background: '#ffffff',
                                    color: '#047857',
                                    fontWeight: '900',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem'
                                }}
                            >
                                Mark as read
                            </button>
                        )}
                    </div>
                </div>
            ))
        )}

    </div>

)}

"""
        text = replace_once(text, marker, panel + marker, "notification workspace")

    path.write_text(text, encoding="utf-8")


def patch_management_view():
    path = ROOT / "src" / "components" / "ManagementView.js"
    backup(path)
    text = path.read_text(encoding="utf-8")

    # Reports can be viewed by Finance, but only HR/Admin should sign.
    old = """{(isFullManagement || isHRAdmin || isSupervisor) && ("""
    new = """{(isFullManagement || isHRAdmin) && ("""
    if old in text:
        text = replace_once(text, old, new, "weekly sign button RBAC")

    path.write_text(text, encoding="utf-8")


def main():
    print("Creating safety backups and applying guarded Phase 4 changes...")
    patch_server()
    patch_clock_in_out()
    patch_management_view()
    print("Phase 4 completion patch applied successfully.")
    print("Backups were kept beside each modified source file with .phase4_backup suffix.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
