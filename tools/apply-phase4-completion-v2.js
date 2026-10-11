const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');

const backup = (file) => {
  const backupFile = `${file}.phase4_backup`;
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(file, backupFile);
  }
};

const replaceFirstIfPresent = (text, oldText, newText, label) => {
  const index = text.indexOf(oldText);
  if (index === -1) {
    console.log(`SKIP: ${label} (already changed or anchor not present)`);
    return text;
  }
  console.log(`APPLY: ${label}`);
  return text.slice(0, index) + newText + text.slice(index + oldText.length);
};

const patchServer = () => {
  const file = path.join(ROOT, 'server', 'server.js');
  backup(file);
  let text = read(file);

  const notificationsRoutePos = text.indexOf("'/api/employee/notifications'");
  const leaveSectionMarker = '// ------------------------------------------------------\n// 4. Get Leave Requests';
  const leaveSectionPos = notificationsRoutePos >= 0
    ? text.indexOf(leaveSectionMarker, notificationsRoutePos)
    : -1;

  if (notificationsRoutePos < 0 || leaveSectionPos < 0) {
    throw new Error('Could not safely locate the employee notifications section. No server changes were written.');
  }

  // Limit notification history to the newest 50 rows, but only inside the notification route.
  const notificationsSegment = text.slice(notificationsRoutePos, leaveSectionPos);
  if (!notificationsSegment.includes('LIMIT 50')) {
    const updatedSegment = notificationsSegment.replace(
      'ORDER BY created_at DESC\n          `',
      'ORDER BY created_at DESC\n          LIMIT 50\n          `'
    );

    if (updatedSegment !== notificationsSegment) {
      text = text.slice(0, notificationsRoutePos) + updatedSegment + text.slice(leaveSectionPos);
      console.log('APPLY: notification list limit');
    } else {
      console.log('SKIP: notification list limit (safe anchor not found)');
    }
  }

  // Add employee-owned read endpoints immediately before the leave-management section.
  if (!text.includes("'/api/employee/notifications/:id/read'")) {
    const insertPos = text.indexOf(leaveSectionMarker, text.indexOf("'/api/employee/notifications'"));

    if (insertPos < 0) {
      throw new Error('Could not safely locate the notification route insertion point.');
    }

    const readRoutes = `// ======================================================\n// EMPLOYEE - MARK ALL OWN NOTIFICATIONS AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/read-all',\n  requireAuth,\n  async (req, res) => {\n\n    try {\n\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE user_id = ?\n          AND is_read = 0\n        \`,\n        [req.user.userId]\n      );\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notifications marked as read.',\n        updated: result.affectedRows\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Mark-all notifications error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notifications.',\n        details: err.sqlMessage || err.message\n      });\n\n    }\n\n  }\n);\n\n// ======================================================\n// EMPLOYEE - MARK OWN NOTIFICATION AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/:id/read',\n  requireAuth,\n  async (req, res) => {\n\n    const notificationId = Number(req.params.id);\n\n    if (!Number.isInteger(notificationId) || notificationId <= 0) {\n      return res.status(400).json({\n        success: 0,\n        message: 'Invalid notification ID.'\n      });\n    }\n\n    try {\n\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE id = ?\n          AND user_id = ?\n        \`,\n        [notificationId, req.user.userId]\n      );\n\n      if (result.affectedRows === 0) {\n        return res.status(404).json({\n          success: 0,\n          message: 'Notification not found.'\n        });\n      }\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notification marked as read.'\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Notification read update error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notification.',\n        details: err.sqlMessage || err.message\n      });\n\n    }\n\n  }\n);\n\n`;

    text = text.slice(0, insertPos) + readRoutes + text.slice(insertPos);
    console.log('APPLY: employee notification read endpoints');
  }

  // Keep report signing aligned with the visible Reports UI: HR/Admin sign, Finance views.
  text = replaceFirstIfPresent(
    text,
    "app.post(\n  '/api/management/attendance-weekly/sign',\n  requireSupervisorAccess,",
    "app.post(\n  '/api/management/attendance-weekly/sign',\n  requireHRAccess,",
    'weekly signature RBAC'
  );

  // Expose authoritative MySQL time for verification/demo purposes.
  if (!text.includes("'/api/system/time'")) {
    const marker = '// ======================================================\n// START SERVER\n// ======================================================';
    const markerPos = text.indexOf(marker);

    if (markerPos >= 0) {
      const timeRoute = `// ======================================================\n// SYSTEM - AUTHORITATIVE DATABASE TIME\n// ======================================================\n\napp.get(\n  '/api/system/time',\n  requireAuth,\n  async (req, res) => {\n\n    try {\n\n      const [rows] = await db.query(\n        'SELECT NOW(3) AS server_time'\n      );\n\n      return res.status(200).json({\n        success: 1,\n        server_time: rows[0].server_time,\n        source: 'MySQL server time'\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Server time error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to retrieve authoritative server time.'\n      });\n\n    }\n\n  }\n);\n\n\n`;

      text = text.slice(0, markerPos) + timeRoute + text.slice(markerPos);
      console.log('APPLY: authoritative server-time endpoint');
    } else {
      console.log('SKIP: server-time endpoint (safe anchor not found)');
    }
  }

  write(file, text);
};

