const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// 1. Get All Tickets / Active Shifts
app.get('/api/tickets/all-tickets', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tickets');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching tickets' });
  }
});

// 2. Get Staff Suggestions / Feedback
app.get('/api/tickets/get-suggestions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM suggestions ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching suggestions' });
  }
});

// 3. Clear Staff Feedback
app.delete('/api/tickets/clear-suggestions', async (req, res) => {
  try {
    await db.query('DELETE FROM suggestions');
    res.json({ message: 'Feedback log cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error clearing suggestions' });
  }
});

// 4. Get Leave Requests
app.get('/api/tickets/get-leave-requests', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM leave_requests ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching leave requests' });
  }
});

// 5. Update Leave Request Status
app.put('/api/tickets/update-leave-status', async (req, res) => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: 'Missing required fields (id, status)' });
  }

  try {
    await db.query('UPDATE leave_requests SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: `Leave request marked as ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating leave status' });
  }
});

// ============================================
// HR ADMIN ROUTES (Employee Management)
// ============================================

// 6. Get all employees
app.get('/api/users/all-employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, userName, userEmail, role, department, status, created_at FROM employees ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching employees' });
  }
});

// 7. Register new employee
app.post('/api/users/register', async (req, res) => {
  const { userName, userEmail, role, department } = req.body;

  if (!userName || !userEmail) {
    return res.status(400).json({ error: 'userName and userEmail are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO employees (userName, userEmail, role, department, status) VALUES (?, ?, ?, ?, ?)',
      [userName, userEmail, role || 'worker', department || 'General', 'Active']
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['ADD_EMPLOYEE', 'HR Admin', `Added employee ${userName} (${userEmail})`]
    );

    res.json({
      success: true,
      message: 'Employee added successfully',
      id: result.insertId
    });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error adding employee' });
  }
});

// 8. Update employee (Edit)
app.put('/api/users/update-employee/:id', async (req, res) => {
  const { id } = req.params;
  const { userName, userEmail, role, department } = req.body;

  try {
    await db.query(
      'UPDATE employees SET userName = ?, userEmail = ?, role = ?, department = ? WHERE id = ?',
      [userName, userEmail, role, department, id]
    );

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['EDIT_EMPLOYEE', 'HR Admin', `Updated employee #${id} (${userName})`]
    );

    res.json({ success: true, message: 'Employee updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating employee' });
  }
});

// 9. Deactivate employee
app.put('/api/users/deactivate-employee/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('UPDATE employees SET status = ? WHERE id = ?', ['Deactivated', id]);

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['DEACTIVATE_EMPLOYEE', 'HR Admin', `Deactivated employee #${id}`]
    );

    res.json({ success: true, message: 'Employee deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deactivating employee' });
  }
});

// 10. Reactivate employee
app.put('/api/users/reactivate-employee/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('UPDATE employees SET status = ? WHERE id = ?', ['Active', id]);

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['REACTIVATE_EMPLOYEE', 'HR Admin', `Reactivated employee #${id}`]
    );

    res.json({ success: true, message: 'Employee reactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error reactivating employee' });
  }
});

// ============================================
// HR ADMIN ROUTES (Documents)
// ============================================

// 11. Get all documents
app.get('/api/documents/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.employee_id, d.document_name, d.document_type,
             d.file_path, d.uploaded_at,
             e.userName AS employee_name, e.userEmail AS employee_email
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      ORDER BY d.uploaded_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching documents' });
  }
});

// 12. Get documents for a specific employee
app.get('/api/documents/employee/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT * FROM documents WHERE employee_id = ? ORDER BY uploaded_at DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching employee documents' });
  }
});

// 13. Add a new document
app.post('/api/documents/add', async (req, res) => {
  const { employee_id, document_name, document_type, file_path } = req.body;

  if (!employee_id || !document_name) {
    return res.status(400).json({ error: 'employee_id and document_name are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO documents (employee_id, document_name, document_type, file_path) VALUES (?, ?, ?, ?)',
      [employee_id, document_name, document_type || 'General', file_path || null]
    );

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['ADD_DOCUMENT', 'HR Admin', `Added document "${document_name}" for employee #${employee_id}`]
    );

    res.json({ success: true, message: 'Document added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding document' });
  }
});

// 14. Delete a document
app.delete('/api/documents/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT document_name FROM documents WHERE id = ?', [id]);
    const docName = rows[0]?.document_name || `#${id}`;

    await db.query('DELETE FROM documents WHERE id = ?', [id]);

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['DELETE_DOCUMENT', 'HR Admin', `Deleted document "${docName}"`]
    );

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting document' });
  }
});

// ============================================
// HR ADMIN ROUTES (Certificates + Expiry)
// ============================================

// 15. Get all certificates with employee + expiry status
app.get('/api/certificates/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.employee_id, c.certificate_name,
             c.issue_date, c.expiry_date, c.created_at,
             e.userName AS employee_name,
             e.department AS employee_department,
             DATEDIFF(c.expiry_date, CURDATE()) AS days_remaining
      FROM certificates c
      LEFT JOIN employees e ON e.id = c.employee_id
      ORDER BY c.expiry_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching certificates' });
  }
});

