const express = require("express");
const router = express.Router();
const db = require("../db"); // Ensure you have your db connection here
const jwt = require("jsonwebtoken");

// Middleware to protect routes
const checkToken = (req, res, next) => {
    const header = req.headers['authorization'];
    if(typeof header !== 'undefined') {
        const bearer = header.split(' ');
        const token = bearer[1];
        jwt.verify(token, 'secretkey', (err, authData) => {
            if(err) res.sendStatus(403);
            else {
                req.token = token;
                next();
            }
        })
    } else {
        res.sendStatus(403);
    }
};

// --- EXISTING ROUTES ---

// Clock In
router.post("/clock-in", (req, res) => {
    const { employee, hours, coords, task } = req.body;
    const ticketHours = JSON.stringify(hours);
    
    // Check if ticket exists for today
    db.query("SELECT * FROM tickets WHERE title = ? AND DATE(created_at) = CURDATE()", [employee], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0) {
            // Update existing ticket
            db.query("UPDATE tickets SET hours = ? WHERE id = ?", [ticketHours, result[0].id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: 1, message: "Ticket updated" });
            });
        } else {
            // Create new ticket
            db.query("INSERT INTO tickets (title, description, status, priority, hours) VALUES (?, ?, ?, ?, ?)", 
            [employee, `Shift for ${employee}`, 'Open', 'Normal', ticketHours], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: 1, message: "New ticket created" });
            });
        }
    });
});

// Get All Tickets (For Management & History)
router.get("/all-tickets", (req, res) => {
    db.query("SELECT * FROM tickets ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result);
    });
});

// Submit Suggestion
router.post("/submit-suggestion", (req, res) => {
    const { message } = req.body;
    db.query("INSERT INTO suggestions (message) VALUES (?)", [message], (err, result) => {
        if (err) return res.status(500).json({ success: 0 });
        res.json({ success: 1 });
    });
});

// Get Suggestions
router.get("/get-suggestions", (req, res) => {
    db.query("SELECT * FROM suggestions ORDER BY created_at DESC", (err, result) => {
        if (err) return res.status(500).json({ success: 0 });
        res.json(result);
    });
});

// Clear Suggestions
router.delete("/clear-suggestions", (req, res) => {
    db.query("TRUNCATE TABLE suggestions", (err, result) => {
        if (err) return res.status(500).json({ success: 0 });
        res.json({ success: 1 });
    });
});

// --- NEW LEAVE ROUTES ---

// 1. Submit Leave Request
router.post("/submit-leave", (req, res) => {
    const { employee, type, startDate, endDate, reason } = req.body;
    const sql = "INSERT INTO leave_requests (employee, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [employee, type, startDate, endDate, reason], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: 0 });
        }
        res.json({ success: 1 });
    });
});

// 2. Get All Leave Requests (For Manager)
router.get("/get-leave-requests", (req, res) => {
    db.query("SELECT * FROM leave_requests ORDER BY created_at DESC", (err, result) => {
        if (err) return res.status(500).json({ success: 0 });
        res.json(result);
    });
});

// 3. Update Leave Status (Approve/Deny)
router.put("/update-leave-status", (req, res) => {
    const { id, status } = req.body;
    db.query("UPDATE leave_requests SET status = ? WHERE id = ?", [status, id], (err, result) => {
        if (err) return res.status(500).json({ success: 0 });
        res.json({ success: 1 });
    });
});

module.exports = router;