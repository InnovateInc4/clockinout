const mysql = require("mysql2");

const db = mysql.createPool({
    host: "127.0.0.1",              // Updated to match your Workbench IP
    user: "root", 
    password: "root",      // Put the password you use to log into Workbench here
    database: "workflowTaskmanager", 
    connectionLimit: 10
});

module.exports = db;