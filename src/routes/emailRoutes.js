import express from "express";
import { deleteEmail } from "../models/emailModel.js";
import emailService from "../services/emailService.js";
import voiceSearchService from "../services/voiceSearchService.js";
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
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const userEmail = req.query.email || process.env.EMAIL_USER;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const saveToDb = req.query.saveToDb === "true";

    console.log(
      `Fetching inbox for ${userEmail} with limit ${limit} and page ${page}${
        saveToDb ? ", saving to DB" : ""
      }`
    );
    // We'll pass a dummy token since we're using password auth in the service
    const emails = await emailService.getInbox(
      userEmail,
      "dummy-token",
      limit,
      page,
      userId,
      saveToDb
    );
    console.log(`Successfully fetched ${emails.length} emails from inbox`);
    res.json({
      emails,
      page,
      limit,
      saved: saveToDb && userId ? true : false,
    });
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
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const userEmail = req.query.email || process.env.EMAIL_USER;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    const saveToDb = req.query.saveToDb === "true";

    console.log(
      `Fetching folder ${folderName} for ${userEmail} with limit ${limit} and page ${page}${
        saveToDb ? ", saving to DB" : ""
      }`
    );
    // We'll pass a dummy token since we're using password auth in the service
    const emails = await emailService.getFolder(
      userEmail,
      "dummy-token",
      folderName,
      limit,
      page,
      userId,
      saveToDb
    );
    console.log(
      `Successfully fetched ${emails.length} emails from folder ${folderName}`
    );
    res.json({
      emails,
      folder: folderName,
      page,
      limit,
      saved: saveToDb && userId ? true : false,
    });
  } catch (error) {
    console.error(`Error fetching folder ${req.params.folderName}:`, error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Search emails with various criteria
 * This route allows searching emails using keywords, date ranges, or other filters
 */
router.get("/search", async (req, res) => {
  try {
    const {
      keyword,
      startDate,
      endDate,
      sender,
      folder,
      limit = 20,
      searchLocal,
      userId,
    } = req.query;

    const userEmail = req.query.email || process.env.EMAIL_USER;

    console.log(`Searching emails for ${userEmail} with criteria:`, {
      keyword,
      startDate,
      endDate,
      sender,
      folder,
      limit,
      searchLocal: Boolean(searchLocal),
      userId,
    });

    // Convert query parameters to appropriate types
    const searchOptions = {
      keyword,
      startDate,
      endDate,
      sender,
      folder,
      limit: parseInt(limit),
      searchLocal: Boolean(searchLocal),
      userId: userId ? parseInt(userId) : undefined,
    };

    // Call the search method from the service
    const emails = await emailService.searchEmails(
      userEmail,
      "dummy-token", // Not actually used in password auth mode
      searchOptions
    );

    console.log(`Search returned ${emails.length} results`);
    res.json(emails);
  } catch (error) {
    console.error("Error searching emails:", error);
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
 *
 * Attachments should be provided as an array of objects with the following structure:
 * [
 *   {
 *     filename: 'attachment1.pdf',
 *     content: '<base64-encoded-content>', // Or path, buffer, or stream
 *     encoding: 'base64',                  // Optional if using path
 *     contentType: 'application/pdf'       // Optional MIME type
 *   }
 * ]
 *
 * The attachments array supports various formats:
 * - {filename, content}: Basic attachment with filename and content
 * - {path}: Direct file path to attachment
 * - {filename, content, contentType}: With specific MIME type
 * - {filename, content, encoding}: With specific encoding (e.g. 'base64')
 * - {raw}: Raw attachment content as RFC822 message
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

    console.log(
      `Sending email from ${userEmail} to ${recipient}${
        attachments ? ` with ${attachments.length} attachment(s)` : ""
      }`
    );
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

/**
 * Search emails using voice/natural language instructions
 * This endpoint accepts natural language search instructions and returns matching emails
 */
router.post("/voice-search", async (req, res) => {
  try {
    const { voiceText, userId, searchLocal = false } = req.body;

    const userEmail = req.body.email || process.env.EMAIL_USER;

    // Validate required parameters
    if (!voiceText) {
      return res.status(400).json({ error: "Voice search text is required" });
    }

    console.log(`Processing voice search for ${userEmail}: "${voiceText}"`);

    // Process the voice search instruction
    const searchResults = await voiceSearchService.searchByVoiceInstruction(
      userEmail,
      "dummy-token", // Not actually used in password auth mode
      voiceText,
      userId ? parseInt(userId) : null,
      searchLocal === true
    );

    console.log(`Voice search returned ${searchResults.count} results`);
    res.json(searchResults);
  } catch (error) {
    console.error("Error processing voice search:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Search emails from the database by folder
 * This allows retrieving emails previously saved to the database
 */
router.get("/db-folder/:folderName", async (req, res) => {
  try {
    const { folderName } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 1; // Default to user ID 1 for testing

    console.log(
      `Fetching emails from database folder ${folderName} for user ${userId}`
    );
    const emails = await emailService.getEmailsByFolder(userId, folderName);
    res.json({
      folder: folderName,
      emails: emails,
      count: emails.length,
    });
  } catch (error) {
    console.error(
      `Error fetching database folder ${req.params.folderName}:`,
      error
    );
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get all custom folders for a user
 * Returns a list of folders created by the user
 */
router.get("/custom-folders", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 1; // Default to user ID 1 for testing

    console.log(`Fetching custom folders for user ${userId}`);
    const folders = await emailService.getUserFolders(userId);
    res.json({
      message: `Found ${folders.length} folders for user ${userId}`,
      folders,
    });
  } catch (error) {
    console.error("Error fetching custom folders:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Create a new custom folder
 * This endpoint creates a new folder for organizing emails
 */
router.post("/custom-folders", async (req, res) => {
  try {
    const { folderName } = req.body;
    const userId = req.body.userId || 1; // Default to user ID 1 for testing

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    console.log(`Creating custom folder "${folderName}" for user ${userId}`);
    const result = await emailService.createCustomFolder(userId, folderName);
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating custom folder:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Move an email to a folder
 * This endpoint moves an existing email to a different folder
 */
router.put("/move-to-folder/:emailId", async (req, res) => {
  try {
    const { emailId } = req.params;
    const { folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    console.log(`Moving email ${emailId} to folder "${folderName}"`);
    const result = await emailService.moveEmailToFolder(emailId, folderName);
    res.json(result);
  } catch (error) {
    console.error("Error moving email to folder:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Move an email to a folder using sequence number
 * This endpoint moves an existing email to a different folder using sequence number
 */
router.put("/move-to-folder-by-seq/:seq", async (req, res) => {
  try {
    const seq = parseInt(req.params.seq);
    const { folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    console.log(`Moving email with sequence ${seq} to folder "${folderName}"`);
    const result = await emailService.moveEmailToFolder(seq, folderName);
    res.json(result);
  } catch (error) {
    console.error("Error moving email to folder:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get all distinct folders saved in the database for a user
 * This helps the frontend know which folders contain saved emails
 */
router.get("/saved-folders", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId) : 1; // Default to user 1 for testing

    console.log(`Getting saved folders for user ${userId}`);

    const folders = await emailService.getSavedFolders(userId);

    console.log(`Found ${folders.length} distinct folders for user ${userId}`);

    res.json({
      userId,
      folders,
      count: folders.length,
    });
  } catch (error) {
    console.error("Error getting saved folders:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Remove an email from a custom folder
router.post("/remove-from-folder", async (req, res) => {
  try {
    const { id, folder } = req.body; // Get both email ID and folder name
    if (!id || !folder) {
      return res
        .status(400)
        .json({ error: "Email ID and folder name are required" });
    }
    const result = await emailService.removeEmailFromFolder(id, folder);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a custom folder
router.delete("/custom-folder/:folderName/:userId", async (req, res) => {
  try {
    const { folderName, userId } = req.params;
    const parsedUserId = parseInt(userId);

    if (!folderName || !parsedUserId) {
      return res
        .status(400)
        .json({ error: "Folder name and user ID are required" });
    }

    console.log(
      `Attempting to delete folder "${folderName}" for user ${parsedUserId}`
    );

    // Validate that the folder is not a system folder
    const systemFolders = ["INBOX", "SENT", "DRAFTS", "TRASH", "SPAM"];
    if (systemFolders.includes(folderName.toUpperCase())) {
      return res.status(400).json({ error: "Cannot delete system folders" });
    }

    const result = await emailService.deleteCustomFolder(
      parsedUserId,
      folderName
    );

    if (result && result.message === "Folder deleted successfully") {
      res.json({
        success: true,
        message: "Folder deleted successfully",
        folder: folderName,
        emailsMoved: result.emailsMoved,
      });
    } else {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  } catch (error) {
    console.error("Error deleting custom folder:", error);
    res.status(500).json({ error: error.message });
  }
});

// Also keep the original endpoint for backward compatibility
router.delete("/custom-folder", async (req, res) => {
  try {
    const { folderName, userId } = req.body;

    if (!folderName || !userId) {
      return res
        .status(400)
        .json({ error: "Folder name and user ID are required" });
    }

    // Validate that the folder is not a system folder
    const systemFolders = ["INBOX", "SENT", "DRAFTS", "TRASH", "SPAM"];
    if (systemFolders.includes(folderName.toUpperCase())) {
      return res.status(400).json({ error: "Cannot delete system folders" });
    }

    const result = await emailService.deleteCustomFolder(userId, folderName);

    if (result && result.message === "Folder deleted successfully") {
      res.json({
        success: true,
        message: "Folder deleted successfully",
        folder: folderName,
        emailsMoved: result.emailsMoved,
      });
    } else {
      res.status(500).json({ error: "Failed to delete folder" });
    }
  } catch (error) {
    console.error("Error deleting custom folder:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
