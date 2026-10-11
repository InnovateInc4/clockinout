const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, content) => fs.writeFileSync(file, content, 'utf8');

const backup = (file) => {
  const backupFile = `${file}.phase4_backup`;
  if (!fs.existsSync(backupFile)) fs.copyFileSync(file, backupFile);
};

const mustFind = (text, needle, label, from = 0) => {
  const index = text.indexOf(needle, from);
  if (index === -1) throw new Error(`${label}: required anchor not found.`);
  return index;
};

const insertBefore = (text, needle, insertion, label) => {
  const index = mustFind(text, needle, label);
  return text.slice(0, index) + insertion + text.slice(index);
};

const replaceFirst = (text, oldText, newText, label) => {
  const index = mustFind(text, oldText, label);
  return text.slice(0, index) + newText + text.slice(index + oldText.length);
};

const patchServer = (original) => {
  let text = original;

  // Bound notification history without depending on route-closing braces.
  const notificationRoute = "'/api/employee/notifications'";
  const notificationRoutePos = mustFind(text, notificationRoute, 'employee notification GET route');
  const orderNeedle = 'ORDER BY created_at DESC';
  const orderPos = mustFind(text, orderNeedle, 'notification ordering', notificationRoutePos);
  const limitCheckWindow = text.slice(orderPos, orderPos + 120);
  if (!limitCheckWindow.includes('LIMIT 50')) {
    text = text.slice(0, orderPos) +
      'ORDER BY created_at DESC\n          LIMIT 50' +
      text.slice(orderPos + orderNeedle.length);
    console.log('APPLY: notification list limit');
  } else {
    console.log('SKIP: notification list limit already present');
  }

  // Insert employee-owned read endpoints before the known management leave route.
  if (!text.includes("'/api/employee/notifications/:id/read'")) {
    const managementLeaveAnchor = "app.get(\n  '/api/tickets/get-leave-requests'";
    const routes = `// ======================================================\n// EMPLOYEE - MARK ALL OWN NOTIFICATIONS AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/read-all',\n  requireAuth,\n  async (req, res) => {\n    try {\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE user_id = ?\n          AND is_read = 0\n        \`,\n        [req.user.userId]\n      );\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notifications marked as read.',\n        updated: result.affectedRows\n      });\n    } catch (err) {\n      console.error('❌ Mark-all notifications error:', err);\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notifications.',\n        details: err.sqlMessage || err.message\n      });\n    }\n  }\n);\n\n// ======================================================\n// EMPLOYEE - MARK OWN NOTIFICATION AS READ\n// ======================================================\n\napp.put(\n  '/api/employee/notifications/:id/read',\n  requireAuth,\n  async (req, res) => {\n    const notificationId = Number(req.params.id);\n\n    if (!Number.isInteger(notificationId) || notificationId <= 0) {\n      return res.status(400).json({\n        success: 0,\n        message: 'Invalid notification ID.'\n      });\n    }\n\n    try {\n      const [result] = await db.query(\n        \`\n        UPDATE notifications\n        SET is_read = 1\n        WHERE id = ?\n          AND user_id = ?\n        \`,\n        [notificationId, req.user.userId]\n      );\n\n      if (result.affectedRows === 0) {\n        return res.status(404).json({\n          success: 0,\n          message: 'Notification not found.'\n        });\n      }\n\n      return res.status(200).json({\n        success: 1,\n        message: 'Notification marked as read.'\n      });\n    } catch (err) {\n      console.error('❌ Notification read update error:', err);\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to update notification.',\n        details: err.sqlMessage || err.message\n      });\n    }\n  }\n);\n\n`;
    text = insertBefore(text, managementLeaveAnchor, routes, 'management leave route insertion point');
    console.log('APPLY: employee notification read endpoints');
  } else {
    console.log('SKIP: employee notification read endpoints already present');
  }

  // Keep leave decision successful if only notification delivery fails.
  const rawInsertStart = 'await db.query(\n  `\n  INSERT INTO notifications (';
  if (text.includes(rawInsertStart) && !text.includes('Leave notification error:')) {
    const start = text.indexOf(rawInsertStart);
    const endNeedle = '\n);';
    const end = text.indexOf(endNeedle, start);
    if (end === -1) throw new Error('leave notification insert end not found');
    const oldBlock = text.slice(start, end + endNeedle.length);
    const wrapped = `try {\n\n  ${oldBlock.replace(/\n/g, '\n  ')}\n\n} catch (notificationError) {\n\n  console.error(\n    '❌ Leave notification error:',\n    notificationError\n  );\n\n}`;
    text = text.slice(0, start) + wrapped + text.slice(end + endNeedle.length);
    console.log('APPLY: leave notification reliability guard');
  } else {
    console.log('SKIP: leave notification reliability guard not required');
  }

  // Weekly report signing permissions.
  const signRouteOld = "app.post(\n  '/api/management/attendance-weekly/sign',\n  requireSupervisorAccess,";
  const signRouteNew = "app.post(\n  '/api/management/attendance-weekly/sign',\n  requireHRAccess,";
  if (text.includes(signRouteOld)) {
    text = replaceFirst(text, signRouteOld, signRouteNew, 'weekly signature RBAC');
    console.log('APPLY: weekly signature RBAC');
  } else {
    console.log('SKIP: weekly signature RBAC already aligned or route differs');
  }

  // Prevent empty weekly report signatures.
  if (!text.includes('There are no attendance records in this weekly report to sign.')) {
    const routePos = mustFind(text, "'/api/management/attendance-weekly/sign'", 'weekly signature route');
    const hashMarker = '// CREATE REPORT HASH';
    const hashPos = mustFind(text, hashMarker, 'weekly signature hash marker', routePos);
    const lineStart = text.lastIndexOf('\n', hashPos) + 1;
    const guard = `      if (attendance.length === 0) {\n        return res.status(400).json({\n          success: 0,\n          message: 'There are no attendance records in this weekly report to sign.'\n        });\n      }\n\n`;
    text = text.slice(0, lineStart) + guard + text.slice(lineStart);
    console.log('APPLY: empty weekly report signature guard');
  } else {
    console.log('SKIP: empty weekly report signature guard already present');
  }

  // Audit successful weekly signature.
  if (!text.includes("'WEEKLY_ATTENDANCE_REPORT_SIGNED'")) {
    const routePos = mustFind(text, "'/api/management/attendance-weekly/sign'", 'weekly signature route for audit');
    const successNeedle = 'return res.status(201).json({';
    const successPos = mustFind(text, successNeedle, 'weekly signature success response', routePos);
    const audit = `await writeAuditLog(\n        req.user.userId,\n        'WEEKLY_ATTENDANCE_REPORT_SIGNED',\n        \`Weekly attendance report \${start} to \${end} digitally signed. Signature ID: \${result.insertId}. Records: \${attendance.length}.\`,\n        req.ip\n      );\n\n      `;
    text = text.slice(0, successPos) + audit + text.slice(successPos);
    console.log('APPLY: weekly signature audit log');
  } else {
    console.log('SKIP: weekly signature audit log already present');
  }

  // Expose authoritative DB time for verification/demo.
  if (!text.includes("'/api/system/time'")) {
    const startServerMarker = '// START SERVER';
    const markerPos = mustFind(text, startServerMarker, 'server start marker');
    const sectionStart = text.lastIndexOf('// ======================================================', markerPos);
    const insertPos = sectionStart >= 0 ? sectionStart : markerPos;
    const route = `// ======================================================\n// SYSTEM - AUTHORITATIVE DATABASE TIME\n// ======================================================\n\napp.get(\n  '/api/system/time',\n  requireAuth,\n  async (req, res) => {\n    try {\n      const [rows] = await db.query('SELECT NOW(3) AS server_time');\n      return res.status(200).json({\n        success: 1,\n        server_time: rows[0].server_time,\n        source: 'MySQL server time'\n      });\n    } catch (err) {\n      console.error('❌ Server time error:', err);\n      return res.status(500).json({\n        success: 0,\n        message: 'Unable to retrieve authoritative server time.'\n      });\n    }\n  }\n);\n\n`;
    text = text.slice(0, insertPos) + route + text.slice(insertPos);
    console.log('APPLY: authoritative server time endpoint');
  } else {
    console.log('SKIP: authoritative server time endpoint already present');
  }

  return text;
};

