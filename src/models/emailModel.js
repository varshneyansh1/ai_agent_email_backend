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
