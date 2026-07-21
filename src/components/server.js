const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const path = require("path");
const db = require("./config/db");
const { checkToken } = require("./auth/token_validation");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const { sign } = require("jsonwebtoken");
const jwtKey = require("./config/jwt-key");

const app = express();

app.use(bodyParser.json());

// --- HELPERS ---

const create = (data, callback) => {
    db.query(
        `insert into user(email,level,password) values(?,?,?)`,
        [data.email, data.level, data.password],
        (error, results) => {
            if (error) {
                return callback(error);
            }
            return callback(null, results);
        }
    );
};

const getUserByUserEmail = (email, callback) => {
    db.query(
        `SELECT * FROM user WHERE email = ?`,
        [email],
        (error, results) => {
            if (error) {
                return callback(error);
            }
            return callback(null, results[0]);
        }
    );
};

// --- ROUTES ---

// CREATE USER
app.post("/newUser", (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);

    create(body, (err, results) => {
        if (err) {
            return res.status(500).json({
                success: 0,
                message: "Database connection error: " + err,
            });
        }
        return res.status(200).json({
            success: 1,
            data: results,
        });
    });
});

// LOGIN
app.post("/login", (req, res) => {
    const body = req.body;
    // Clean the email input for safety
    const cleanEmail = body.email.replace(/[&\/\\#,+()$~%'"*?|<>{}“]/g, '');

    getUserByUserEmail(cleanEmail, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Server Error");
        }
        if (!results) {
            return res.json({
                success: 0,
                data: "Invalid email or password"
            });
        }

        const result = compareSync(body.password, results.password);
        if (result) {
            results.password = undefined;
            const jsontoken = sign({ result: results }, jwtKey, {
                expiresIn: "1h"
            });

            // Update user token in DB
            db.query(
                `UPDATE user SET token = ? WHERE email = ?`,
                [jsontoken, body.email],
                (err, updateResult) => {
                    if (err) {
                        console.log("Error saving token: " + err);
                    }
                    return res.json({
                        success: 1,
                        message: "login successfully",
                        token: jsontoken
                    });
                }
            );
        } else {
            return res.json({
                success: 0,
                data: "Invalid email or password"
            });
        }
    });
});

// LOGOUT
app.put("/logout-uuid", (req, res) => {
    db.query(
        `UPDATE user SET token = ? WHERE email = ?`,
        [req.body.uuid, req.body.email],
        (err, result) => {
            if (err) {
                res.status(500).send("Setting logout token failed. " + err);
            } else {
                res.send("logout uuid saved.");
            }
        }
    );
});

// DELETE USER
app.delete("/delete-user/:email", checkToken, (req, res) => {
    db.query(
        "DELETE FROM user WHERE email = ?",
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

// EDIT USER LEVEL
app.put("/edit-level", checkToken, (req, res) => {
    db.query(
        `UPDATE user SET level = ? WHERE email = ?`,
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

// GET USER LEVEL
app.get("/level/:email", checkToken, (req, res) => {
    db.query(
        `SELECT level FROM user WHERE email = ?`,
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

// CHECK TOKEN / REFRESH
app.get("/check-token/:email", checkToken, (req, res) => {
    db.query(
        `SELECT token FROM user WHERE email = ?`,
        [req.params.email],
        (err, results) => {
            if (err) {
                console.log("check for token error: " + err);
                res.status(500).send(err);
            } else {
                res.send(results);
            }
        }
    );
});

// CHANGE PASSWORD
app.put("/change-password", checkToken, (req, res) => {
    const body = req.body;
    const salt = genSaltSync(10);
    body.password = hashSync(body.password, salt);

    db.query(
        `UPDATE user SET password = ? WHERE email = ?`,
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

// SERVER START
const PORT = process.env.PORT || 5000;
const ticketRouter = require("./routes/api/tickets");
app.use("/api/tickets", ticketRouter);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// 1. Get all employees
router.get("/all-employees", checkToken, (req, res) => {
    db.query("SELECT userName, userEmail, role FROM users", (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. Register a new worker
router.post("/register", checkToken, (req, res) => {
    const { userName, userEmail, role } = req.body;
    db.query(
        "INSERT INTO users (userName, userEmail, role) VALUES (?, ?, ?)",
        [userName, userEmail, role],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Worker registered!" });
        }
    );
});