const patchClock = (original) => {
  let text = original;

  if (!text.includes('const markEmployeeNotificationRead = async')) {
    const marker = '// LOAD EMPLOYEE LEAVE BALANCES';
    const markerPos = mustFind(text, marker, 'leave balance loader marker');
    const sectionStart = text.lastIndexOf('// ======================================================', markerPos);
    const insertPos = sectionStart >= 0 ? sectionStart : markerPos;
    const helpers = `// ======================================================\n// MARK EMPLOYEE NOTIFICATIONS AS READ\n// ======================================================\n\nconst markEmployeeNotificationRead = async (notificationId) => {\n  try {\n    await axios.put(\n      \`/api/employee/notifications/\${notificationId}/read\`,\n      {},\n      props.config\n    );\n\n    setEmployeeNotifications((current) =>\n      current.map((notification) =>\n        notification.id === notificationId\n          ? { ...notification, is_read: 1 }\n          : notification\n      )\n    );\n  } catch (err) {\n    console.error(\n      '❌ Error marking notification as read:',\n      err.response?.data || err.message\n    );\n  }\n};\n\nconst markAllEmployeeNotificationsRead = async () => {\n  try {\n    await axios.put(\n      '/api/employee/notifications/read-all',\n      {},\n      props.config\n    );\n\n    setEmployeeNotifications((current) =>\n      current.map((notification) => ({\n        ...notification,\n        is_read: 1\n      }))\n    );\n  } catch (err) {\n    console.error(\n      '❌ Error marking notifications as read:',\n      err.response?.data || err.message\n    );\n  }\n};\n\n`;
    text = text.slice(0, insertPos) + helpers + text.slice(insertPos);
    console.log('APPLY: notification read helpers');
  } else {
    console.log('SKIP: notification read helpers already present');
  }

  // Load unread badge on workspace initialisation.
  const populateNeedle = '        populateFields();';
  if (!text.includes('unread badge is accurate')) {
    const populatePos = mustFind(text, populateNeedle, 'initial populateFields call');
    const insertionPos = populatePos + populateNeedle.length;
    text = text.slice(0, insertionPos) +
      `\n\n        // Load notifications once so the unread badge is accurate.\n        loadEmployeeNotifications();` +
      text.slice(insertionPos);
    console.log('APPLY: initial notification load');
  } else {
    console.log('SKIP: initial notification load already present');
  }

  // Safer message for network failure during official attendance write.
  const attendanceErrorNeedle = '"Attendance database error.",\n            "danger"';
  if (text.includes(attendanceErrorNeedle) && !text.includes('Attendance was NOT recorded')) {
    const oldAlert = `props.showAlert(\n            err.response?.data?.message ||\n            err.message ||\n            \"Attendance database error.\",\n            \"danger\"\n        );`;
    const newAlert = `const networkFailure = !err.response;\n\n        props.showAlert(\n            networkFailure\n                ? \"You appear to be offline. Attendance was NOT recorded. Reconnect and try again so the geofence and official system time can be verified.\"\n                : err.response?.data?.message || err.message || \"Attendance database error.\",\n            networkFailure ? \"warning\" : \"danger\"\n        );`;
    if (text.includes(oldAlert)) {
      text = replaceFirst(text, oldAlert, newAlert, 'offline attendance message');
      console.log('APPLY: offline attendance message');
    } else {
      console.log('SKIP: offline attendance message exact block not found');
    }
  } else {
    console.log('SKIP: offline attendance message already present or not applicable');
  }

  // Notification panel before the first GPS bar.
  if (!text.includes('EMPLOYEE NOTIFICATIONS WORKSPACE')) {
    const gpsNeedle = '    {/* GPS VERIFICATION BAR */}';
    const gpsPos = mustFind(text, gpsNeedle, 'GPS verification UI marker');
    const panel = `{/* ======================================================\n    EMPLOYEE NOTIFICATIONS WORKSPACE\n====================================================== */}\n\n{activeEmployeeSection === \"notifications\" && (\n  <div\n    className=\"glass-card\"\n    style={{\n      background: 'rgba(255,255,255,0.9)',\n      backdropFilter: 'blur(16px)',\n      borderRadius: '24px',\n      padding: '32px',\n      marginBottom: '24px',\n      border: '1px solid #e2e8f0',\n      boxShadow: '0 8px 30px rgba(15,23,42,0.06)'\n    }}\n  >\n    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>\n      <div>\n        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>\n          Employee Alerts\n        </div>\n        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.6rem' }}>\n          🔔 My Notifications\n        </h2>\n      </div>\n\n      {employeeNotifications.some((notification) => Number(notification.is_read) === 0) && (\n        <button\n          type=\"button\"\n          onClick={markAllEmployeeNotificationsRead}\n          style={{ padding: '10px 15px', borderRadius: '11px', border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: '900', cursor: 'pointer' }}\n        >\n          Mark all as read\n        </button>\n      )}\n    </div>\n\n    {notificationsLoading ? (\n      <div style={{ padding: '20px', color: '#64748b' }}>Loading notifications...</div>\n    ) : employeeNotifications.length === 0 ? (\n      <div style={{ padding: '22px', backgroundColor: '#f8fafc', borderRadius: '14px', color: '#64748b', border: '1px solid #e2e8f0' }}>\n        You have no notifications.\n      </div>\n    ) : (\n      employeeNotifications.map((notification) => (\n        <div\n          key={notification.id}\n          style={{\n            padding: '18px',\n            marginBottom: '12px',\n            borderRadius: '16px',\n            backgroundColor: Number(notification.is_read) === 0 ? '#ecfdf5' : '#ffffff',\n            border: Number(notification.is_read) === 0 ? '1px solid #6ee7b7' : '1px solid #e2e8f0'\n          }}\n        >\n          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px' }}>\n            <div style={{ flex: 1 }}>\n              <div style={{ fontWeight: '900', color: '#0f172a', fontSize: '1rem' }}>{notification.title}</div>\n              <div style={{ marginTop: '8px', color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>{notification.message}</div>\n            </div>\n            {Number(notification.is_read) === 0 && (\n              <span style={{ backgroundColor: '#047857', color: '#ffffff', padding: '5px 10px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '900' }}>NEW</span>\n            )}\n          </div>\n\n          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>\n            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>\n              {notification.created_at ? new Date(notification.created_at).toLocaleString() : ''}\n            </div>\n            {Number(notification.is_read) === 0 && (\n              <button\n                type=\"button\"\n                onClick={() => markEmployeeNotificationRead(notification.id)}\n                style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #a7f3d0', background: '#ffffff', color: '#047857', fontWeight: '900', cursor: 'pointer', fontSize: '0.78rem' }}\n              >\n                Mark as read\n              </button>\n            )}\n          </div>\n        </div>\n      ))\n    )}\n  </div>\n)}\n\n`;
    text = text.slice(0, gpsPos) + panel + text.slice(gpsPos);
    console.log('APPLY: employee Notifications workspace');
  } else {
    console.log('SKIP: employee Notifications workspace already present');
  }

  return text;
};

