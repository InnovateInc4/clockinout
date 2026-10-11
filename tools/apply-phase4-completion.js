const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');

const replaceOnce = (text, oldText, newText, label) => {
  const first = text.indexOf(oldText);
  const last = text.lastIndexOf(oldText);

  if (first === -1 || first !== last) {
    throw new Error(`${label}: expected exactly one anchor.`);
  }

  return text.slice(0, first) + newText + text.slice(first + oldText.length);
};

const backup = (file) => {
  const backupFile = `${file}.phase4_backup`;

  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(file, backupFile);
  }
};

const patchServer = () => {
  const file = path.join(ROOT, 'server', 'server.js');
  backup(file);
  let text = read(file);

  const notificationQueryOld = `          FROM notifications\n          WHERE user_id = ?\n          ORDER BY created_at DESC\n          \`,`;
  const notificationQueryNew = `          FROM notifications\n          WHERE user_id = ?\n          ORDER BY created_at DESC\n          LIMIT 50\n          \`,`;

  if (text.includes(notificationQueryOld)) {
    text = replaceOnce(
      text,
      notificationQueryOld,
      notificationQueryNew,
      'notification list limit'
    );
  }

  if (!text.includes("'/api/employee/notifications/:id/read'")) {
    const anchor = `  }\n);\n\n// ------------------------------------------------------\n// 4. Get Leave Requests`;

    const routes = `  }\n);\n\n// ======================================================\n// EMPLOYEE - MARK ALL OWN NOTIFICATIONS AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/read-all',\n  requireAuth,\n  async (req, res) => {\n\n    try {\n\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE user_id = ?\n          AND is_read = 0\n        \`,\n        [req.user.userId]\n      );\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notifications marked as read.',\n        updated: result.affectedRows\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Mark-all notifications error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notifications.',\n        details: err.sqlMessage || err.message\n      });\n\n    }\n\n  }\n);\n\n// ======================================================\n// EMPLOYEE - MARK OWN NOTIFICATION AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/:id/read',\n  requireAuth,\n  async (req, res) => {\n\n    const notificationId = Number(req.params.id);\n\n    if (!Number.isInteger(notificationId) || notificationId <= 0) {\n      return res.status(400).json({\n        success: 0,\n        message: 'Invalid notification ID.'\n      });\n    }\n\n    try {\n\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE id = ?\n          AND user_id = ?\n        \`,\n        [notificationId, req.user.userId]\n      );\n\n      if (result.affectedRows === 0) {\n        return res.status(404).json({\n          success: 0,\n          message: 'Notification not found.'\n        });\n      }\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notification marked as read.'\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Notification read update error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notification.',\n        details: err.sqlMessage || err.message\n      });\n\n    }\n\n  }\n);\n\n// ------------------------------------------------------\n// 4. Get Leave Requests`;

    text = replaceOnce(text, anchor, routes, 'notification read routes');
  }

  const leaveInsertOld = `await db.query(\n  \`\n  INSERT INTO notifications (\n    user_id,\n    notification_type,\n    title,\n    message,\n    is_read\n  )\n  VALUES (?, ?, ?, ?, 0)\n  \`,\n  [\n    leaveRequest.employee_id,\n    'leave',\n    notificationTitle,\n    notificationMessage\n  ]\n);`;

  if (text.includes(leaveInsertOld)) {
    const leaveInsertNew = `const leaveStatusChanged =\n  String(leaveRequest.status || '')\n    .trim()\n    .toLowerCase() !==\n  finalStatus.toLowerCase();\n\nif (leaveStatusChanged) {\n\n  try {\n\n    await db.query(\n      \`\n      INSERT INTO notifications (\n        user_id,\n        notification_type,\n        title,\n        message,\n        is_read\n      )\n      VALUES (?, ?, ?, ?, 0)\n      \`,\n      [\n        leaveRequest.employee_id,\n        'leave',\n        notificationTitle,\n        notificationMessage\n      ]\n    );\n\n  } catch (notificationError) {\n\n    console.error(\n      '❌ Leave notification error:',\n      notificationError\n    );\n\n  }\n\n}`;

    text = replaceOnce(
      text,
      leaveInsertOld,
      leaveInsertNew,
      'leave notification hardening'
    );
  }

  const signRouteOld = `app.post(\n  '/api/management/attendance-weekly/sign',\n  requireSupervisorAccess,`;
  const signRouteNew = `app.post(\n  '/api/management/attendance-weekly/sign',\n  requireHRAccess,`;

  if (text.includes(signRouteOld)) {
    text = replaceOnce(text, signRouteOld, signRouteNew, 'weekly signature RBAC');
  }

  if (!text.includes('There are no attendance records in this weekly report to sign.')) {
    const routePos = text.indexOf("'/api/management/attendance-weekly/sign'");
    const marker = `      // --------------------------------------------------\n      // CREATE REPORT HASH\n      // --------------------------------------------------`;
    const markerPos = text.indexOf(marker, routePos);

    if (routePos < 0 || markerPos < 0) {
      throw new Error('weekly signature hash anchor not found');
    }

    const guard = `      if (attendance.length === 0) {\n\n        return res.status(400).json({\n          success: 0,\n          message:\n            'There are no attendance records in this weekly report to sign.'\n        });\n\n      }\n\n\n`;

    text = text.slice(0, markerPos) + guard + text.slice(markerPos);
  }

  if (!text.includes("'WEEKLY_ATTENDANCE_REPORT_SIGNED'")) {
    const routePos = text.indexOf("'/api/management/attendance-weekly/sign'");
    const marker = `      return res.status(201).json({`;
    const markerPos = text.indexOf(marker, routePos);

    if (routePos < 0 || markerPos < 0) {
      throw new Error('weekly signature response anchor not found');
    }

    const audit = `      await writeAuditLog(\n        req.user.userId,\n        'WEEKLY_ATTENDANCE_REPORT_SIGNED',\n        \`Weekly attendance report \${start} to \${end} digitally signed. Signature ID: \${result.insertId}. Records: \${attendance.length}.\`,\n        req.ip\n      );\n\n\n`;

    text = text.slice(0, markerPos) + audit + text.slice(markerPos);
  }

  if (!text.includes("'/api/system/time'")) {
    const marker = `// ======================================================\n// START SERVER\n// ======================================================`;
    const route = `// ======================================================\n// SYSTEM - AUTHORITATIVE DATABASE TIME\n// ======================================================\n\napp.get(\n  '/api/system/time',\n  requireAuth,\n  async (req, res) => {\n\n    try {\n\n      const [rows] = await db.query(\n        'SELECT NOW(3) AS server_time'\n      );\n\n      return res.status(200).json({\n        success: 1,\n        server_time: rows[0].server_time,\n        source: 'MySQL server time'\n      });\n\n    } catch (err) {\n\n      console.error(\n        '❌ Server time error:',\n        err\n      );\n\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to retrieve authoritative server time.'\n      });\n\n    }\n\n  }\n);\n\n\n`;

    text = replaceOnce(text, marker, route + marker, 'server time route');
  }

  write(file, text);
};

