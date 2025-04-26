import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../../database.sqlite");

// Delete existing database file if it exists
if (fs.existsSync(dbPath)) {
  console.log("Deleting existing database file...");
  fs.unlinkSync(dbPath);
  console.log("Database file deleted.");
}

// Create new database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error creating new database:", err.message);
  } else {
    console.log("Created new SQLite database.");
  }
});

// Create tables
db.serialize(() => {
  console.log("Creating users table...");
  db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT
        )
    `);

  console.log("Creating emails table with all required columns...");
  db.run(`
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            sender TEXT,
            subject TEXT,
            body TEXT,
            received_at DATETIME,
            folder TEXT DEFAULT 'INBOX',
            message_id TEXT,
            html TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

  console.log("Creating user_style_profiles table...");
  db.run(`
        CREATE TABLE IF NOT EXISTS user_style_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            common_phrases TEXT,
            tone_score REAL,
            formality_score REAL,
            avg_sentence_length REAL,
            greeting_style TEXT,
            signature TEXT,
            style_data TEXT,
            last_updated DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

  // Insert a test user
  console.log("Creating test user...");
  db.run(`
        INSERT INTO users (id, email, name, access_token, refresh_token)
        VALUES (1, 'test@example.com', 'Test User', 'test-token', 'test-refresh-token')
    `);

  console.log("Database setup complete!");

  // Close database connection
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log(
        "Database connection closed. You can now restart your application."
      );
    }
  });
});
