import db from "../config/db.js";

// Save an email to the database
export const saveEmail = (userId, sender, subject, body, receivedAt) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO emails (user_id, sender, subject, body, received_at) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, sender, subject, body, receivedAt],
            function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, sender, subject, body, receivedAt });
            }
        );
    });
};

// Get all emails for a user
export const getEmailsByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM emails WHERE user_id = ? ORDER BY received_at DESC`, [userId], (err, rows) => {
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