const patchClockInOut = () => {
  const file = path.join(ROOT, 'src', 'components', 'ClockInOut.js');
  backup(file);
  let text = read(file);

  if (!text.includes('const markEmployeeNotificationRead = async')) {
    const marker = `// ======================================================\n// LOAD EMPLOYEE LEAVE BALANCES\n// ======================================================`;
    const helpers = `// ======================================================\n// MARK EMPLOYEE NOTIFICATIONS AS READ\n// ======================================================\n\nconst markEmployeeNotificationRead = async (notificationId) => {\n\n    try {\n\n        await axios.put(\n            \`/api/employee/notifications/\${notificationId}/read\`,\n            {},\n            props.config\n        );\n\n        setEmployeeNotifications(\n            (currentNotifications) =>\n                currentNotifications.map(\n                    (notification) =>\n                        notification.id === notificationId\n                            ? { ...notification, is_read: 1 }\n                            : notification\n                )\n        );\n\n    } catch (err) {\n\n        console.error(\n            \"❌ Error marking notification as read:\",\n            err.response?.data || err.message\n        );\n\n    }\n\n};\n\nconst markAllEmployeeNotificationsRead = async () => {\n\n    try {\n\n        await axios.put(\n            \"/api/employee/notifications/read-all\",\n            {},\n            props.config\n        );\n\n        setEmployeeNotifications(\n            (currentNotifications) =>\n                currentNotifications.map(\n                    (notification) => ({\n                        ...notification,\n                        is_read: 1\n                    })\n                )\n        );\n\n    } catch (err) {\n\n        console.error(\n            \"❌ Error marking notifications as read:\",\n            err.response?.data || err.message\n        );\n\n    }\n\n};\n\n`;

    text = replaceOnce(text, marker, helpers + marker, 'notification helpers');
  }

  const initialOld = `        // Always load attendance history and current duty state\n        populateFields();\n\n        if (props.getTickets) {`;
  const initialNew = `        // Always load attendance history and current duty state\n        populateFields();\n\n        // Load notifications once so the unread badge is accurate.\n        loadEmployeeNotifications();\n\n        if (props.getTickets) {`;

  if (text.includes(initialOld)) {
    text = replaceOnce(text, initialOld, initialNew, 'initial notification load');
  }

  const errorOld = `        props.showAlert(\n            err.response?.data?.message ||\n            err.message ||\n            \"Attendance database error.\",\n            \"danger\"\n        );`;

  if (text.includes(errorOld)) {
    const errorNew = `        const networkFailure = !err.response;\n\n        props.showAlert(\n            networkFailure\n                ? \"You appear to be offline. Attendance was NOT recorded. Reconnect to the network and try again so the geofence and official system time can be verified.\"\n                : err.response?.data?.message ||\n                  err.message ||\n                  \"Attendance database error.\",\n            networkFailure ? \"warning\" : \"danger\"\n        );`;

    text = replaceOnce(text, errorOld, errorNew, 'offline attendance message');
  }

  if (!text.includes('EMPLOYEE NOTIFICATIONS WORKSPACE')) {
    const marker = `    {/* GPS VERIFICATION BAR */}`;
    const panel = `{/* ======================================================\n    EMPLOYEE NOTIFICATIONS WORKSPACE\n====================================================== */}\n\n{activeEmployeeSection === \"notifications\" && (\n\n    <div\n        className=\"glass-card\"\n        style={{\n            background: 'rgba(255,255,255,0.9)',\n            backdropFilter: 'blur(16px)',\n            borderRadius: '24px',\n            padding: '32px',\n            marginBottom: '24px',\n            border: '1px solid #e2e8f0',\n            boxShadow: '0 8px 30px rgba(15,23,42,0.06)'\n        }}\n    >\n\n        <div\n            style={{\n                display: 'flex',\n                justifyContent: 'space-between',\n                alignItems: 'flex-start',\n                gap: '16px',\n                flexWrap: 'wrap',\n                marginBottom: '24px'\n            }}\n        >\n            <div>\n                <div\n                    style={{\n                        fontSize: '0.75rem',\n                        fontWeight: '900',\n                        color: '#047857',\n                        textTransform: 'uppercase',\n                        letterSpacing: '0.7px',\n                        marginBottom: '6px'\n                    }}\n                >\n                    Employee Alerts\n                </div>\n\n                <h2\n                    style={{\n                        margin: 0,\n                        color: '#0f172a',\n                        fontSize: '1.6rem'\n                    }}\n                >\n                    🔔 My Notifications\n                </h2>\n            </div>\n\n            {employeeNotifications.some(\n                (notification) => Number(notification.is_read) === 0\n            ) && (\n                <button\n                    type=\"button\"\n                    onClick={markAllEmployeeNotificationsRead}\n                    style={{\n                        padding: '10px 15px',\n                        borderRadius: '11px',\n                        border: '1px solid #a7f3d0',\n                        background: '#ecfdf5',\n                        color: '#047857',\n                        fontWeight: '900',\n                        cursor: 'pointer'\n                    }}\n                >\n                    Mark all as read\n                </button>\n            )}\n        </div>\n\n        {notificationsLoading ? (\n            <div style={{ padding: '20px', color: '#64748b' }}>\n                Loading notifications...\n            </div>\n        ) : employeeNotifications.length === 0 ? (\n            <div\n                style={{\n                    padding: '22px',\n                    backgroundColor: '#f8fafc',\n                    borderRadius: '14px',\n                    color: '#64748b',\n                    border: '1px solid #e2e8f0'\n                }}\n            >\n                You have no notifications.\n            </div>\n        ) : (\n            employeeNotifications.map((notification) => (\n                <div\n                    key={notification.id}\n                    style={{\n                        padding: '18px',\n                        marginBottom: '12px',\n                        borderRadius: '16px',\n                        backgroundColor:\n                            Number(notification.is_read) === 0\n                                ? '#ecfdf5'\n                                : '#ffffff',\n                        border:\n                            Number(notification.is_read) === 0\n                                ? '1px solid #6ee7b7'\n                                : '1px solid #e2e8f0'\n                    }}\n                >\n                    <div\n                        style={{\n                            display: 'flex',\n                            justifyContent: 'space-between',\n                            alignItems: 'flex-start',\n                            gap: '15px'\n                        }}\n                    >\n                        <div style={{ flex: 1 }}>\n                            <div\n                                style={{\n                                    fontWeight: '900',\n                                    color: '#0f172a',\n                                    fontSize: '1rem'\n                                }}\n                            >\n                                {notification.title}\n                            </div>\n\n                            <div\n                                style={{\n                                    marginTop: '8px',\n                                    color: '#475569',\n                                    fontSize: '0.9rem',\n                                    lineHeight: '1.5'\n                                }}\n                            >\n                                {notification.message}\n                            </div>\n                        </div>\n\n                        {Number(notification.is_read) === 0 && (\n                            <span\n                                style={{\n                                    backgroundColor: '#047857',\n                                    color: '#ffffff',\n                                    padding: '5px 10px',\n                                    borderRadius: '999px',\n                                    fontSize: '0.7rem',\n                                    fontWeight: '900'\n                                }}\n                            >\n                                NEW\n                            </span>\n                        )}\n                    </div>\n\n                    <div\n                        style={{\n                            display: 'flex',\n                            justifyContent: 'space-between',\n                            alignItems: 'center',\n                            gap: '12px',\n                            flexWrap: 'wrap',\n                            marginTop: '14px'\n                        }}\n                    >\n                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>\n                            {notification.created_at\n                                ? new Date(notification.created_at).toLocaleString()\n                                : ''}\n                        </div>\n\n                        {Number(notification.is_read) === 0 && (\n                            <button\n                                type=\"button\"\n                                onClick={() =>\n                                    markEmployeeNotificationRead(notification.id)\n                                }\n                                style={{\n                                    padding: '8px 12px',\n                                    borderRadius: '10px',\n                                    border: '1px solid #a7f3d0',\n                                    background: '#ffffff',\n                                    color: '#047857',\n                                    fontWeight: '900',\n                                    cursor: 'pointer',\n                                    fontSize: '0.78rem'\n                                }}\n                            >\n                                Mark as read\n                            </button>\n                        )}\n                    </div>\n                </div>\n            ))\n        )}\n\n    </div>\n\n)}\n\n`;

    text = replaceOnce(text, marker, panel + marker, 'notification workspace');
  }

  write(file, text);
};

const patchManagementView = () => {
  const file = path.join(ROOT, 'src', 'components', 'ManagementView.js');
  backup(file);
  let text = read(file);

  const oldText = `{(isFullManagement || isHRAdmin || isSupervisor) && (`;
  const newText = `{(isFullManagement || isHRAdmin) && (`;

  if (text.includes(oldText)) {
    text = replaceOnce(text, oldText, newText, 'weekly sign button RBAC');
  }

  write(file, text);
};

const main = () => {
  console.log('Creating safety backups and applying guarded Phase 4 changes...');
  patchServer();
  patchClockInOut();
  patchManagementView();
  console.log('Phase 4 completion patch applied successfully.');
  console.log('Backups were created beside modified source files with .phase4_backup suffix.');
};

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
