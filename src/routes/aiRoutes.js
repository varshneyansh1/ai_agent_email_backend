import express from "express";
import responseGeneratorService from "../services/responseGeneratorService.js";
import styleAnalyzerService from "../services/styleAnalyzerService.js";
import { getStyleProfile } from "../models/userStyleProfileModel.js";
import { getEmailsByUser, saveEmail } from "../models/emailModel.js";
import voiceReplyService from "../services/voiceReplyService.js";

const router = express.Router();

/**
 * Generate an AI response to an email
 * POST /ai/generate-response
 * Accepts email content and user ID, returns a styled response
 */
router.post("/generate-response", async (req, res) => {
  try {
    const { emailContent, userId } = req.body;

    // Validate required fields
    if (!emailContent) {
      return res.status(400).json({ error: "Email content is required" });
    }

    // Default to user ID 1 if not provided (for testing)
    const userIdToUse = userId || 1;

    // Generate the response
    const response = await responseGeneratorService.generateResponse(
      userIdToUse,
      emailContent
    );

    res.json({
      message: "Response generated successfully",
      response: response.response,
      confidence: response.confidence,
    });
  } catch (error) {
    console.error("Error generating AI response:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Intelligent Reply Endpoint - Handles the entire workflow for intelligent email replies
 * POST /ai/intelligent-reply
 * Accepts either:
 * 1. emailId for emails already in the database, or
 * 2. emailContent and emailData for direct replies without saving
 */
router.post("/intelligent-reply", async (req, res) => {
  try {
    const {
      emailId,
      userId,
      forceStyleUpdate = false,
      emailContent,
      emailData,
    } = req.body;

    // Default to user ID 1 if not provided (for testing)
    const userIdToUse = userId || 1;

    // 1. Always analyze style before generating a response
    // This will automatically fetch emails from sent folder when needed
    try {
      console.log(`Analyzing writing style for user ${userIdToUse}...`);
      const styleProfile = await styleAnalyzerService.analyzeUserStyle(
        userIdToUse
      );
      console.log(
        `Style profile ${
          styleProfile ? "created/updated" : "failed to create"
        } for user ${userIdToUse}`
      );
    } catch (error) {
      console.warn(
        `Style analysis error, continuing with default style: ${error.message}`
      );
      // Continue even if style analysis fails - we'll use default style
    }

    // Process direct email content if provided instead of database ID
    if (emailContent && emailData) {
      console.log("Processing direct email content without database lookup");

      // Extract metadata from provided email data
      const originalSender = emailData.from || "unknown@example.com";
      const originalSubject = emailData.subject || "No Subject";

      // Prepare reply subject (add Re: if not already present)
      const replySubject = originalSubject.startsWith("Re:")
        ? originalSubject
        : `Re: ${originalSubject}`;

      // Generate an AI response with user's style
      const response = await responseGeneratorService.generateResponse(
        userIdToUse,
        emailContent
      );

      // Optionally save the email to database for future reference
      let savedEmailId = null;
      try {
        const savedEmail = await saveEmail(
          userIdToUse,
          originalSender,
          originalSubject,
          emailContent,
          new Date(emailData.date || Date.now())
        );
        savedEmailId = savedEmail.id;
        console.log(
          `Email automatically saved to database with ID: ${savedEmailId}`
        );
      } catch (saveError) {
        console.warn(`Could not save email to database: ${saveError.message}`);
        // Continue even if save fails
      }

      // Return complete response with metadata for the frontend to use
      return res.json({
        message: "Intelligent reply generated successfully",
        reply: {
          to: originalSender,
          subject: replySubject,
          body: response.response,
          inReplyTo: savedEmailId,
          confidence: response.confidence,
          originalContent: emailContent,
        },
      });
    }

    // Validate required fields for database lookup path
    if (!emailId) {
      return res.status(400).json({
        error: "Either emailId or (emailContent + emailData) must be provided",
      });
    }

    // 2. Fetch the email content (the email being replied to) from database
    const emails = await getEmailsByUser(userIdToUse);
    const targetEmail = emails.find((email) => email.id === parseInt(emailId));

    if (!targetEmail) {
      return res.status(404).json({ error: "Email not found" });
    }

    // 3. Extract original email content and metadata for the reply
    const originalSubject = targetEmail.subject;
    const originalSender = targetEmail.sender;
    const originalContent = targetEmail.body;

    // Prepare reply subject (add Re: if not already present)
    const replySubject = originalSubject.startsWith("Re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    // 4. Generate an AI response with user's style
    const response = await responseGeneratorService.generateResponse(
      userIdToUse,
      originalContent
    );

    // 5. Return complete response with metadata for the frontend to use
    res.json({
      message: "Intelligent reply generated successfully",
      reply: {
        to: originalSender,
        subject: replySubject,
        body: response.response,
        inReplyTo: emailId,
        confidence: response.confidence,
        originalContent: originalContent,
      },
    });
  } catch (error) {
    console.error("Error generating intelligent reply:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Analyze a user's writing style
 * POST /ai/analyze-style
 * Analyzes emails from a user to create/update their style profile
 */
router.post("/analyze-style", async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Analyze the user's style
    const styleProfile = await styleAnalyzerService.analyzeUserStyle(userId);

    res.json({
      message: "Style analysis completed",
      styleProfile,
    });
  } catch (error) {
    console.error("Error analyzing writing style:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Get a user's style profile
 * GET /ai/style-profile/:userId
 * Returns the user's current style profile
 */
router.get("/style-profile/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const styleProfile = await getStyleProfile(userId);

    if (!styleProfile) {
      return res.status(404).json({ error: "Style profile not found" });
    }

    res.json(styleProfile);
  } catch (error) {
    console.error("Error fetching style profile:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Reply to Email by Sequence Number - One-step endpoint that fetches an email by sequence number
 * and generates an intelligent reply for it
 * POST /ai/reply-to-sequence
 * Accepts seqno (sequence number) from IMAP, userId, and email parameters
 */
router.post("/reply-to-sequence", async (req, res) => {
  try {
    const { seqno, userId, email: userEmail, limit = 50 } = req.body;

    // Validate required fields
    if (!seqno) {
      return res
        .status(400)
        .json({ error: "Email sequence number (seqno) is required" });
    }

    // Convert seqno to integer if it's a string
    const seqnoInt = parseInt(seqno, 10);
    if (isNaN(seqnoInt)) {
      return res
        .status(400)
        .json({ error: "Sequence number must be a valid integer" });
    }

    // Default to user ID 1 if not provided (for testing)
    const userIdToUse = userId || 1;
    const emailToUse = userEmail || process.env.EMAIL_USER;

    // Step 1: Fetch emails from inbox to find the target email
    console.log(
      `Fetching inbox for ${emailToUse} to find email with seqno ${seqnoInt}`
    );

    // Import the emailService dynamically to avoid circular dependencies
    const emailService = (await import("../services/emailService.js")).default;

    // Fetch a larger set of emails to ensure we find the one with the specified seqno
    const emails = await emailService.getInbox(
      emailToUse,
      "dummy-token",
      limit
    );
    console.log(`Successfully fetched ${emails.length} emails from inbox`);

    // Find the email with the matching sequence number
    const targetEmail = emails.find((email) => email.seqno === seqnoInt);

    if (!targetEmail) {
      return res.status(404).json({
        error: `Email with sequence number ${seqnoInt} not found in the most recent ${limit} emails`,
      });
    }

    console.log(`Found email with seqno ${seqnoInt}:`);
    console.log(`- From: ${targetEmail.from}`);
    console.log(`- Subject: ${targetEmail.subject}`);
    console.log(`- Date: ${targetEmail.date}`);

    // Step 2: Now use the intelligent-reply endpoint logic to generate a response
    // First analyze style
    try {
      console.log(`Analyzing writing style for user ${userIdToUse}...`);
      const styleProfile = await styleAnalyzerService.analyzeUserStyle(
        userIdToUse
      );
      console.log(
        `Style profile ${
          styleProfile ? "created/updated" : "failed to create"
        } for user ${userIdToUse}`
      );
    } catch (error) {
      console.warn(
        `Style analysis error, continuing with default style: ${error.message}`
      );
      // Continue even if style analysis fails - we'll use default style
    }

    // Extract email content and metadata
    const emailContent = targetEmail.body;
    const originalSender = targetEmail.from;
    const originalSubject = targetEmail.subject;
    const originalDate = targetEmail.date;

    // Prepare reply subject (add Re: if not already present)
    const replySubject = originalSubject.startsWith("Re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    // Generate the AI response
    const response = await responseGeneratorService.generateResponse(
      userIdToUse,
      emailContent
    );

    // Optionally save the email to database for future reference
    let savedEmailId = null;
    try {
      const savedEmail = await saveEmail(
        userIdToUse,
        originalSender,
        originalSubject,
        emailContent,
        new Date(originalDate || Date.now())
      );
      savedEmailId = savedEmail.id;
      console.log(
        `Email automatically saved to database with ID: ${savedEmailId}`
      );
    } catch (saveError) {
      console.warn(`Could not save email to database: ${saveError.message}`);
      // Continue even if save fails
    }

    // Return complete response with metadata for the frontend to use
    res.json({
      message: "Intelligent reply generated successfully",
      reply: {
        to: originalSender,
        subject: replySubject,
        body: response.response,
        inReplyTo: targetEmail.id, // Use original message ID for threading
        messageSeqNo: seqnoInt,
        databaseId: savedEmailId,
        confidence: response.confidence,
        originalContent: emailContent,
      },
    });
  } catch (error) {
    console.error("Error generating reply to sequence:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

/**
 * Generate a voice-instructed reply to an email
 * POST /ai/generate-voice-reply
 * Accepts email content, user instructions in any language, and user ID
 * Translates instructions if needed and generates a reply following those instructions
 */
// This endpoint is replaced by the new version below that uses seqno

/**
 * Voice Reply to Email by Sequence Number - One-step endpoint that fetches an email by sequence number
 * and generates a reply based on voice instructions in any language
 * POST /ai/generate-voice-reply
 * Accepts seqno (sequence number) from IMAP, instructions in any language, and user ID
 */
router.post("/generate-voice-reply", async (req, res) => {
  try {
    const {
      seqno,
      instructions,
      userId,
      email: userEmail,
      limit = 50,
    } = req.body;

    // Validate required fields
    if (!seqno) {
      return res
        .status(400)
        .json({ error: "Email sequence number (seqno) is required" });
    }

    if (!instructions) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    // Convert seqno to integer if it's a string
    const seqnoInt = parseInt(seqno, 10);
    if (isNaN(seqnoInt)) {
      return res
        .status(400)
        .json({ error: "Sequence number must be a valid integer" });
    }

    // Default to user ID 1 if not provided (for testing)
    const userIdToUse = userId || 1;
    const emailToUse = userEmail || process.env.EMAIL_USER;

    // Step 1: Fetch emails from inbox to find the target email
    console.log(
      `Fetching inbox for ${emailToUse} to find email with seqno ${seqnoInt}`
    );

    // Import the emailService dynamically to avoid circular dependencies
    const emailService = (await import("../services/emailService.js")).default;

    // Fetch a larger set of emails to ensure we find the one with the specified seqno
    const emails = await emailService.getInbox(
      emailToUse,
      "dummy-token",
      limit
    );
    console.log(`Successfully fetched ${emails.length} emails from inbox`);

    // Find the email with the matching sequence number
    const targetEmail = emails.find((email) => email.seqno === seqnoInt);

    if (!targetEmail) {
      return res.status(404).json({
        error: `Email with sequence number ${seqnoInt} not found in the most recent ${limit} emails`,
      });
    }

    console.log(`Found email with seqno ${seqnoInt}:`);
    console.log(`- From: ${targetEmail.from}`);
    console.log(`- Subject: ${targetEmail.subject}`);
    console.log(`- Date: ${targetEmail.date}`);

    // Extract email content and metadata
    const emailContent = targetEmail.body;
    const originalSender = targetEmail.from;
    const originalSubject = targetEmail.subject;
    const originalDate = targetEmail.date;

    // Prepare reply subject (add Re: if not already present)
    const replySubject = originalSubject.startsWith("Re:")
      ? originalSubject
      : `Re: ${originalSubject}`;

    // Generate the voice-instructed response
    const voiceReply = await voiceReplyService.generateVoiceReply(
      userIdToUse,
      emailContent,
      instructions
    );

    // Optionally save the email to database for future reference
    let savedEmailId = null;
    try {
      const savedEmail = await saveEmail(
        userIdToUse,
        originalSender,
        originalSubject,
        emailContent,
        new Date(originalDate || Date.now())
      );
      savedEmailId = savedEmail.id;
      console.log(
        `Email automatically saved to database with ID: ${savedEmailId}`
      );
    } catch (saveError) {
      console.warn(`Could not save email to database: ${saveError.message}`);
      // Continue even if save fails
    }

    // Return complete response with metadata for the frontend to use
    res.json({
      message: "Voice-instructed reply generated successfully",
      reply: {
        to: originalSender,
        subject: replySubject,
        body: voiceReply.response,
        inReplyTo: targetEmail.id, // Use original message ID for threading
        messageSeqNo: seqnoInt,
        databaseId: savedEmailId,
        confidence: voiceReply.confidence,
        originalContent: emailContent,
        instructionsLanguage: voiceReply.originalLanguage,
        wasTranslated: voiceReply.translatedInstructions !== null,
      },
    });
  } catch (error) {
    console.error("Error generating voice-instructed reply:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

export default router;
