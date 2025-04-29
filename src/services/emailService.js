import { fetchEmails, fetchEmailsFromFolder } from "./imapService.js";
import { sendEmail, sendHtmlEmail, sendReply } from "./smtpService.js";
import {
  saveEmail,
  getEmailsByUser,
  searchEmails,
  getDistinctFoldersByUser,
  updateEmailFolder,
  createCustomFolder,
  getCustomFolders,
} from "../models/emailModel.js";
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
   * @param {number} page - Page number for pagination (default 1)
   * @param {number} userId - User ID to save emails to (optional)
   * @param {boolean} saveToDb - Whether to save emails to the database
   * @returns {Promise<Array>} - Array of email objects
   */
  async getInbox(
    userEmail,
    accessToken,
    limit = 10,
    page = 1,
    userId = null,
    saveToDb = false
  ) {
    try {
      const emails = await fetchEmails(
        userEmail,
        accessToken,
        limit,
        "INBOX",
        page
      );

      // If saveToDb flag is set and userId is provided, save emails to database
      if (saveToDb && userId) {
        console.log(
          `Saving ${emails.length} emails to database for user ${userId}`
        );

        // Process each email in sequence
        for (const email of emails) {
          try {
            // Skip if no sender or subject (invalid email)
            if (!email.from || !email.subject) {
              console.warn("Skipping invalid email without sender or subject");
              continue;
            }

            // Extract sender from email.from object
            const sender =
              email.from.text ||
              (email.from.address
                ? email.from.name
                  ? `${email.from.name} <${email.from.address}>`
                  : email.from.address
                : "Unknown Sender");

            // Save to database
            await this.saveEmailToDb(
              userId,
              sender,
              email.subject,
              email.body || email.snippet || "",
              email.date || new Date(),
              "INBOX",
              email.messageId,
              email.html
            );
          } catch (err) {
            console.error("Error saving individual email:", err);
            // Continue with next email even if one fails
          }
        }
      }

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
   * @param {number} page - Page number for pagination (default 1)
   * @param {number} userId - User ID to save emails to (optional)
   * @param {boolean} saveToDb - Whether to save emails to the database
   * @returns {Promise<Array>} - Array of email objects
   */
  async getFolder(
    userEmail,
    accessToken,
    folder,
    limit = 10,
    page = 1,
    userId = null,
    saveToDb = false
  ) {
    try {
      const emails = await fetchEmailsFromFolder(
        userEmail,
        accessToken,
        folder,
        limit,
        page
      );

      // If saveToDb flag is set and userId is provided, save emails to database
      if (saveToDb && userId) {
        console.log(
          `Saving ${emails.length} emails from folder ${folder} to database for user ${userId}`
        );

        // Process each email in sequence
        for (const email of emails) {
          try {
            // Skip if no sender or subject (invalid email)
            if (!email.from || !email.subject) {
              console.warn("Skipping invalid email without sender or subject");
              continue;
            }

            // Extract sender from email.from object
            const sender =
              email.from.text ||
              (email.from.address
                ? email.from.name
                  ? `${email.from.name} <${email.from.address}>`
                  : email.from.address
                : "Unknown Sender");

            // Save to database
            await this.saveEmailToDb(
              userId,
              sender,
              email.subject,
              email.body || email.snippet || "",
              email.date || new Date(),
              folder,
              email.messageId,
              email.html
            );
          } catch (err) {
            console.error("Error saving individual email:", err);
            // Continue with next email even if one fails
          }
        }
      }

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
   * @param {string} folder - Folder name (e.g. "INBOX", "[Gmail]/Sent Mail")
   * @param {string} messageId - Email Message-ID header
   * @param {string} html - HTML content of the email
   * @returns {Promise<Object>} - Saved email object
   */
  async saveEmailToDb(
    userId,
    sender,
    subject,
    body,
    receivedAt = new Date(),
    folder = "INBOX",
    messageId = null,
    html = null
  ) {
    try {
      return await saveEmail(
        userId,
        sender,
        subject,
        body,
        receivedAt,
        folder,
        messageId,
        html
      );
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
   * Search emails using various criteria
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {Object} searchOptions - Search options
   * @param {string} searchOptions.keyword - Keyword to search in subject, body, and sender
   * @param {string} searchOptions.startDate - Start date for date range filter (ISO format)
   * @param {string} searchOptions.endDate - End date for date range filter (ISO format)
   * @param {string} searchOptions.sender - Filter by sender email
   * @param {string} searchOptions.folder - Folder to search in (default: INBOX)
   * @param {number} searchOptions.limit - Maximum number of results (default: 20)
   * @param {boolean} searchOptions.searchLocal - Whether to search in local DB (default: false)
   * @param {number} searchOptions.userId - User ID (required if searchLocal is true)
   * @returns {Promise<Array>} - Array of email objects matching search criteria
   */
  async searchEmails(userEmail, accessToken, searchOptions = {}) {
    try {
      console.log(
        "Starting email search with options:",
        JSON.stringify(searchOptions, null, 2)
      );

      const {
        keyword,
        startDate,
        endDate,
        sender,
        folder = "INBOX",
        limit = 20,
        searchLocal = false,
        userId,
      } = searchOptions;

      // If searching locally in DB
      if (searchLocal && userId) {
        console.log("Searching emails in local database");
        return await searchEmails(userId, {
          keyword,
          startDate,
          endDate,
          sender,
          folder,
          limit,
        });
      }

      // For IMAP search, increase the fetch limit to ensure we get enough emails for filtering
      console.log(`Fetching emails from folder: ${folder}`);

      // Get a larger batch of emails to filter through - much larger than the final limit
      const fetchLimit = Math.max(limit * 5, 100);
      const emails = await fetchEmailsFromFolder(
        userEmail,
        accessToken,
        folder,
        fetchLimit
      );

      console.log(
        `Fetched ${emails ? emails.length : 0} emails from folder ${folder}`
      );

      // If no emails were fetched, return empty array
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        console.log("No emails fetched from IMAP server");
        return [];
      }

      // Apply client-side filtering
      let filteredEmails = emails;
      console.log(`Starting filtering with ${filteredEmails.length} emails`);

      // Debug email structure
      if (filteredEmails.length > 0) {
        const sampleEmail = filteredEmails[0];
        console.log(
          "Sample email structure:",
          JSON.stringify(
            {
              hasSubject: !!sampleEmail.subject,
              hasBody: !!sampleEmail.body,
              hasFrom: !!sampleEmail.from,
              fromStructure: sampleEmail.from
                ? Object.keys(sampleEmail.from)
                : null,
              hasText: sampleEmail.from ? !!sampleEmail.from.text : false,
              hasSender: !!sampleEmail.sender,
              hasDate: !!sampleEmail.date,
              dateFormat: sampleEmail.date ? typeof sampleEmail.date : null,
            },
            null,
            2
          )
        );
      }

      // Filter by keyword with more lenient matching
      if (keyword) {
        console.log(`Filtering by keyword: ${keyword}`);

        // Check if this is a complex query with subject: or body: specifications
        const isComplexQuery =
          searchOptions.complexQuery ||
          keyword.includes("subject:") ||
          keyword.includes("body:");

        if (isComplexQuery) {
          console.log("Processing complex keyword query");

          // Extract subject and body parts if they exist
          const subjectMatch =
            keyword.match(/subject:"([^"]+)"/i) ||
            keyword.match(/subject:(\S+)/i);
          const bodyMatch =
            keyword.match(/body:"([^"]+)"/i) || keyword.match(/body:(\S+)/i);

          // Get the actual search terms
          const subjectTerm = subjectMatch
            ? subjectMatch[1].toLowerCase()
            : null;
          const bodyTerm = bodyMatch ? bodyMatch[1].toLowerCase() : null;

          console.log(
            `Extracted specific terms - Subject: ${subjectTerm}, Body: ${bodyTerm}`
          );

          // If neither subject nor body specified but marked as complex, treat as general
          if (!subjectTerm && !bodyTerm) {
            const generalKeyword = keyword.toLowerCase();

            const beforeCount = filteredEmails.length;
            filteredEmails = filteredEmails.filter((email) => {
              if (!email) return false;

              // Check in subject
              const subjectMatch =
                email.subject &&
                typeof email.subject === "string" &&
                email.subject.toLowerCase().includes(generalKeyword);

              // Check in body text
              const bodyMatch =
                email.body &&
                typeof email.body === "string" &&
                email.body.toLowerCase().includes(generalKeyword);

              return subjectMatch || bodyMatch;
            });

            console.log(
              `General keyword filtering: ${beforeCount} -> ${filteredEmails.length} emails`
            );
          } else {
            // Apply specific filters for subject and/or body
            const beforeCount = filteredEmails.length;

            filteredEmails = filteredEmails.filter((email) => {
              if (!email) return false;

              let matches = true;

              // Apply subject filter if specified
              if (subjectTerm) {
                const subjectMatches =
                  email.subject &&
                  typeof email.subject === "string" &&
                  email.subject.toLowerCase().includes(subjectTerm);

                if (!subjectMatches) matches = false;
              }

              // Apply body filter if specified
              if (matches && bodyTerm) {
                const bodyMatches =
                  email.body &&
                  typeof email.body === "string" &&
                  email.body.toLowerCase().includes(bodyTerm);

                if (!bodyMatches) matches = false;
              }

              return matches;
            });

            console.log(
              `Complex keyword filtering: ${beforeCount} -> ${filteredEmails.length} emails`
            );
          }
        } else {
          // Standard keyword processing
          const keywordLower = keyword.toLowerCase();

          const beforeCount = filteredEmails.length;
          filteredEmails = filteredEmails.filter((email) => {
            if (!email) return false;

            // Check in subject
            const subjectMatch =
              email.subject &&
              typeof email.subject === "string" &&
              email.subject.toLowerCase().includes(keywordLower);

            // Check in body text
            const bodyMatch =
              email.body &&
              typeof email.body === "string" &&
              email.body.toLowerCase().includes(keywordLower);

            // Check in snippet
            const snippetMatch =
              email.snippet &&
              typeof email.snippet === "string" &&
              email.snippet.toLowerCase().includes(keywordLower);

            // Check in sender
            const fromTextMatch =
              email.from &&
              email.from.text &&
              typeof email.from.text === "string" &&
              email.from.text.toLowerCase().includes(keywordLower);

            // Check in sender address
            const fromAddressMatch =
              email.from &&
              email.from.address &&
              typeof email.from.address === "string" &&
              email.from.address.toLowerCase().includes(keywordLower);

            // Check in separate sender field
            const senderMatch =
              email.sender &&
              typeof email.sender === "string" &&
              email.sender.toLowerCase().includes(keywordLower);

            // Check in separate subject field (some APIs use different fields)
            const headerSubjectMatch =
              email.headers &&
              email.headers.subject &&
              typeof email.headers.subject === "string" &&
              email.headers.subject.toLowerCase().includes(keywordLower);

            // Return true if any of the checks matched
            return (
              subjectMatch ||
              bodyMatch ||
              snippetMatch ||
              fromTextMatch ||
              fromAddressMatch ||
              senderMatch ||
              headerSubjectMatch
            );
          });
          console.log(
            `Keyword filtering: ${beforeCount} -> ${filteredEmails.length} emails`
          );
        }
      }

      // Filter by date range with better date handling
      if (startDate) {
        console.log(`Filtering by start date: ${startDate}`);
        const startTimestamp = new Date(startDate).getTime();

        if (!isNaN(startTimestamp)) {
          const beforeCount = filteredEmails.length;
          filteredEmails = filteredEmails.filter((email) => {
            if (!email) return false;

            // Try multiple possible date fields
            let emailDate = null;
            if (email.date) {
              emailDate = new Date(email.date);
            } else if (email.receivedAt) {
              emailDate = new Date(email.receivedAt);
            } else if (email.internalDate) {
              emailDate = new Date(parseInt(email.internalDate));
            } else if (email.headers && email.headers.date) {
              emailDate = new Date(email.headers.date);
            }

            // Log some sample emails to help debug
            if (
              beforeCount > 0 &&
              filteredEmails.length < 5 &&
              !isNaN(emailDate?.getTime())
            ) {
              console.log(
                `Email date check: ${emailDate?.toISOString()} >= ${new Date(
                  startTimestamp
                ).toISOString()} = ${emailDate?.getTime() >= startTimestamp}`
              );
            }

            return (
              emailDate &&
              !isNaN(emailDate.getTime()) &&
              emailDate.getTime() >= startTimestamp
            );
          });
          console.log(
            `Start date filtering: ${beforeCount} -> ${filteredEmails.length} emails`
          );
        } else {
          console.log("Invalid start date format, skipping date filtering");
        }
      }

      if (endDate) {
        console.log(`Filtering by end date: ${endDate}`);
        const endTimestamp = new Date(endDate).getTime();

        if (!isNaN(endTimestamp)) {
          const beforeCount = filteredEmails.length;
          filteredEmails = filteredEmails.filter((email) => {
            if (!email) return false;

            // Try multiple possible date fields
            let emailDate = null;
            if (email.date) {
              emailDate = new Date(email.date);
            } else if (email.receivedAt) {
              emailDate = new Date(email.receivedAt);
            } else if (email.internalDate) {
              emailDate = new Date(parseInt(email.internalDate));
            } else if (email.headers && email.headers.date) {
              emailDate = new Date(email.headers.date);
            }

            // Log some sample emails to help debug
            if (
              beforeCount > 0 &&
              filteredEmails.length < 5 &&
              !isNaN(emailDate?.getTime())
            ) {
              console.log(
                `Email date check: ${emailDate?.toISOString()} <= ${new Date(
                  endTimestamp
                ).toISOString()} = ${emailDate?.getTime() <= endTimestamp}`
              );
            }

            return (
              emailDate &&
              !isNaN(emailDate.getTime()) &&
              emailDate.getTime() <= endTimestamp
            );
          });
          console.log(
            `End date filtering: ${beforeCount} -> ${filteredEmails.length} emails`
          );
        } else {
          console.log("Invalid end date format, skipping date filtering");
        }
      }

      // Filter by sender with more lenient matching
      if (sender) {
        console.log(`Filtering by sender: ${sender}`);
        const senderLower = sender.toLowerCase();

        const beforeCount = filteredEmails.length;
        filteredEmails = filteredEmails.filter((email) => {
          if (!email) return false;

          // Check from.text field (common format)
          const fromTextMatch =
            email.from &&
            email.from.text &&
            typeof email.from.text === "string" &&
            email.from.text.toLowerCase().includes(senderLower);

          // Check from.address field
          const fromAddressMatch =
            email.from &&
            email.from.address &&
            typeof email.from.address === "string" &&
            email.from.address.toLowerCase().includes(senderLower);

          // Check from.name field
          const fromNameMatch =
            email.from &&
            email.from.name &&
            typeof email.from.name === "string" &&
            email.from.name.toLowerCase().includes(senderLower);

          // Check the separate sender field
          const senderMatch =
            email.sender &&
            typeof email.sender === "string" &&
            email.sender.toLowerCase().includes(senderLower);

          // Check header fields
          const headerFromMatch =
            email.headers &&
            email.headers.from &&
            typeof email.headers.from === "string" &&
            email.headers.from.toLowerCase().includes(senderLower);

          return (
            fromTextMatch ||
            fromAddressMatch ||
            fromNameMatch ||
            senderMatch ||
            headerFromMatch
          );
        });
        console.log(
          `Sender filtering: ${beforeCount} -> ${filteredEmails.length} emails`
        );
      }

      // Ensure we have a valid results array
      if (!filteredEmails || !Array.isArray(filteredEmails)) {
        console.log("No valid filtered results, returning empty array");
        return [];
      }

      // Limit and return results
      const finalResults = filteredEmails.slice(0, limit);
      console.log(`Returning ${finalResults.length} email results`);
      return finalResults;
    } catch (error) {
      console.error("Error searching emails:", error);
      throw new Error(`Failed to search emails: ${error.message}`);
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

  /**
   * Parse natural language voice search query to extract search parameters
   * @param {string} voiceText - Natural language search query
   * @returns {Promise<Object>} - Extracted search parameters
   */
  async parseVoiceSearchQuery(voiceText) {
    try {
      console.log("Parsing voice search query:", voiceText);

      // Default search parameters
      const searchParams = {
        keyword: null,
        startDate: null,
        endDate: null,
        sender: null,
        folder: "INBOX",
        limit: 20,
      };

      // Make sure we have a valid string
      if (!voiceText || typeof voiceText !== "string") {
        console.warn("Invalid voice text received:", voiceText);
        return searchParams;
      }

      // Convert to lowercase for easier matching
      const text = voiceText.toLowerCase().trim();
      console.log("Normalized query:", text);

      // Extract folder/mailbox information - expanded patterns
      if (
        text.includes("spam") ||
        text.includes("junk mail") ||
        text.includes("junk folder")
      ) {
        searchParams.folder = "[Gmail]/Spam";
      } else if (
        text.includes("sent") ||
        text.includes("outbox") ||
        text.includes("sent mail") ||
        text.includes("sent items")
      ) {
        searchParams.folder = "[Gmail]/Sent Mail";
      } else if (text.includes("draft") || text.includes("drafts folder")) {
        searchParams.folder = "[Gmail]/Drafts";
      } else if (
        text.includes("trash") ||
        text.includes("deleted") ||
        text.includes("bin")
      ) {
        searchParams.folder = "[Gmail]/Trash";
      } else if (text.includes("important") || text.includes("priority")) {
        searchParams.folder = "[Gmail]/Important";
      } else if (
        text.includes("all mail") ||
        text.includes("archive") ||
        text.includes("all emails") ||
        text.includes("everywhere")
      ) {
        searchParams.folder = "[Gmail]/All Mail";
      } else if (text.includes("starred") || text.includes("flagged")) {
        searchParams.folder = "[Gmail]/Starred";
      }

      // Extract date information
      // This array holds all identified date references in the query
      const extractedDates = [];

      // Extract specific date references (yyyy-mm-dd, mm/dd/yyyy, etc.)
      const specificDatePatterns = [
        /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g, // yyyy-mm-dd or yyyy/mm/dd
        /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/g, // mm-dd-yyyy or mm/dd/yyyy
        /(\d{1,2}[-/]\d{1,2}[-/]\d{2})/g, // mm-dd-yy or mm/dd/yy
      ];

      // Try each pattern
      for (const pattern of specificDatePatterns) {
        const matches = text.match(pattern);
        if (matches) {
          for (const match of matches) {
            try {
              const dateObj = new Date(match);
              if (!isNaN(dateObj.getTime())) {
                extractedDates.push({
                  date: dateObj,
                  text: match,
                  type: "specific",
                });
              }
            } catch (err) {
              console.warn(`Error parsing specific date ${match}:`, err);
            }
          }
        }
      }

      // Extract month names with optional day/year
      const monthPattern =
        /(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{1,2})(?:st|nd|rd|th)?)?(?:,?\s*(\d{4}))?/gi;
      let monthMatch;
      while ((monthMatch = monthPattern.exec(text)) !== null) {
        try {
          const monthName = monthMatch[1].toLowerCase();
          const day = monthMatch[2] ? parseInt(monthMatch[2]) : 1;
          const year = monthMatch[3]
            ? parseInt(monthMatch[3])
            : new Date().getFullYear();

          const months = {
            january: 0,
            february: 1,
            march: 2,
            april: 3,
            may: 4,
            june: 5,
            july: 6,
            august: 7,
            september: 8,
            october: 9,
            november: 10,
            december: 11,
          };

          const month = months[monthName];
          if (month !== undefined) {
            // Create a date object for the specified month/day/year
            const dateObj = new Date(year, month, day);
            if (!isNaN(dateObj.getTime())) {
              extractedDates.push({
                date: dateObj,
                text: monthMatch[0],
                type: monthMatch[2] ? "specific" : "month",
                isMonthOnly: !monthMatch[2],
              });
            }
          }
        } catch (err) {
          console.warn(`Error parsing month reference ${monthMatch[0]}:`, err);
        }
      }

      // New function to create a date range
      const createDateRange = (startDate, endDate) => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        };
      };

      // Process common date ranges and time periods
      const dateRangePatterns = [
        {
          // Last week (previous calendar week)
          regex: /\b(last\s+week)\b/i,
          handler: () => {
            const today = new Date();
            const day = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Get last Sunday
            const lastSunday = new Date(today);
            lastSunday.setDate(today.getDate() - day - 7);
            lastSunday.setHours(0, 0, 0, 0);

            // Get last Saturday
            const lastSaturday = new Date(lastSunday);
            lastSaturday.setDate(lastSunday.getDate() + 6);
            lastSaturday.setHours(23, 59, 59, 999);

            return createDateRange(lastSunday, lastSaturday);
          },
        },
        {
          // This week (current calendar week)
          regex: /\b(this\s+week)\b/i,
          handler: () => {
            const today = new Date();
            const day = today.getDay();

            // Get this Sunday
            const thisSunday = new Date(today);
            thisSunday.setDate(today.getDate() - day);
            thisSunday.setHours(0, 0, 0, 0);

            // Get this Saturday
            const thisSaturday = new Date(thisSunday);
            thisSaturday.setDate(thisSunday.getDate() + 6);
            thisSaturday.setHours(23, 59, 59, 999);

            return createDateRange(thisSunday, thisSaturday);
          },
        },
        {
          // Last month (previous calendar month)
          regex: /\b(last\s+month)\b/i,
          handler: () => {
            const today = new Date();
            const firstDayLastMonth = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              1
            );
            const lastDayLastMonth = new Date(
              today.getFullYear(),
              today.getMonth(),
              0
            );

            return createDateRange(firstDayLastMonth, lastDayLastMonth);
          },
        },
        {
          // This month (current calendar month)
          regex: /\b(this\s+month)\b/i,
          handler: () => {
            const today = new Date();
            const firstDayThisMonth = new Date(
              today.getFullYear(),
              today.getMonth(),
              1
            );
            const lastDayThisMonth = new Date(
              today.getFullYear(),
              today.getMonth() + 1,
              0
            );

            return createDateRange(firstDayThisMonth, lastDayThisMonth);
          },
        },
        {
          // Last year (previous calendar year)
          regex: /\b(last\s+year)\b/i,
          handler: () => {
            const today = new Date();
            const firstDayLastYear = new Date(today.getFullYear() - 1, 0, 1);
            const lastDayLastYear = new Date(
              today.getFullYear() - 1,
              11,
              31,
              23,
              59,
              59
            );

            return createDateRange(firstDayLastYear, lastDayLastYear);
          },
        },
        {
          // This year (current calendar year)
          regex: /\b(this\s+year)\b/i,
          handler: () => {
            const today = new Date();
            const firstDayThisYear = new Date(today.getFullYear(), 0, 1);
            const lastDayThisYear = new Date(
              today.getFullYear(),
              11,
              31,
              23,
              59,
              59
            );

            return createDateRange(firstDayThisYear, lastDayThisYear);
          },
        },
        {
          // Last quarter (previous calendar quarter)
          regex: /\b(last\s+quarter)\b/i,
          handler: () => {
            const today = new Date();
            const currentQuarter = Math.floor(today.getMonth() / 3);

            let lastQuarterStartMonth, lastQuarterYear;

            if (currentQuarter === 0) {
              lastQuarterStartMonth = 9; // Oct
              lastQuarterYear = today.getFullYear() - 1;
            } else {
              lastQuarterStartMonth = (currentQuarter - 1) * 3;
              lastQuarterYear = today.getFullYear();
            }

            const firstDayLastQuarter = new Date(
              lastQuarterYear,
              lastQuarterStartMonth,
              1
            );
            const lastDayLastQuarter = new Date(
              lastQuarterYear,
              lastQuarterStartMonth + 3,
              0,
              23,
              59,
              59
            );

            return createDateRange(firstDayLastQuarter, lastDayLastQuarter);
          },
        },
        {
          // Last X days
          regex: /\b(?:last|past|previous)\s+(\d+)\s+days?\b/i,
          handler: (match) => {
            const days = parseInt(match[1]);
            if (isNaN(days)) return null;

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - days);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Recent or recent days (default to last 7 days)
          regex: /\b(recent|recently|past few days)\b/i,
          handler: () => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 7);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Last few weeks (default to last 3 weeks)
          regex: /\b(last few weeks|past few weeks|recent weeks)\b/i,
          handler: () => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 21); // 3 weeks * 7 days
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Last few months (default to last 3 months)
          regex: /\b(last few months|past few months|recent months)\b/i,
          handler: () => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - 3);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Last X weeks
          regex: /\b(?:last|past|previous)\s+(\d+)\s+weeks?\b/i,
          handler: (match) => {
            const weeks = parseInt(match[1]);
            if (isNaN(weeks)) return null;

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - weeks * 7);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Last X months
          regex: /\b(?:last|past|previous)\s+(\d+)\s+months?\b/i,
          handler: (match) => {
            const months = parseInt(match[1]);
            if (isNaN(months)) return null;

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setMonth(pastDate.getMonth() - months);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // Last X years
          regex: /\b(?:last|past|previous)\s+(\d+)\s+years?\b/i,
          handler: (match) => {
            const years = parseInt(match[1]);
            if (isNaN(years)) return null;

            const today = new Date();
            today.setHours(23, 59, 59, 999);

            const pastDate = new Date();
            pastDate.setFullYear(pastDate.getFullYear() - years);
            pastDate.setHours(0, 0, 0, 0);

            return createDateRange(pastDate, today);
          },
        },
        {
          // X days ago (range from that day to that day)
          regex: /\b(\d+)\s+days?\s+ago\b/i,
          handler: (match) => {
            const days = parseInt(match[1]);
            if (isNaN(days)) return null;

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - days);

            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            return createDateRange(startOfDay, endOfDay);
          },
        },
        {
          // X weeks ago (range from that week to that week)
          regex: /\b(\d+)\s+weeks?\s+ago\b/i,
          handler: (match) => {
            const weeks = parseInt(match[1]);
            if (isNaN(weeks)) return null;

            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - weeks * 7);

            const day = targetDate.getDay();

            // Get the Sunday of that week
            const sunday = new Date(targetDate);
            sunday.setDate(targetDate.getDate() - day);
            sunday.setHours(0, 0, 0, 0);

            // Get the Saturday of that week
            const saturday = new Date(sunday);
            saturday.setDate(sunday.getDate() + 6);
            saturday.setHours(23, 59, 59, 999);

            return createDateRange(sunday, saturday);
          },
        },
        {
          // X months ago (range for that month)
          regex: /\b(\d+)\s+months?\s+ago\b/i,
          handler: (match) => {
            const months = parseInt(match[1]);
            if (isNaN(months)) return null;

            const today = new Date();

            // Calculate the target month
            let targetYear = today.getFullYear();
            let targetMonth = today.getMonth() - months;

            // Adjust for negative months
            while (targetMonth < 0) {
              targetMonth += 12;
              targetYear -= 1;
            }

            // First day of that month
            const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
            firstDayOfMonth.setHours(0, 0, 0, 0);

            // Last day of that month
            const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0);
            lastDayOfMonth.setHours(23, 59, 59, 999);

            return createDateRange(firstDayOfMonth, lastDayOfMonth);
          },
        },
        {
          // Today
          regex: /\b(today)\b/i,
          handler: () => {
            const today = new Date();

            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            return createDateRange(startOfDay, endOfDay);
          },
        },
        {
          // Yesterday
          regex: /\b(yesterday)\b/i,
          handler: () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const startOfDay = new Date(yesterday);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(yesterday);
            endOfDay.setHours(23, 59, 59, 999);

            return createDateRange(startOfDay, endOfDay);
          },
        },
        {
          // Day of week names
          regex:
            /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
          handler: (match) => {
            const dayNames = {
              sunday: 0,
              monday: 1,
              tuesday: 2,
              wednesday: 3,
              thursday: 4,
              friday: 5,
              saturday: 6,
            };

            const targetDay = dayNames[match[1].toLowerCase()];
            const today = new Date();
            const currentDay = today.getDay();

            // Calculate how many days to go back
            let daysToSubtract = currentDay - targetDay;

            // If it's negative or zero, add 7 to get the previous week's day
            if (daysToSubtract <= 0) {
              daysToSubtract += 7;
            }

            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - daysToSubtract);

            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);

            return createDateRange(startOfDay, endOfDay);
          },
        },
      ];

      // Check for direct date range patterns first
      let dateRangeFound = false;
      for (const pattern of dateRangePatterns) {
        const match = text.match(pattern.regex);
        if (match) {
          try {
            const result = pattern.handler(match);
            if (result) {
              console.log(
                `Found date range: ${match[0]}, setting startDate: ${result.startDate}, endDate: ${result.endDate}`
              );
              searchParams.startDate = result.startDate;
              searchParams.endDate = result.endDate;
              dateRangeFound = true;
              break;
            }
          } catch (err) {
            console.warn(`Error processing date range ${match[0]}:`, err);
          }
        }
      }

      // Process "between X and Y" patterns if no direct range is found
      if (!dateRangeFound) {
        const betweenPattern =
          /\b(?:between|from)\s+(.+?)\s+(?:and|to)\s+(.+?)(?:\b|$)/i;
        const betweenMatch = text.match(betweenPattern);

        if (betweenMatch) {
          console.log(
            `Found between pattern: "${betweenMatch[0]}" with parts: "${betweenMatch[1]}" and "${betweenMatch[2]}"`
          );

          // Try to identify dates in each part
          const fullText = text;
          const firstPart = betweenMatch[1];
          const secondPart = betweenMatch[2];

          // Create temporary text with just first part to extract the first date
          text = firstPart;
          const originalDates = [...extractedDates];
          extractedDates.length = 0;

          // Run the normal date extraction on the first part
          for (const pattern of specificDatePatterns) {
            const matches = text.match(pattern);
            if (matches) {
              for (const match of matches) {
                try {
                  const dateObj = new Date(match);
                  if (!isNaN(dateObj.getTime())) {
                    extractedDates.push({
                      date: dateObj,
                      text: match,
                      type: "specific",
                    });
                  }
                } catch (err) {
                  console.warn(`Error parsing specific date ${match}:`, err);
                }
              }
            }
          }

          // Check for month names in the first part
          let monthMatch;
          while ((monthMatch = monthPattern.exec(text)) !== null) {
            try {
              const monthName = monthMatch[1].toLowerCase();
              const day = monthMatch[2] ? parseInt(monthMatch[2]) : 1;
              const year = monthMatch[3]
                ? parseInt(monthMatch[3])
                : new Date().getFullYear();

              const months = {
                january: 0,
                february: 1,
                march: 2,
                april: 3,
                may: 4,
                june: 5,
                july: 6,
                august: 7,
                september: 8,
                october: 9,
                november: 10,
                december: 11,
              };

              const month = months[monthName];
              if (month !== undefined) {
                const dateObj = new Date(year, month, day);
                if (!isNaN(dateObj.getTime())) {
                  extractedDates.push({
                    date: dateObj,
                    text: monthMatch[0],
                    type: monthMatch[2] ? "specific" : "month",
                    isMonthOnly: !monthMatch[2],
                  });
                }
              }
            } catch (err) {
              console.warn(
                `Error parsing month reference ${monthMatch[0]}:`,
                err
              );
            }
          }

          // If first part has a date
          if (extractedDates.length > 0) {
            const startDate = extractedDates[0].date;
            startDate.setHours(0, 0, 0, 0);
            searchParams.startDate = startDate.toISOString();

            // Now extract the second date
            text = secondPart;
            extractedDates.length = 0;

            // Run the normal date extraction on the second part
            for (const pattern of specificDatePatterns) {
              const matches = text.match(pattern);
              if (matches) {
                for (const match of matches) {
                  try {
                    const dateObj = new Date(match);
                    if (!isNaN(dateObj.getTime())) {
                      extractedDates.push({
                        date: dateObj,
                        text: match,
                        type: "specific",
                      });
                    }
                  } catch (err) {
                    console.warn(`Error parsing specific date ${match}:`, err);
                  }
                }
              }
            }

            // Check for month names in the second part
            monthPattern.lastIndex = 0; // Reset regex state
            while ((monthMatch = monthPattern.exec(text)) !== null) {
              try {
                const monthName = monthMatch[1].toLowerCase();
                const day = monthMatch[2] ? parseInt(monthMatch[2]) : 1;
                const year = monthMatch[3]
                  ? parseInt(monthMatch[3])
                  : new Date().getFullYear();

                const months = {
                  january: 0,
                  february: 1,
                  march: 2,
                  april: 3,
                  may: 4,
                  june: 5,
                  july: 6,
                  august: 7,
                  september: 8,
                  october: 9,
                  november: 10,
                  december: 11,
                };

                const month = months[monthName];
                if (month !== undefined) {
                  const dateObj = new Date(year, month, day);
                  if (!isNaN(dateObj.getTime())) {
                    extractedDates.push({
                      date: dateObj,
                      text: monthMatch[0],
                      type: monthMatch[2] ? "specific" : "month",
                      isMonthOnly: !monthMatch[2],
                    });
                  }
                }
              } catch (err) {
                console.warn(
                  `Error parsing month reference ${monthMatch[0]}:`,
                  err
                );
              }
            }

            if (extractedDates.length > 0) {
              let endDate = extractedDates[0].date;

              // If second date has only a month specification, use end of that month
              if (extractedDates[0].isMonthOnly) {
                endDate = new Date(
                  endDate.getFullYear(),
                  endDate.getMonth() + 1,
                  0
                );
              }

              endDate.setHours(23, 59, 59, 999);
              searchParams.endDate = endDate.toISOString();
              dateRangeFound = true;
            }

            // Restore text and extractedDates
            text = fullText;
            extractedDates.length = 0;
            extractedDates.push(...originalDates);
          }
        }
      }

      // Extract relative time expressions if no range was found yet
      if (!dateRangeFound) {
        const relativeTimePatterns = [
          { regex: /\b(today)\b/i, handler: () => new Date() },
          {
            regex: /\b(yesterday)\b/i,
            handler: () => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              return d;
            },
          },
          {
            regex: /\b(last\s+week)\b/i,
            handler: () => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              return d;
            },
          },
          {
            regex: /\b(last\s+month)\b/i,
            handler: () => {
              const d = new Date();
              d.setMonth(d.getMonth() - 1);
              return d;
            },
          },
          {
            regex: /\b(last\s+year)\b/i,
            handler: () => {
              const d = new Date();
              d.setFullYear(d.getFullYear() - 1);
              return d;
            },
          },
          {
            regex: /\b(this\s+week)\b/i,
            handler: () => {
              const d = new Date();
              const day = d.getDay();
              const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Get Monday
              return new Date(d.setDate(diff));
            },
          },
          {
            regex: /\b(this\s+month)\b/i,
            handler: () => {
              const d = new Date();
              return new Date(d.getFullYear(), d.getMonth(), 1);
            },
          },
          {
            regex: /\b(this\s+year)\b/i,
            handler: () => {
              const d = new Date();
              return new Date(d.getFullYear(), 0, 1);
            },
          },
          {
            regex: /\b(\d+)\s+days?\s+ago\b/i,
            handler: (match) => {
              const days = parseInt(match[1]);
              const d = new Date();
              d.setDate(d.getDate() - days);
              return d;
            },
          },
          {
            regex: /\b(\d+)\s+weeks?\s+ago\b/i,
            handler: (match) => {
              const weeks = parseInt(match[1]);
              const d = new Date();
              d.setDate(d.getDate() - weeks * 7);
              return d;
            },
          },
          {
            regex: /\b(\d+)\s+months?\s+ago\b/i,
            handler: (match) => {
              const months = parseInt(match[1]);
              const d = new Date();
              d.setMonth(d.getMonth() - months);
              return d;
            },
          },
        ];

        // Apply each relative time pattern
        for (const pattern of relativeTimePatterns) {
          const match = text.match(pattern.regex);
          if (match) {
            try {
              const dateObj = pattern.handler(match);
              if (dateObj && !isNaN(dateObj.getTime())) {
                extractedDates.push({
                  date: dateObj,
                  text: match[0],
                  type: "relative",
                });
              }
            } catch (err) {
              console.warn(`Error processing relative time ${match[0]}:`, err);
            }
          }
        }

        console.log(
          `Extracted ${extractedDates.length} date references:`,
          extractedDates.map((d) => ({
            text: d.text,
            date: d.date.toISOString(),
            type: d.type,
          }))
        );

        // Determine date ranges based on context
        if (extractedDates.length > 0 && !dateRangeFound) {
          // If we have 2+ dates, use them as a range
          if (extractedDates.length >= 2) {
            // Sort dates chronologically
            extractedDates.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Use the first and last date for range
            let startDate = extractedDates[0].date;
            let endDate = extractedDates[extractedDates.length - 1].date;

            // If the start date is a month-only reference, set it to the first day of that month
            if (extractedDates[0].isMonthOnly) {
              startDate = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                1
              );
            }

            // If the end date is a month-only reference, set it to the last day of that month
            if (extractedDates[extractedDates.length - 1].isMonthOnly) {
              endDate = new Date(
                endDate.getFullYear(),
                endDate.getMonth() + 1,
                0,
                23,
                59,
                59
              );
            } else {
              // Otherwise, set to end of day
              endDate = new Date(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate(),
                23,
                59,
                59
              );
            }

            searchParams.startDate = startDate.toISOString();
            searchParams.endDate = endDate.toISOString();
          } else {
            // We have just one date reference
            const dateRef = extractedDates[0];

            // Check for context clues to determine if this is a start or end date
            if (
              text.includes("before") ||
              text.includes("until") ||
              text.includes("up to") ||
              text.includes("earlier than") ||
              text.includes("prior to")
            ) {
              // This is an end date
              const endDate = new Date(dateRef.date);
              if (dateRef.isMonthOnly) {
                // If it's a month-only reference, set to the last day of the month
                endDate.setMonth(endDate.getMonth() + 1, 0);
              }
              // Set to end of day
              endDate.setHours(23, 59, 59, 999);
              searchParams.endDate = endDate.toISOString();
            } else if (
              text.includes("after") ||
              text.includes("since") ||
              text.includes("from") ||
              text.includes("later than") ||
              text.includes("newer than")
            ) {
              // This is a start date
              const startDate = new Date(dateRef.date);
              if (dateRef.isMonthOnly) {
                // If it's a month-only reference, set to the first day of the month
                startDate.setDate(1);
              }
              // Set to start of day
              startDate.setHours(0, 0, 0, 0);
              searchParams.startDate = startDate.toISOString();
            } else if (dateRef.type === "relative") {
              // For relative dates with no directional hints, treat as start date
              searchParams.startDate = dateRef.date.toISOString();
            } else if (dateRef.isMonthOnly) {
              // For a month with no direction, create a range for the entire month
              const startOfMonth = new Date(
                dateRef.date.getFullYear(),
                dateRef.date.getMonth(),
                1
              );
              const endOfMonth = new Date(
                dateRef.date.getFullYear(),
                dateRef.date.getMonth() + 1,
                0,
                23,
                59,
                59
              );
              searchParams.startDate = startOfMonth.toISOString();
              searchParams.endDate = endOfMonth.toISOString();
            } else {
              // For a specific date with no direction, search for that exact day
              const exactDate = new Date(dateRef.date);
              exactDate.setHours(0, 0, 0, 0);
              const nextDay = new Date(exactDate);
              nextDay.setDate(nextDay.getDate() + 1);
              nextDay.setSeconds(nextDay.getSeconds() - 1);
              searchParams.startDate = exactDate.toISOString();
              searchParams.endDate = nextDay.toISOString();
            }
          }
        }
      }

      // Extract keywords using more patterns
      const keywordPatterns = [
        // Quoted content
        /(?:about|containing|with|related to|topic|subject|body|text|content|mentioning)\s+["']([^"']+)["']/i,
        // Keywords after specific phrases
        /(?:about|containing|with|related to|topic|subject|body|text|content|mentioning)\s+([^,\.;]+)/i,
        // Search or find phrases
        /(?:search for|find|look for|show me)\s+(.+?)(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // General topic phrases
        /emails? (?:about|on|regarding|concerning|discussing)\s+(.+?)(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // In subject line
        /with (?:subject|title)\s+(.+?)(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // Content contains
        /(?:containing|has|includes?|with)\s+(?:the\s+)?(?:words?|text|content|phrase|terms?)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // Body contains
        /(?:body|content|text)\s+(?:containing|has|includes?|with)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // Subject contains
        /(?:subject|title|headline)\s+(?:containing|has|includes?|with)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        // Contains in body
        /(?:contains?|has|includes?)\s+["']?([^"']+?)["']?\s+(?:in|within)\s+(?:the\s+)?(?:body|content|text)/i,
        // Contains in subject
        /(?:contains?|has|includes?)\s+["']?([^"']+?)["']?\s+(?:in|within)\s+(?:the\s+)?(?:subject|title|headline)/i,
        // Direct mention of keyword
        /(?:key\s*words?|terms?|phrases?)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
      ];

      // Extract subject-specific keywords
      const subjectKeywordPatterns = [
        /(?:subject|title|headline)\s+(?:containing|has|includes?|with|like|is|equals?)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        /(?:in|with(?:in)?)\s+(?:the\s+)?(?:subject|title|headline)\s+["']?([^"']+?)["']?/i,
        /(?:containing|has|includes?)\s+["']?([^"']+?)["']?\s+(?:in|within)\s+(?:the\s+)?(?:subject|title|headline)/i,
      ];

      // Extract body-specific keywords
      const bodyKeywordPatterns = [
        /(?:body|content|text|message)\s+(?:containing|has|includes?|with|like)\s+["']?([^"']+?)["']?(?:\s+in|\s+from|\s+before|\s+after|\s+since|$)/i,
        /(?:in|with(?:in)?)\s+(?:the\s+)?(?:body|content|text|message)\s+["']?([^"']+?)["']?/i,
        /(?:containing|has|includes?)\s+["']?([^"']+?)["']?\s+(?:in|within)\s+(?:the\s+)?(?:body|content|text|message)/i,
      ];

      // Extract sender-specific patterns with improved matching
      const senderPatterns = [
        // Email address patterns
        /\b(?:from|by|sent by)\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i,
        // Name patterns with flexible formats
        /\b(?:from|by|sent by)\s+(['"]?)([a-zA-Z0-9\s.&_-]+)\1/i,
        // Domain patterns
        /\b(?:from|by|sent by)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i,
        // Sent by person
        /\b(?:from|by|sent by|sender is)\s+(.+?)(?:\s+in|\s+and|\s+with|\s+containing|\s+about|\s+before|\s+after|\s+since|$)/i,
        // Authored by
        /\b(?:authored|written|composed|created)\s+by\s+(.+?)(?:\s+in|\s+and|\s+with|\s+containing|\s+about|\s+before|\s+after|\s+since|$)/i,
        // From domain
        /\b(?:from|by)\s+(?:someone|anyone|people|person)?\s+(?:at|@|from)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i,
        // People from domain
        /\b(?:people|someone|anyone)\s+(?:from|at)\s+([a-zA-Z0-9\s.&_-]+)(?:\s+|\b|$)/i,
      ];

      // Create objects to store specific search parameters
      let subjectKeyword = null;
      let bodyKeyword = null;
      let generalKeyword = null;

      // First check for subject-specific keywords
      for (const pattern of subjectKeywordPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          subjectKeyword = match[1].trim();
          console.log(
            `Extracted subject keyword: "${subjectKeyword}" using pattern: ${pattern}`
          );
          break;
        }
      }

      // Then check for body-specific keywords
      for (const pattern of bodyKeywordPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          bodyKeyword = match[1].trim();
          console.log(
            `Extracted body keyword: "${bodyKeyword}" using pattern: ${pattern}`
          );
          break;
        }
      }

      // Check for sender first with improved patterns
      for (const pattern of senderPatterns) {
        const match = text.match(pattern);
        if (match) {
          // Use the capture group that contains the actual sender
          const senderMatch = match[2] || match[1];
          if (senderMatch && senderMatch.length > 1) {
            // Ensure we have a meaningful sender (exclude common stop words or very short terms)
            const stopWords = [
              "and",
              "the",
              "with",
              "for",
              "in",
              "on",
              "at",
              "by",
              "to",
              "a",
              "an",
            ];
            if (
              senderMatch.length > 2 &&
              !stopWords.includes(senderMatch.toLowerCase().trim())
            ) {
              searchParams.sender = senderMatch.trim();
              console.log(
                `Extracted sender: "${searchParams.sender}" using pattern: ${pattern}`
              );
              break;
            }
          }
        }
      }

      // Try generic keyword patterns if no specific ones found
      for (const pattern of keywordPatterns) {
        const match = text.match(pattern);
        if (match && match[1] && match[1].trim().length > 0) {
          generalKeyword = match[1].trim();
          console.log(
            `Extracted general keyword: "${generalKeyword}" using pattern: ${pattern}`
          );
          break;
        }
      }

      // If no keyword yet, try a different approach - look for quoted text
      if (!generalKeyword && !subjectKeyword && !bodyKeyword) {
        const quotedText = text.match(/["']([^"']+)["']/);
        if (quotedText && quotedText[1] && quotedText[1].length > 1) {
          generalKeyword = quotedText[1];
          console.log(`Extracted keyword from quotes: "${generalKeyword}"`);
        }
      }

      // Create a composite search keyword if we have specific parts
      if (subjectKeyword || bodyKeyword) {
        let queryParts = [];

        if (subjectKeyword) {
          queryParts.push(`subject:"${subjectKeyword}"`);
        }

        if (bodyKeyword) {
          queryParts.push(`body:"${bodyKeyword}"`);
        }

        if (queryParts.length > 0) {
          searchParams.keyword = queryParts.join(" AND ");
          searchParams.complexQuery = true;
          console.log(`Created composite query: ${searchParams.keyword}`);
        } else if (generalKeyword) {
          searchParams.keyword = generalKeyword;
        }
      } else if (generalKeyword) {
        searchParams.keyword = generalKeyword;
      }

      // As a last resort, extract the main topic if there are no other search parameters
      if (
        !searchParams.keyword &&
        !searchParams.sender &&
        !searchParams.startDate &&
        !searchParams.endDate &&
        searchParams.folder === "INBOX"
      ) {
        // Remove filter words and get the main topic
        const cleanedText = text
          .replace(
            /search|find|show|look for|get|emails?|messages?|mail|in|inbox|folder|from|before|after|between|since|containing|about|with|related|to|topic|subject/gi,
            ""
          )
          .replace(/[,.;:!?]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanedText && cleanedText.length > 2) {
          searchParams.keyword = cleanedText;
          console.log(
            `Extracted keyword from cleaned text: "${searchParams.keyword}"`
          );
        }
      }

      // Extract limit with more patterns
      const limitPatterns = [
        /\b(top|first|latest|recent|last|newest)\s+(\d+)\b/i,
        /\b(\d+)\s+(emails?|messages?|results?|items?)\b/i,
        /\blimit\s+(?:to\s+)?(\d+)\b/i,
        /\bonly\s+(\d+)\b/i,
      ];

      for (const pattern of limitPatterns) {
        const match = text.match(pattern);
        if (match) {
          const numMatch = match.find((part) => /^\d+$/.test(part));
          if (numMatch) {
            const limitValue = parseInt(numMatch);
            if (limitValue > 0 && limitValue <= 100) {
              // Reasonable limit range
              searchParams.limit = limitValue;
              console.log(`Extracted limit: ${searchParams.limit}`);
              break;
            }
          }
        }
      }

      console.log("Final parsed search parameters:", searchParams);
      return searchParams;
    } catch (error) {
      console.error("Error parsing voice search query:", error);
      throw new Error(`Failed to parse voice search query: ${error.message}`);
    }
  }

  /**
   * Get all distinct folders for a user from the database
   * This includes both custom folders and folders that have emails in them
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of folder names
   */
  async getUserFolders(userId) {
    try {
      return await getCustomFolders(userId);
    } catch (error) {
      console.error("Error fetching user folders:", error);
      throw new Error(`Failed to fetch user folders: ${error.message}`);
    }
  }

  /**
   * Get folders that contain emails (for backward compatibility)
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of folder names
   */
  async getSavedFolders(userId) {
    try {
      return await getDistinctFoldersByUser(userId);
    } catch (error) {
      console.error("Error getting saved folders:", error);
      throw new Error(`Failed to get saved folders: ${error.message}`);
    }
  }

  /**
   * Create a custom folder for a user
   * @param {number} userId - User ID
   * @param {string} folderName - Name of the folder to create
   * @returns {Promise<Object>} - Created folder object
   */
  async createCustomFolder(userId, folderName) {
    try {
      return await createCustomFolder(userId, folderName);
    } catch (error) {
      console.error("Error creating custom folder:", error);
      throw new Error(`Failed to create custom folder: ${error.message}`);
    }
  }

  /**
   * Move an email to a different folder
   * @param {number} emailId - Email ID
   * @param {string} folderName - Name of the folder to move the email to
   * @returns {Promise<Object>} - Updated email object
   */
  async moveEmailToFolder(emailId, folderName) {
    try {
      return await updateEmailFolder(emailId, folderName);
    } catch (error) {
      console.error("Error moving email to folder:", error);
      throw new Error(`Failed to move email: ${error.message}`);
    }
  }

  /**
   * Get all emails in a specific folder for a user from the database
   * @param {number} userId - User ID
   * @param {string} folderName - Name of the folder to fetch emails from
   * @returns {Promise<Array>} - Array of email objects
   */
  async getEmailsByFolder(userId, folderName) {
    try {
      const options = {
        folder: folderName,
      };
      return await searchEmails(userId, options);
    } catch (error) {
      console.error("Error fetching emails by folder:", error);
      throw new Error(`Failed to fetch emails from folder: ${error.message}`);
    }
  }
}

// Export a singleton instance
export default new EmailService();
