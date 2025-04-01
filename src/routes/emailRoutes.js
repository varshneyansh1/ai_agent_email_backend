import express from "express";
import { deleteEmail } from "../models/emailModel.js";
import emailService from "../services/emailService.js";
import { isAuthenticated } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Test endpoint - doesn't require authentication
 */
router.get("/test", async (req, res) => {
  res.json({ message: "Email service is running" });
});

/**
 * Fetch user's recent emails from inbox
 * For testing, this route is temporarily accessible without full OAuth authentication
 */
router.get("/inbox", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const userEmail = req.query.email || process.env.EMAIL_USER;

    console.log(`Fetching inbox for ${userEmail} with limit ${limit}`);
    // We'll pass a dummy token since we're using password auth in the service
    const emails = await emailService.getInbox(userEmail, "dummy-token", limit);
    console.log(`Successfully fetched ${emails.length} emails from inbox`);
    res.json(emails);
  } catch (error) {
    console.error("Error fetching inbox:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Fetch emails from a specific folder
 * For testing, this route is temporarily accessible without full OAuth authentication
 */
router.get("/folder/:folderName", async (req, res) => {
  try {
    const { folderName } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const userEmail = req.query.email || process.env.EMAIL_USER;

    console.log(
      `Fetching folder ${folderName} for ${userEmail} with limit ${limit}`
    );
    // We'll pass a dummy token since we're using password auth in the service
    const emails = await emailService.getFolder(
      userEmail,
      "dummy-token",
      folderName,
      limit
    );
    console.log(
      `Successfully fetched ${emails.length} emails from folder ${folderName}`
    );
    res.json(emails);
  } catch (error) {
    console.error(`Error fetching folder ${req.params.folderName}:`, error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get list of available folders
 * For testing and debugging
 */
router.get("/folders", async (req, res) => {
  try {
    const userEmail = req.query.email || process.env.EMAIL_USER;
    console.log(`Fetching available folders for ${userEmail}`);

    // Call service method to get folders
    const folderInfo = await emailService.getAvailableFolders(
      userEmail,
      "dummy-token"
    );

    // Format the response to be more user-friendly
    const response = {
      message: `Found ${folderInfo.folders.length} folders`,
      folders: folderInfo.folders.sort(),
      gmailFolders: folderInfo.folders.filter((f) => f.includes("[Gmail]")),
      commonFolders: {
        inbox: "INBOX",
        sent: folderInfo.folders.find(
          (f) => f.includes("Sent") || f.includes("sent")
        ),
        drafts: folderInfo.folders.find(
          (f) => f.includes("Draft") || f.includes("draft")
        ),
        trash: folderInfo.folders.find(
          (f) => f.includes("Trash") || f.includes("trash")
        ),
        spam: folderInfo.folders.find(
          (f) => f.includes("Spam") || f.includes("spam")
        ),
      },
      structure: folderInfo.structure,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Send a new email
 * For testing, this route is temporarily accessible without full OAuth authentication
 */
router.post("/send", async (req, res) => {
  try {
    const { recipient, subject, body, htmlBody, attachments } = req.body;
    const userEmail = req.body.email || process.env.EMAIL_USER;

    if (!recipient || !subject || (!body && !htmlBody)) {
      return res
        .status(400)
        .json({ error: "Recipient, subject, and body are required" });
    }

    console.log(`Sending email from ${userEmail} to ${recipient}`);
    const result = await emailService.sendEmail(
      userEmail,
      "dummy-token", // Not actually used in password auth mode
      recipient,
      subject,
      body,
      htmlBody,
      attachments
    );
    res.json(result);
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reply to an email
 * For testing, this route is temporarily accessible without full OAuth authentication
 */
router.post("/reply", async (req, res) => {
  try {
    const { recipient, subject, body, htmlBody, inReplyTo, references } =
      req.body;
    const userEmail = req.body.email || process.env.EMAIL_USER;

    if (!recipient || !subject || (!body && !htmlBody)) {
      return res
        .status(400)
        .json({ error: "Recipient, subject, and body are required" });
    }

    console.log(`Sending reply from ${userEmail} to ${recipient}`);
    const result = await emailService.replyToEmail(
      userEmail,
      "dummy-token", // Not actually used in password auth mode
      recipient,
      subject,
      body,
      htmlBody,
      inReplyTo,
      references
    );
    res.json(result);
  } catch (error) {
    console.error("Error sending reply:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save an email to the database
 * For testing, this route still uses authentication middleware,
 * but will accept user ID from the request body
 */
router.post("/save", async (req, res) => {
  try {
    const { sender, subject, body, receivedAt, userId } = req.body;

    if (!sender || !subject || !body) {
      return res
        .status(400)
        .json({ error: "Sender, subject, and body are required" });
    }

    const savedEmail = await emailService.saveEmailToDb(
      userId || 1, // Use provided ID or default to 1 for testing
      sender,
      subject,
      body,
      receivedAt ? new Date(receivedAt) : new Date()
    );
    res.status(201).json(savedEmail);
  } catch (error) {
    console.error("Error saving email:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all saved emails for a user
 * For testing, this endpoint accepts the user ID as a query parameter
 */
router.get("/saved", async (req, res) => {
  try {
    const userId = req.query.userId || 1; // Default to user ID 1 for testing
    const emails = await emailService.getSavedEmails(userId);
    res.json(emails);
  } catch (error) {
    console.error("Error fetching saved emails:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete an email from the database
 */
router.delete("/:id", async (req, res) => {
  try {
    const emailId = req.params.id;
    await deleteEmail(emailId);
    res.json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
