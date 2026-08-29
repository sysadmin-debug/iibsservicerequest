const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create Users table
    // Using employeeNo or cardNo as the primary identifier (which comes from Hikvision)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeNo TEXT UNIQUE,
        name TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Coupons table
    // Records when a user gets a coupon. We can use this to check for 1-per-day limit
    db.run(`CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeNo TEXT,
        issuedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        mealType TEXT
    )`);
});

// Helper functions
const canGetCoupon = (employeeNo, mealType) => {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        const query = `
            SELECT count(*) as count 
            FROM coupons 
            WHERE employeeNo = ? AND date(issuedAt) = ? AND mealType = ?
        `;
        db.get(query, [employeeNo, today, mealType], (err, row) => {
            if (err) return reject(err);
            resolve(row.count === 0);
        });
    });
};

const issueCoupon = (employeeNo, mealType) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO coupons (employeeNo, mealType) VALUES (?, ?)`;
        db.run(query, [employeeNo, mealType], function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
    });
};

const getTodayCoupons = () => {
    return new Promise((resolve, reject) => {
        const today = new Date().toISOString().split('T')[0];
        const query = `
            SELECT c.id, c.employeeNo, u.name, c.issuedAt, c.mealType
            FROM coupons c
            LEFT JOIN users u ON c.employeeNo = u.employeeNo
            WHERE date(c.issuedAt) = ?
            ORDER BY c.issuedAt DESC
        `;
        db.all(query, [today], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

module.exports = {
    db,
    canGetCoupon,
    issueCoupon,
    getTodayCoupons
};
