import { fetchEmails, fetchEmailsFromFolder } from "./imapService.js";
import { sendEmail, sendHtmlEmail, sendReply } from "./smtpService.js";
import { saveEmail, getEmailsByUser } from "../models/emailModel.js";
import Imap from "imap";
import dotenv from "dotenv";

dotenv.config();

/**
 * Provides a unified interface for email operations
 */
class EmailService {
  /**
   * Fetch recent emails from user's inbox
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {number} limit - Maximum number of emails to fetch
   * @returns {Promise<Array>} - Array of email objects
   */
  async getInbox(userEmail, accessToken, limit = 10) {
    try {
      const emails = await fetchEmails(userEmail, accessToken, limit);
      return emails;
    } catch (error) {
      console.error("Error fetching inbox:", error);
      throw new Error(`Failed to fetch inbox: ${error.message}`);
    }
  }

  /**
   * Fetch emails from a specific folder
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {string} folder - Folder name
   * @param {number} limit - Maximum number of emails to fetch
   * @returns {Promise<Array>} - Array of email objects
   */
  async getFolder(userEmail, accessToken, folder, limit = 10) {
    try {
      const emails = await fetchEmailsFromFolder(
        userEmail,
        accessToken,
        folder,
        limit
      );
      return emails;
    } catch (error) {
      console.error(`Error fetching folder ${folder}:`, error);
      throw new Error(`Failed to fetch folder ${folder}: ${error.message}`);
    }
  }

  /**
   * Send a new email
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Plain text body
   * @param {string} htmlBody - HTML body (optional)
   * @param {Array} attachments - Array of attachment objects (optional)
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendEmail(
    userEmail,
    accessToken,
    to,
    subject,
    body,
    htmlBody = null,
    attachments = []
  ) {
    try {
      const result = await sendEmail(
        userEmail,
        accessToken,
        to,
        subject,
        body,
        htmlBody,
        attachments
      );

      // Save the sent email to the database if needed
      // await saveEmail(userId, userEmail, to, subject, body, new Date());

      return result;
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send an HTML email
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} textBody - Plain text body
   * @param {string} htmlBody - HTML body
   * @param {Array} attachments - Array of attachment objects (optional)
   * @returns {Promise<Object>} - Result of the send operation
   */
  async sendHtmlEmail(
    userEmail,
    accessToken,
    to,
    subject,
    textBody,
    htmlBody,
    attachments = []
  ) {
    try {
      return await sendHtmlEmail(
        userEmail,
        accessToken,
        to,
        subject,
        textBody,
        htmlBody,
        attachments
      );
    } catch (error) {
      console.error("Error sending HTML email:", error);
      throw new Error(`Failed to send HTML email: ${error.message}`);
    }
  }

  /**
   * Reply to an email
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {string} htmlBody - HTML body (optional)
   * @param {string} inReplyTo - Message ID being replied to
   * @param {string} references - References for email threading
   * @returns {Promise<Object>} - Result of the send operation
   */
  async replyToEmail(
    userEmail,
    accessToken,
    to,
    subject,
    body,
    htmlBody = null,
    inReplyTo = null,
    references = null
  ) {
    try {
      return await sendReply(
        userEmail,
        accessToken,
        to,
        subject,
        body,
        htmlBody,
        inReplyTo,
        references
      );
    } catch (error) {
      console.error("Error sending reply:", error);
      throw new Error(`Failed to send reply: ${error.message}`);
    }
  }

  /**
   * Save an email to the database
   * @param {number} userId - User ID
   * @param {string} sender - Sender email address
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {Date} receivedAt - Date when email was received
   * @returns {Promise<Object>} - Saved email object
   */
  async saveEmailToDb(userId, sender, subject, body, receivedAt = new Date()) {
    try {
      return await saveEmail(userId, sender, subject, body, receivedAt);
    } catch (error) {
      console.error("Error saving email to database:", error);
      throw new Error(`Failed to save email: ${error.message}`);
    }
  }

  /**
   * Get all emails saved for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of saved email objects
   */
  async getSavedEmails(userId) {
    try {
      return await getEmailsByUser(userId);
    } catch (error) {
      console.error("Error getting saved emails:", error);
      throw new Error(`Failed to get saved emails: ${error.message}`);
    }
  }

  /**
   * Get a list of available folders/mailboxes for a user
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token (not used in password auth)
   * @returns {Promise<Object>} - Object containing folder structure
   */
  async getAvailableFolders(userEmail, accessToken) {
    return new Promise((resolve, reject) => {
      const imapConfig = {
        user: process.env.EMAIL_USER || userEmail,
        password: process.env.EMAIL_PASS,
        host: "imap.gmail.com",
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      };

      console.log("Connecting to IMAP to list folders for:", imapConfig.user);

      const imap = new Imap(imapConfig);

      // Helper function to simplify mailbox structure (remove circular references)
      const simplifyMailboxes = (boxes) => {
        const result = {};

        Object.keys(boxes).forEach((boxName) => {
          const box = boxes[boxName];

          result[boxName] = {
            attribs: box.attribs,
            delimiter: box.delimiter,
          };

          if (box.children && Object.keys(box.children).length > 0) {
            result[boxName].children = simplifyMailboxes(box.children);
          }
        });

        return result;
      };

      imap.once("ready", function () {
        imap.getBoxes((err, boxes) => {
          imap.end();

          if (err) {
            console.error("Error fetching mailboxes:", err);
            return reject(new Error(`Failed to fetch folders: ${err.message}`));
          }

          console.log("Retrieved folder list successfully");

          // Create an array of folder paths for easier consumption
          const folderPaths = [];

          // Helper function to flatten folder hierarchy into paths
          const processFolders = (boxesObj, prefix = "") => {
            Object.keys(boxesObj).forEach((name) => {
              const fullPath = prefix ? `${prefix}${name}` : name;
              folderPaths.push(fullPath);

              if (boxesObj[name].children) {
                const newPrefix = `${fullPath}${boxesObj[name].delimiter}`;
                processFolders(boxesObj[name].children, newPrefix);
              }
            });
          };

          processFolders(boxes);

          // Return both the simplified structure and the flat list
          resolve({
            structure: simplifyMailboxes(boxes),
            folders: folderPaths,
          });
        });
      });

      imap.once("error", function (err) {
        console.error("IMAP error while listing folders:", err);
        reject(new Error(`IMAP connection error: ${err.message}`));
      });

      imap.connect();
    });
  }

  /**
   * Fetch sent emails for style analysis
   * @param {number} userId - User ID
   * @param {number} limit - Maximum number of emails to fetch
   * @returns {Promise<Array>} - Array of sent email objects
   */
  async getSentEmailsForStyleAnalysis(userId, limit = 20) {
    try {
      // In a production environment, you would fetch from "[Gmail]/Sent Mail" folder
      // For this demo, we'll use the emails stored in the database

      // 1. Try to get emails from database first (faster)
      const savedEmails = await getEmailsByUser(userId);

      // 2. For a real implementation, you would also fetch emails from the sent folder
      // This would require:
      // - Get the user's email from database
      // - Connect to their email account
      // - Fetch emails from sent folder
      // - Combine with saved emails

      // For now, return what we have in the database
      return savedEmails.slice(0, limit);
    } catch (error) {
      console.error("Error fetching sent emails for style analysis:", error);
      throw new Error(`Failed to fetch sent emails: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new EmailService();