// 16. Add a new certificate
app.post('/api/certificates/add', async (req, res) => {
  const { employee_id, certificate_name, issue_date, expiry_date } = req.body;

  if (!employee_id || !certificate_name || !expiry_date) {
    return res.status(400).json({
      error: 'employee_id, certificate_name and expiry_date are required'
    });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO certificates (employee_id, certificate_name, issue_date, expiry_date) VALUES (?, ?, ?, ?)',
      [employee_id, certificate_name, issue_date || null, expiry_date]
    );

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['ADD_CERTIFICATE', 'HR Admin', `Added certificate "${certificate_name}" for employee #${employee_id}`]
    );

    res.json({ success: true, message: 'Certificate added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding certificate' });
  }
});

// 17. Update a certificate
app.put('/api/certificates/update/:id', async (req, res) => {
  const { id } = req.params;
  const { certificate_name, issue_date, expiry_date } = req.body;

  try {
    await db.query(
      'UPDATE certificates SET certificate_name = ?, issue_date = ?, expiry_date = ? WHERE id = ?',
      [certificate_name, issue_date || null, expiry_date, id]
    );

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['EDIT_CERTIFICATE', 'HR Admin', `Updated certificate #${id}`]
    );

    res.json({ success: true, message: 'Certificate updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating certificate' });
  }
});

// 18. Delete a certificate
app.delete('/api/certificates/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM certificates WHERE id = ?', [id]);

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['DELETE_CERTIFICATE', 'HR Admin', `Deleted certificate #${id}`]
    );

    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting certificate' });
  }
});

// 19. Get ONLY certificates expiring within 30 days (or already expired)
app.get('/api/certificates/expiring-soon', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.certificate_name, c.expiry_date,
             e.userName AS employee_name,
             DATEDIFF(c.expiry_date, CURDATE()) AS days_remaining
      FROM certificates c
      LEFT JOIN employees e ON e.id = c.employee_id
      WHERE DATEDIFF(c.expiry_date, CURDATE()) <= 30
      ORDER BY c.expiry_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching expiring certificates' });
  }
});

// ============================================
// HR ADMIN ROUTES (Audit Logs)
// ============================================

// 20. Get all audit logs
app.get('/api/audit-logs/all', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, action, performed_by, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 500'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching audit logs' });
  }
});

// 21. Clear audit logs
app.delete('/api/audit-logs/clear', async (req, res) => {
  try {
    await db.query('DELETE FROM audit_logs');
    res.json({ success: true, message: 'Audit logs cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error clearing audit logs' });
  }
});

// ============================================
// HR ADMIN ROUTES (Reports)
// ============================================

// 22. Report: Employees
app.get('/api/reports/employees', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, userName, userEmail, role, department, status, created_at FROM employees ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating employees report' });
  }
});

// 23. Report: Documents
app.get('/api/reports/documents', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.document_name, d.document_type, d.file_path, d.uploaded_at,
             e.userName AS employee_name
      FROM documents d
      LEFT JOIN employees e ON e.id = d.employee_id
      ORDER BY d.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating documents report' });
  }
});

// 24. Report: Certificates
app.get('/api/reports/certificates', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.certificate_name, c.issue_date, c.expiry_date,
             e.userName AS employee_name,
             DATEDIFF(c.expiry_date, CURDATE()) AS days_remaining
      FROM certificates c
      LEFT JOIN employees e ON e.id = c.employee_id
      ORDER BY c.expiry_date ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating certificates report' });
  }
});

// 25. Report: Audit Logs
app.get('/api/reports/audit-logs', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, action, performed_by, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 500'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating audit logs report' });
  }
});

// ============================================
// HR ADMIN ROUTES (OTP Verification)
// ============================================

// 26. Request OTP - generates a 6-digit code for the given email
app.post('/api/otp/request', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Generate a 6-digit code
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // Expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Invalidate any previous unused OTPs for this email
    await db.query('UPDATE otp_codes SET used = TRUE WHERE email = ? AND used = FALSE', [email]);

    // Insert new OTP
    await db.query(
      'INSERT INTO otp_codes (email, otp_code, expires_at, used) VALUES (?, ?, ?, FALSE)',
      [email, otpCode, expiresAt]
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['OTP_REQUESTED', email, `OTP requested for HR Admin login`]
    );

    // DEV MODE: print OTP to the backend terminal (no real email yet)
    console.log('\n============================================');
    console.log(`📧 OTP for ${email}`);
    console.log(`🔐 CODE: ${otpCode}`);
    console.log(`⏰ Expires at: ${expiresAt.toLocaleTimeString()}`);
    console.log('============================================\n');

    // For dev: we return the OTP so it can be shown on the screen.
    // In production, remove `devOtp` and send via email instead.
    res.json({
      success: true,
      message: 'OTP generated. Check the backend terminal for the code.',
      devOtp: otpCode,
      expiresAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error generating OTP' });
  }
});

// 27. Verify OTP - checks code for the given email
app.post('/api/otp/verify', async (req, res) => {
  const { email, otp_code } = req.body;

  if (!email || !otp_code) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, otp_code, expires_at, used
       FROM otp_codes
       WHERE email = ? AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'No active OTP found for this email' });
    }

    const record = rows[0];

    if (record.otp_code !== String(otp_code).trim()) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Mark as used
    await db.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [record.id]);

    await db.query(
      'INSERT INTO audit_logs (action, performed_by, details) VALUES (?, ?, ?)',
      ['OTP_VERIFIED', email, 'HR Admin successfully verified via OTP']
    );

    res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});



// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});``