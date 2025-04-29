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

// Remove an email from a custom folder (move it back to INBOX)
export const removeEmailFromFolder = (emailId, folder = null) => {
  return new Promise((resolve, reject) => {
    // First, verify the email exists and get its current folder
    db.get(
      `SELECT folder, user_id FROM emails WHERE id = ?`,
      [emailId],
      (err, row) => {
        if (err) {
          console.error("Error checking email existence:", err);
          reject(err);
          return;
        }

        if (!row) {
          reject(new Error("Email not found"));
          return;
        }

        // If folder is specified, make sure the email is in that folder
        if (folder && row.folder !== folder) {
          reject(new Error(`Email is not in folder '${folder}'`));
          return;
        }

        // Update the folder to INBOX
        db.run(
          `UPDATE emails SET folder = 'INBOX' WHERE id = ?`,
          [emailId],
          function (err) {
            if (err) {
              console.error("Error moving email to INBOX:", err);
              reject(err);
              return;
            }

            if (this.changes === 0) {
              reject(new Error("Email not found or no changes made"));
            } else {
              resolve({
                id: emailId,
                folder: "INBOX",
                previousFolder: row.folder,
                message: "Email removed from folder successfully",
              });
            }
          }
        );
      }
    );
  });
};

// Delete a custom folder
export const deleteCustomFolder = (userId, folderName) => {
  return new Promise((resolve, reject) => {
    // Start a transaction to ensure atomicity
    db.run("BEGIN TRANSACTION", (err) => {
      if (err) {
        console.error("MODEL: Error starting transaction:", err);
        reject(err);
        return;
      }

      // Check if the folder exists
      db.get(
        `SELECT id FROM custom_folders WHERE user_id = ? AND folder_name = ?`,
        [userId, folderName],
        (err, row) => {
          if (err) {
            db.run("ROLLBACK");
            console.error("MODEL: Error checking folder existence:", err);
            reject(err);
            return;
          }

          console.log(`MODEL: Folder check result:`, row);

          if (!row) {
            db.run("ROLLBACK");
            console.error(
              `MODEL: Folder not found: "${folderName}" for user ${userId}`
            );
            reject(new Error("Folder not found"));
            return;
          }

          // Move all emails in this folder back to INBOX
          console.log(
            `MODEL: Moving emails from folder "${folderName}" to INBOX`
          );
          db.run(
            `UPDATE emails SET folder = 'INBOX' WHERE user_id = ? AND folder = ?`,
            [userId, folderName],
            function (updateErr) {
              if (updateErr) {
                db.run("ROLLBACK");
                console.error("MODEL: Error updating emails:", updateErr);
                reject(updateErr);
                return;
              }

              const emailsMoved = this.changes;
              console.log(`MODEL: Moved ${emailsMoved} emails to INBOX`);

              // Delete the folder from custom_folders table
              console.log(
                `MODEL: Deleting folder "${folderName}" from database`
              );
              db.run(
                `DELETE FROM custom_folders WHERE user_id = ? AND folder_name = ?`,
                [userId, folderName],
                function (deleteErr) {
                  if (deleteErr) {
                    db.run("ROLLBACK");
                    console.error("MODEL: Error deleting folder:", deleteErr);
                    reject(deleteErr);
                    return;
                  }

                  const deletedCount = this.changes;
                  console.log(`MODEL: Deleted ${deletedCount} folder records`);

                  if (deletedCount === 0) {
                    db.run("ROLLBACK");
                    console.error(
                      `MODEL: Failed to delete folder: "${folderName}"`
                    );
                    reject(new Error("Failed to delete folder"));
                    return;
                  }

                  // Commit the transaction
                  console.log("MODEL: Committing transaction");
                  db.run("COMMIT", (commitErr) => {
                    if (commitErr) {
                      db.run("ROLLBACK");
                      console.error(
                        "MODEL: Error committing transaction:",
                        commitErr
                      );
                      reject(commitErr);
                      return;
                    }

                    console.log(
                      `MODEL: Successfully deleted folder "${folderName}"`
                    );
                    resolve({
                      folder: folderName,
                      emailsMoved: emailsMoved,
                      message: "Folder deleted successfully",
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};
