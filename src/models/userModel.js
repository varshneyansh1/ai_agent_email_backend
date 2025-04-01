import db from "../config/db.js";

// Create a new user or update tokens if user already exists
export const saveUser = (email, name, accessToken, refreshToken) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (email, name, access_token, refresh_token) 
             VALUES (?, ?, ?, ?) 
             ON CONFLICT(email) DO UPDATE SET access_token = excluded.access_token, refresh_token = excluded.refresh_token`,
            [email, name, accessToken, refreshToken],
            function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, email, name });
            }
        );
    });
};

// Get user by email
export const getUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Delete user (for account removal feature)
export const deleteUser = (email) => {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM users WHERE email = ?`, [email], function (err) {
            if (err) reject(err);
            else resolve({ message: "User deleted successfully" });
        });
    });
};