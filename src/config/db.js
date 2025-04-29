import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../../database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

// Check if a column exists in a table
const columnExists = (tableName, columnName) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Check if any row has the column name
        const exists = rows && rows.some((row) => row.name === columnName);
        resolve(exists);
      }
    });
  });
};

// Migrate database - add columns that don't exist
const migrateDatabase = async () => {
  try {
    console.log("Checking for database migrations...");

    // Check if emails table exists
    db.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='emails'",
      async (err, row) => {
        if (err) {
          console.error("Error checking for emails table:", err);
          return;
        }

        if (row) {
          console.log("Emails table exists, checking for missing columns...");

          // Check and add folder column if it doesn't exist
          const hasFolderColumn = await columnExists("emails", "folder");
          if (!hasFolderColumn) {
            console.log("Adding folder column to emails table...");
            db.run(
              "ALTER TABLE emails ADD COLUMN folder TEXT DEFAULT 'INBOX'",
              (err) => {
                if (err) console.error("Error adding folder column:", err);
                else console.log("Added folder column successfully");
              }
            );
          }

          // Check and add message_id column if it doesn't exist
          const hasMessageIdColumn = await columnExists("emails", "message_id");
          if (!hasMessageIdColumn) {
            console.log("Adding message_id column to emails table...");
            db.run("ALTER TABLE emails ADD COLUMN message_id TEXT", (err) => {
              if (err) console.error("Error adding message_id column:", err);
              else console.log("Added message_id column successfully");
            });
          }

          // Check and add html column if it doesn't exist
          const hasHtmlColumn = await columnExists("emails", "html");
          if (!hasHtmlColumn) {
            console.log("Adding html column to emails table...");
            db.run("ALTER TABLE emails ADD COLUMN html TEXT", (err) => {
              if (err) console.error("Error adding html column:", err);
              else console.log("Added html column successfully");
            });
          }
        }
      }
    );
  } catch (error) {
    console.error("Database migration error:", error);
  }
};

// Create tables
db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT
        )
    `);

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

  // User style profile table for storing writing style characteristics
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

  // Run migrations after creating tables
  migrateDatabase();
});

export default db;
