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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});``