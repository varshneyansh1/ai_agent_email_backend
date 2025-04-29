import db from "../config/db.js";

// Save an email to the database
export const saveEmail = (
  userId,
  sender,
  subject,
  body,
  receivedAt,
  folder = "INBOX",
  messageId = null,
  html = null
) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO emails (user_id, sender, subject, body, received_at, folder, message_id, html) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, sender, subject, body, receivedAt, folder, messageId, html],
      function (err) {
        if (err) reject(err);
        else
          resolve({
            id: this.lastID,
            user_id: userId,
            sender,
            subject,
            body,
            received_at: receivedAt,
            folder,
            message_id: messageId,
            html,
          });
      }
    );
  });
};

// Get all emails for a user
export const getEmailsByUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM emails WHERE user_id = ? ORDER BY received_at DESC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

// Search emails for a user with various filters
export const searchEmails = (userId, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      keyword,
      startDate,
      endDate,
      sender,
      folder,
      limit = 50,
      offset = 0,
    } = options;

    let query = `SELECT * FROM emails WHERE user_id = ?`;
    const params = [userId];

    // Add keyword search for subject and body
    if (keyword) {
      query += ` AND (subject LIKE ? OR body LIKE ? OR sender LIKE ?)`;
      const searchTerm = `%${keyword}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add date range filters
    if (startDate) {
      query += ` AND received_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND received_at <= ?`;
      params.push(endDate);
    }

    // Add sender filter
    if (sender) {
      query += ` AND sender LIKE ?`;
      params.push(`%${sender}%`);
    }

    // Add folder filter
    if (folder) {
      query += ` AND folder = ?`;
      params.push(folder);
    }

    // Add order by and limit
    query += ` ORDER BY received_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Delete an email
export const deleteEmail = (emailId) => {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM emails WHERE id = ?`, [emailId], function (err) {
      if (err) reject(err);
      else resolve({ message: "Email deleted successfully" });
    });
  });
};

// Get all distinct folders for a user
export const getDistinctFoldersByUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT folder FROM emails 
       WHERE user_id = ? 
       ORDER BY folder ASC`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else {
          // Extract just the folder names from the rows
          const folders = rows.map((row) => row.folder);
          resolve(folders);
        }
      }
    );
  });
};

// Update the folder for an email
export const updateEmailFolder = (emailId, folderName) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE emails SET folder = ? WHERE id = ?`,
      [folderName, emailId],
      function (err) {
        if (err) reject(err);
        else {
          if (this.changes === 0) {
            reject(new Error("Email not found or no changes made"));
          } else {
            resolve({
              id: emailId,
              folder: folderName,
              message: "Email moved successfully",
            });
          }
        }
      }
    );
  });
};

// Create a custom folder
export const createCustomFolder = (userId, folderName) => {
  // Since folders in this system are just labels stored with emails,
  // we'll just verify the folder name is valid and return a success response
  // The folder will be created when the first email is moved to it
  return new Promise((resolve, reject) => {
    if (!folderName || folderName.trim() === "") {
      reject(new Error("Folder name cannot be empty"));
      return;
    }

    // Create a custom_folders table if it doesn't exist
    db.run(
      `
      CREATE TABLE IF NOT EXISTS custom_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        folder_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, folder_name)
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating custom_folders table:", err);
          reject(err);
          return;
        }

        // Insert the new folder name for the user
        db.run(
          `INSERT INTO custom_folders (user_id, folder_name) VALUES (?, ?)`,
          [userId, folderName],
          function (err) {
            if (err) {
              // If error is due to unique constraint, folder already exists
              if (err.message.includes("UNIQUE constraint failed")) {
                reject(new Error("Folder already exists"));
              } else {
                console.error("Error inserting custom folder:", err);
                reject(err);
              }
            } else {
              resolve({
                id: this.lastID,
                user_id: userId,
                folder: folderName,
                message: "Folder created successfully",
              });
            }
          }
        );
      }
    );
  });
};

// Get all custom folders for a user
export const getCustomFolders = (userId) => {
  return new Promise((resolve, reject) => {
    // Create a custom_folders table if it doesn't exist
    db.run(
      `
      CREATE TABLE IF NOT EXISTS custom_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        folder_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, folder_name)
      )
    `,
      (err) => {
        if (err) {
          console.error("Error creating custom_folders table:", err);
          reject(err);
          return;
        }

        // Get all folders from the custom_folders table
        db.all(
          `SELECT folder_name FROM custom_folders WHERE user_id = ? ORDER BY folder_name ASC`,
          [userId],
          (err, customFolders) => {
            if (err) {
              reject(err);
              return;
            }

            // Also get folders that actually have emails in them
            getDistinctFoldersByUser(userId)
              .then((emailFolders) => {
                // Combine both lists and remove duplicates
                const customFolderNames = customFolders.map(
                  (f) => f.folder_name
                );
                const allFolders = [
                  ...new Set([...customFolderNames, ...emailFolders]),
                ];
                resolve(allFolders.sort());
              })
              .catch((err) => reject(err));
          }
        );
      }
    );
  });
};