const patchClockInOut = () => {
  const file = path.join(ROOT, 'src', 'components', 'ClockInOut.js');
  backup(file);
  let text = read(file);

  // Mark-one / mark-all notification helpers.
  if (!text.includes('const markEmployeeNotificationRead = async')) {
    const marker = '// ======================================================\n// LOAD EMPLOYEE LEAVE BALANCES\n// ======================================================';
    const markerPos = text.indexOf(marker);

    if (markerPos < 0) {
      throw new Error('Could not safely locate the employee notification helper insertion point.');
    }

    const helpers = `// ======================================================\n// MARK EMPLOYEE NOTIFICATIONS AS READ\n// ======================================================\n\nconst markEmployeeNotificationRead = async (notificationId) => {\n\n    try {\n\n        await axios.put(\n            \`/api/employee/notifications/\${notificationId}/read\`,\n            {},\n            props.config\n        );\n\n        setEmployeeNotifications(\n            (currentNotifications) =>\n                currentNotifications.map(\n                    (notification) =>\n                        notification.id === notificationId\n                            ? { ...notification, is_read: 1 }\n                            : notification\n                )\n        );\n\n    } catch (err) {\n\n        console.error(\n            '❌ Error marking notification as read:',\n            err.response?.data || err.message\n        );\n\n        props.showAlert(\n            'Unable to mark the notification as read.',\n            'danger'\n        );\n\n    }\n\n};\n\nconst markAllEmployeeNotificationsRead = async () => {\n\n    try {\n\n        await axios.put(\n            '/api/employee/notifications/read-all',\n            {},\n            props.config\n        );\n\n        setEmployeeNotifications(\n            (currentNotifications) =>\n                currentNotifications.map(\n                    (notification) => ({\n                        ...notification,\n                        is_read: 1\n                    })\n                )\n        );\n\n    } catch (err) {\n\n        console.error(\n            '❌ Error marking notifications as read:',\n            err.response?.data || err.message\n        );\n\n        props.showAlert(\n            'Unable to mark notifications as read.',\n            'danger'\n        );\n\n    }\n\n};\n\n`;

    text = text.slice(0, markerPos) + helpers + text.slice(markerPos);
    console.log('APPLY: notification read helpers');
  }

  // Load notifications as the employee workspace opens so the unread badge is correct.
  if (!text.includes('Load notifications once so the unread badge is accurate.')) {
    const oldText = '        // Always load attendance history and current duty state\n        populateFields();\n\n        if (props.getTickets) {';
    const newText = '        // Always load attendance history and current duty state\n        populateFields();\n\n        // Load notifications once so the unread badge is accurate.\n        loadEmployeeNotifications();\n\n        if (props.getTickets) {';
    text = replaceFirstIfPresent(text, oldText, newText, 'initial notification load');
  }

  // Do not pretend an offline attendance action was queued or recorded.
  if (!text.includes('Attendance was NOT recorded')) {
    const oldText = `        props.showAlert(\n            err.response?.data?.message ||\n            err.message ||\n            "Attendance database error.",\n            "danger"\n        );`;
    const newText = `        const networkFailure = !err.response;\n\n        props.showAlert(\n            networkFailure\n                ? "You appear to be offline. Attendance was NOT recorded. Reconnect and try again so the geofence and official system time can be verified."\n                : err.response?.data?.message ||\n                  err.message ||\n                  "Attendance database error.",\n            networkFailure ? "warning" : "danger"\n        );`;
    text = replaceFirstIfPresent(text, oldText, newText, 'offline attendance safety message');
  }

  // Complete the Notifications workspace without changing the existing visual theme.
  if (!text.includes('EMPLOYEE NOTIFICATIONS WORKSPACE')) {
    const marker = '    {/* GPS VERIFICATION BAR */}';
    const markerPos = text.indexOf(marker);

    if (markerPos < 0) {
      throw new Error('Could not safely locate the Notifications UI insertion point.');
    }

    const panel = `{/* ======================================================\n    EMPLOYEE NOTIFICATIONS WORKSPACE\n====================================================== */}\n\n{activeEmployeeSection === "notifications" && (\n\n    <div\n        className="glass-card"\n        style={{\n            background: 'rgba(255,255,255,0.9)',\n            backdropFilter: 'blur(16px)',\n            borderRadius: '24px',\n            padding: '32px',\n            marginBottom: '24px',\n            border: '1px solid #e2e8f0',\n            boxShadow: '0 8px 30px rgba(15,23,42,0.06)'\n        }}\n    >\n        <div\n            style={{\n                display: 'flex',\n                justifyContent: 'space-between',\n                alignItems: 'flex-start',\n                gap: '16px',\n                flexWrap: 'wrap',\n                marginBottom: '24px'\n            }}\n        >\n            <div>\n                <div\n                    style={{\n                        fontSize: '0.75rem',\n                        fontWeight: '900',\n                        color: '#047857',\n                        textTransform: 'uppercase',\n                        letterSpacing: '0.7px',\n                        marginBottom: '6px'\n                    }}\n                >\n                    Employee Alerts\n                </div>\n\n                <h2\n                    style={{\n                        margin: 0,\n                        color: '#0f172a',\n                        fontSize: '1.6rem'\n                    }}\n                >\n                    🔔 My Notifications\n                </h2>\n            </div>\n\n            {employeeNotifications.some(\n                (notification) => Number(notification.is_read) === 0\n            ) && (\n                <button\n                    type="button"\n                    onClick={markAllEmployeeNotificationsRead}\n                    style={{\n                        padding: '10px 15px',\n                        borderRadius: '11px',\n                        border: '1px solid #a7f3d0',\n                        background: '#ecfdf5',\n                        color: '#047857',\n                        fontWeight: '900',\n                        cursor: 'pointer'\n                    }}\n                >\n                    Mark all as read\n                </button>\n            )}\n        </div>\n\n        {notificationsLoading ? (\n            <div style={{ padding: '20px', color: '#64748b' }}>\n                Loading notifications...\n            </div>\n        ) : employeeNotifications.length === 0 ? (\n            <div\n                style={{\n                    padding: '22px',\n                    backgroundColor: '#f8fafc',\n                    borderRadius: '14px',\n                    color: '#64748b',\n                    border: '1px solid #e2e8f0'\n                }}\n            >\n                You have no notifications.\n            </div>\n        ) : (\n            employeeNotifications.map((notification) => (\n                <div\n                    key={notification.id}\n                    style={{\n                        padding: '18px',\n                        marginBottom: '12px',\n                        borderRadius: '16px',\n                        backgroundColor:\n                            Number(notification.is_read) === 0\n                                ? '#ecfdf5'\n                                : '#ffffff',\n                        border:\n                            Number(notification.is_read) === 0\n                                ? '1px solid #6ee7b7'\n                                : '1px solid #e2e8f0'\n                    }}\n                >\n                    <div\n                        style={{\n                            display: 'flex',\n                            justifyContent: 'space-between',\n                            alignItems: 'flex-start',\n                            gap: '15px'\n                        }}\n                    >\n                        <div style={{ flex: 1 }}>\n                            <div\n                                style={{\n                                    fontWeight: '900',\n                                    color: '#0f172a',\n                                    fontSize: '1rem'\n                                }}\n                            >\n                                {notification.title}\n                            </div>\n\n                            <div\n                                style={{\n                                    marginTop: '8px',\n                                    color: '#475569',\n                                    fontSize: '0.9rem',\n                                    lineHeight: '1.5'\n                                }}\n                            >\n                                {notification.message}\n                            </div>\n                        </div>\n\n                        {Number(notification.is_read) === 0 && (\n                            <span\n                                style={{\n                                    backgroundColor: '#047857',\n                                    color: '#ffffff',\n                                    padding: '5px 10px',\n                                    borderRadius: '999px',\n                                    fontSize: '0.7rem',\n                                    fontWeight: '900'\n                                }}\n                            >\n                                NEW\n                            </span>\n                        )}\n                    </div>\n\n                    <div\n                        style={{\n                            display: 'flex',\n                            justifyContent: 'space-between',\n                            alignItems: 'center',\n                            gap: '12px',\n                            flexWrap: 'wrap',\n                            marginTop: '14px'\n                        }}\n                    >\n                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>\n                            {notification.created_at\n                                ? new Date(notification.created_at).toLocaleString()\n                                : ''}\n                        </div>\n\n                        {Number(notification.is_read) === 0 && (\n                            <button\n                                type="button"\n                                onClick={() =>\n                                    markEmployeeNotificationRead(notification.id)\n                                }\n                                style={{\n                                    padding: '8px 12px',\n                                    borderRadius: '10px',\n                                    border: '1px solid #a7f3d0',\n                                    background: '#ffffff',\n                                    color: '#047857',\n                                    fontWeight: '900',\n                                    cursor: 'pointer',\n                                    fontSize: '0.78rem'\n                                }}\n                            >\n                                Mark as read\n                            </button>\n                        )}\n                    </div>\n                </div>\n            ))\n        )}\n    </div>\n\n)}\n\n`;

    text = text.slice(0, markerPos) + panel + text.slice(markerPos);
    console.log('APPLY: employee Notifications workspace');
  }

  write(file, text);
};

const patchManagementView = () => {
  const file = path.join(ROOT, 'src', 'components', 'ManagementView.js');
  backup(file);
  let text = read(file);

  text = replaceFirstIfPresent(
    text,
    '{(isFullManagement || isHRAdmin || isSupervisor) && (',
    '{(isFullManagement || isHRAdmin) && (',
    'weekly sign button RBAC'
  );

  write(file, text);
};

try {
  console.log('Creating safety backups and applying guarded Phase 4 changes (v2)...');
  patchServer();
  patchClockInOut();
  patchManagementView();
  console.log('Phase 4 completion patch v2 applied successfully.');
  console.log('Existing .phase4_backup files were preserved and were not overwritten.');
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
