const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "municipal_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection()
    .then(connection => {
        console.log("✅ Connected to MySQL database successfully!");
        connection.release();
    })
    .catch(err => {
        console.error("❌ Error connecting to MySQL database:", err.message);
    });

module.exports = db;