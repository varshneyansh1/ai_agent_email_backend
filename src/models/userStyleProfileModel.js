import db from "../config/db.js";

/**
 * Retrieve a user's style profile from the database
 * @param {number} userId - User ID
 * @returns {Promise<Object>} - User's style profile
 */
export const getStyleProfile = (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM user_style_profiles WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) reject(err);
        else {
          if (row) {
            // Parse JSON fields
            if (row.common_phrases) {
              row.common_phrases = JSON.parse(row.common_phrases);
            }
            if (row.style_data) {
              row.style_data = JSON.parse(row.style_data);
            }
          }
          resolve(row || null);
        }
      }
    );
  });
};

/**
 * Save or update a user's style profile
 * @param {number} userId - User ID
 * @param {Object} styleData - Style profile data
 * @returns {Promise<Object>} - Updated style profile
 */
export const saveStyleProfile = (userId, styleData) => {
  const {
    common_phrases = [],
    tone_score = 0,
    formality_score = 0,
    avg_sentence_length = 0,
    greeting_style = "",
    signature = "",
    style_data = {},
  } = styleData;

  // Convert arrays and objects to JSON strings for storage
  const common_phrases_json = JSON.stringify(common_phrases);
  const style_data_json = JSON.stringify(style_data);

  return new Promise((resolve, reject) => {
    // Check if profile already exists
    db.get(
      `SELECT id FROM user_style_profiles WHERE user_id = ?`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        const now = new Date().toISOString();

        if (row) {
          // Update existing profile
          db.run(
            `UPDATE user_style_profiles 
             SET common_phrases = ?, 
                 tone_score = ?, 
                 formality_score = ?, 
                 avg_sentence_length = ?, 
                 greeting_style = ?, 
                 signature = ?, 
                 style_data = ?,
                 last_updated = ?
             WHERE user_id = ?`,
            [
              common_phrases_json,
              tone_score,
              formality_score,
              avg_sentence_length,
              greeting_style,
              signature,
              style_data_json,
              now,
              userId,
            ],
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  id: row.id,
                  user_id: userId,
                  common_phrases,
                  tone_score,
                  formality_score,
                  avg_sentence_length,
                  greeting_style,
                  signature,
                  style_data,
                  last_updated: now,
                });
            }
          );
        } else {
          // Create new profile
          db.run(
            `INSERT INTO user_style_profiles 
             (user_id, common_phrases, tone_score, formality_score, avg_sentence_length, greeting_style, signature, style_data, last_updated)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              common_phrases_json,
              tone_score,
              formality_score,
              avg_sentence_length,
              greeting_style,
              signature,
              style_data_json,
              now,
            ],
            function (err) {
              if (err) reject(err);
              else
                resolve({
                  id: this.lastID,
                  user_id: userId,
                  common_phrases,
                  tone_score,
                  formality_score,
                  avg_sentence_length,
                  greeting_style,
                  signature,
                  style_data,
                  last_updated: now,
                });
            }
          );
        }
      }
    );
  });
};