const patchManagement = (original) => {
  let text = original;
  const old = '{(isFullManagement || isHRAdmin || isSupervisor) && (';
  const replacement = '{(isFullManagement || isHRAdmin) && (';
  if (text.includes(old)) {
    text = replaceFirst(text, old, replacement, 'weekly sign button permissions');
    console.log('APPLY: weekly sign button permissions');
  } else {
    console.log('SKIP: weekly sign button permissions already aligned or anchor not present');
  }
  return text;
};

const main = () => {
  const serverFile = path.join(ROOT, 'server', 'server.js');
  const clockFile = path.join(ROOT, 'src', 'components', 'ClockInOut.js');
  const managementFile = path.join(ROOT, 'src', 'components', 'ManagementView.js');

  console.log('Validating all Phase 4 v3 changes in memory first...');

  const serverOriginal = read(serverFile);
  const clockOriginal = read(clockFile);
  const managementOriginal = read(managementFile);

  const serverPatched = patchServer(serverOriginal);
  const clockPatched = patchClock(clockOriginal);
  const managementPatched = patchManagement(managementOriginal);

  console.log('Validation passed. Creating backups and writing changes...');
  backup(serverFile);
  backup(clockFile);
  backup(managementFile);

  write(serverFile, serverPatched);
  write(clockFile, clockPatched);
  write(managementFile, managementPatched);

  console.log('Phase 4 completion patch v3 applied successfully.');
};

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
