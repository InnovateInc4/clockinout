const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path = require("path");
const db = require("./config/db");
const { checkToken } = require("./auth/token_validation");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const { sign } = require("jsonwebtoken");
const jwtKey = require("./config/jwt-key");

const app = express();

// Enable CORS
app.use(cors());

// Increase body payload limit to 50MB for facial image base64 strings
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- DATABASE HELPERS ---

// --- HELPERS ---

const create = (data, callback) => {
    // Map request fields safely
    const fullName = data.fullName || data.name || "Employee User";
    const userEmail = data.email || data.userEmail;
    const password = data.password;
    const level = data.level || data.role || "employee";
    const role = data.role || data.level || "employee";
    const faceImage = data.faceReferenceImage || data.photo || null;

    db.query(
        `INSERT INTO users (fullName, userEmail, password, level, role, faceReferenceImage) VALUES (?, ?, ?, ?, ?, ?)`,
        [fullName, userEmail, password, level, role, faceImage],
        (error, results) => {
            if (error) {
                console.error("SQL INSERTION ERROR:", error);
                return callback(error);
            }
            return callback(null, results);
        }
    );
};
const getUserByUserEmail = (email, callback) => {
    db.query(
        `SELECT * FROM users WHERE userEmail = ?`,
        [email],
        (error, results) => {
            if (error) {
                return callback(error);
            }
            return callback(null, results[0]);
        }
    );
};

const handleRegister = (req, res) => {
    const body = req.body;
    
    const emailToUse = body.email || body.userEmail;
    if (!emailToUse) {
        return res.status(400).json({ success: 0, message: "Email is required" });
    }

    if (!body.password) {
        return res.status(400).json({ success: 0, message: "Password is required" });
    }

    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);

    create(body, (err, results) => {
        if (err) {
            console.error("Full Registration Error:", err);
            // Return 400 with exact SQL message so Axios displays the real reason
            return res.status(400).json({
                success: 0,
                message: err.sqlMessage || err.message || "Registration failed"
            });
        }
        return res.status(200).json({
            success: 1,
            message: "User registered successfully",
            data: results
        });
    });
};
// --- ROUTES ---

app.post("/register", handleRegister);
app.post("/api/auth/register", handleRegister);

app.post("/api/auth/login-admin", (req, res) => {
    const body = req.body;
    const cleanEmail = body.email ? body.email.replace(/[&\/\\#,+()$~%'"*?|<>{}“]/g, '') : '';

    getUserByUserEmail(cleanEmail, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
        if (!results) {
            return res.status(401).json({
                success: 0,
                message: "Invalid email or password"
            });
        }

        const result = compareSync(body.password, results.password);
        if (result) {
            results.password = undefined;
            const jsontoken = sign({ result: results }, jwtKey, {
                expiresIn: "8h"
            });

            db.query(
                `UPDATE users SET token = ? WHERE userEmail = ?`,
                [jsontoken, cleanEmail],
                (err, updateResult) => {
                    if (err) {
                        console.log("Error saving token: " + err);
                    }
                    return res.status(200).json({
                        success: 1,
                        message: "Login successful",
                        token: jsontoken,
                        user: {
                            email: results.userEmail,
                            fullName: results.fullName || results.userEmail,
                            role: results.level || results.role || "employee",
                            faceReferenceImage: results.faceReferenceImage
                        }
                    });
                }
            );
        } else {
            return res.status(401).json({
                success: 0,
                message: "Invalid email or password"
            });
        }
    });
});

app.get("/api/auth/all-employees", checkToken, (req, res) => {
    db.query("SELECT userEmail AS email, level, fullName FROM users", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.put("/logout-uuid", (req, res) => {
    db.query(
        `UPDATE users SET token = ? WHERE userEmail = ?`,
        [req.body.uuid, req.body.email],
        (err, result) => {
            if (err) {
                res.status(500).send("Setting logout token failed. " + err);
            } else {
                res.send("Logout uuid saved.");
            }
        }
    );
});

app.delete("/delete-user/:email", checkToken, (req, res) => {
    db.query(
        "DELETE FROM users WHERE userEmail = ?",
        [req.params.email],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.send(req.params);
            }
        }
    );
});

app.put("/edit-level", checkToken, (req, res) => {
    db.query(
        `UPDATE users SET level = ? WHERE userEmail = ?`,
        [req.body.level, req.body.email],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.send(result);
            }
        }
    );
});

app.get("/level/:email", checkToken, (req, res) => {
    db.query(
        `SELECT level FROM users WHERE userEmail = ?`,
        [req.params.email],
        (err, results) => {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.json(results);
            }
        }
    );
});

app.get("/check-token/:email", checkToken, (req, res) => {
    db.query(
        `SELECT token FROM users WHERE userEmail = ?`,
        [req.params.email],
        (err, results) => {
            if (err) {
                console.log("Check token error: " + err);
                res.status(500).send(err);
            } else {
                res.send(results);
            }
        }
    );
});

app.put("/change-password", checkToken, (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);

    db.query(
        `UPDATE users SET password = ? WHERE userEmail = ?`,
        [body.password, body.email],
        (err, result) => {
            if (err) {
                console.log(err);
                res.status(500).send(err);
            } else {
                res.send(result);
            }
        }
    );
});

const ticketRouter = require("./routes/api/tickets");
app.use("/api/tickets", ticketRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});