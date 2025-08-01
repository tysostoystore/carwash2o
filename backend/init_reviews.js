// Script to add reviews table to SQLite DB
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/carwash.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT,
    photo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  console.log('Reviews table created');
  db.close();
});
