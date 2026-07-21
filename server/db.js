const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool to MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error connecting to MySQL database:', err.message);
  } else {
    console.log('✅ Connected to MySQL database: municipal_db');
    connection.release();
  }
});

module.exports = pool.promise();