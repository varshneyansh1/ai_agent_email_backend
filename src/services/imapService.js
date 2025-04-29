import Imap from "imap";
import { simpleParser } from "mailparser";
import dotenv from "dotenv";

dotenv.config();

// Gmail mailbox name mapping
const GMAIL_FOLDERS = {
  inbox: "INBOX",
  sent: "[Gmail]/Sent Mail",
  drafts: "[Gmail]/Drafts",
  trash: "[Gmail]/Trash",
  spam: "[Gmail]/Spam",
  starred: "[Gmail]/Starred",
  important: "[Gmail]/Important",
  all: "[Gmail]/All Mail",
};

/**
 * Maps common folder names to Gmail's specific folder structure
 * @param {string} folder - Common folder name
 * @returns {string} - Gmail folder name
 */
const getGmailFolderName = (folder) => {
  const lowercaseFolder = folder.toLowerCase();
  return GMAIL_FOLDERS[lowercaseFolder] || folder;
};

/**
 * Helper function to safely convert mailbox structure to string without circular references
 * @param {Object} boxes - Mailbox structure from IMAP
 * @returns {Object} - Simplified mailbox structure
 */
const simplifyMailboxes = (boxes) => {
  const result = {};

  // Process each mailbox at this level
  Object.keys(boxes).forEach((boxName) => {
    const box = boxes[boxName];

    // Create simplified representation (without parent references)
    result[boxName] = {
      attribs: box.attribs,
      delimiter: box.delimiter,
    };

    // Process children recursively if they exist
    if (box.children && Object.keys(box.children).length > 0) {
      result[boxName].children = simplifyMailboxes(box.children);
    }
  });

  return result;
};

/**
 * Connects to Gmail using IMAP and fetches recent emails.
 * @param {string} email - User's email address.
 * @param {string} accessToken - OAuth2 access token (not used in password auth mode).
 * @param {number} limit - Number of emails to fetch (default 10)
 * @param {string} mailbox - Mailbox to fetch from (default INBOX)
 * @param {number} page - Page number for pagination (default 1)
 * @returns {Promise<Array>} - Promise that resolves to array of emails
 */
export const fetchEmails = (
  email,
  accessToken,
  limit = 10,
  mailbox = "INBOX",
  page = 1
) => {
  return new Promise((resolve, reject) => {
    // Map common folder names to Gmail's specific folders
    const gmailMailbox = getGmailFolderName(mailbox);

    // For testing, use direct password authentication instead of OAuth
    // This should be replaced with proper OAuth flow in production
    const imapConfig = {
      user: process.env.EMAIL_USER || email,
      password: process.env.EMAIL_PASS, // Use app password from .env
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    };

    console.log("Connecting to IMAP with user:", imapConfig.user);
    console.log("Trying to access mailbox:", gmailMailbox);

    const imap = new Imap(imapConfig);

    const emails = [];
    let connected = false;

    // Handle connection errors
    imap.once("error", (err) => {
      if (!connected) {
        console.error("IMAP connection error details:", err);
        reject(new Error(`IMAP connection error: ${err.message}`));
      }
      console.error("IMAP error:", err);
    });

    // Handle connection end
    imap.once("end", () => {
      if (!connected) {
        reject(new Error("IMAP connection ended unexpectedly"));
      }
      console.log("IMAP connection ended");
    });

    // Handle connection success
    imap.once("ready", () => {
      connected = true;
      console.log("IMAP connection established successfully");

      // List all available mailboxes for debugging
      imap.getBoxes((err, boxes) => {
        if (err) {
          console.error("Error fetching mailboxes:", err);
        } else {
          // Use our safe function to display mailboxes without circular references
          const simplifiedBoxes = simplifyMailboxes(boxes);
          console.log(
            "Available mailboxes:",
            JSON.stringify(simplifiedBoxes, null, 2)
          );

          // Log just the top-level folder names for easy reference
          console.log("Folder names:", Object.keys(boxes).join(", "));

          // If there's a [Gmail] folder, also log its subfolders
          if (boxes["[Gmail]"] && boxes["[Gmail]"].children) {
            console.log(
              "Gmail subfolders:",
              Object.keys(boxes["[Gmail]"].children)
                .map((name) => `[Gmail]/${name}`)
                .join(", ")
            );
          }
        }

        // Continue with opening the requested mailbox
        imap.openBox(gmailMailbox, false, (err, box) => {
          if (err) {
            console.error(`Error opening mailbox ${gmailMailbox}:`, err);

            // If we tried a mapped folder name and it failed, try the original name
            if (gmailMailbox !== mailbox) {
              console.log(`Trying original mailbox name: ${mailbox}`);

              imap.openBox(mailbox, false, (err2, box2) => {
                if (err2) {
                  imap.end();
                  return reject(
                    new Error(
                      `Error opening mailbox ${mailbox}: ${err2.message}`
                    )
                  );
                }

                fetchEmailsFromBox(
                  imap,
                  box2,
                  limit,
                  emails,
                  resolve,
                  reject,
                  page
                );
              });
              return;
            }

            imap.end();
            return reject(
              new Error(`Error opening mailbox ${gmailMailbox}: ${err.message}`)
            );
          }

          fetchEmailsFromBox(imap, box, limit, emails, resolve, reject, page);
        });
      });
    });

    // Connect to server
    try {
      console.log("Initiating IMAP connection...");
      imap.connect();
    } catch (err) {
      console.error("Connection attempt error:", err);
      reject(new Error(`Error connecting to IMAP server: ${err.message}`));
    }
  });
};

/**
 * Helper function to fetch emails from an open mailbox
 */
function fetchEmailsFromBox(
  imap,
  box,
  limit,
  emails,
  resolve,
  reject,
  page = 1
) {
  console.log(`Mailbox opened with ${box.messages.total} messages`);

  // If no messages, return empty array
  if (box.messages.total === 0) {
    imap.end();
    return resolve([]);
  }

  // Calculate pagination parameters
  const skip = (page - 1) * limit;

  // Fetch slightly more emails than requested to ensure we get enough after filtering
  const fetchMultiplier = 2;
  const fetchLimit = Math.min(limit * fetchMultiplier, box.messages.total);

  // Calculate the range based on pagination
  // We fetch from newest to oldest, so need to start from (total - skip - fetchLimit)
  let start = Math.max(1, box.messages.total - skip - fetchLimit + 1);
  let end = Math.min(box.messages.total, box.messages.total - skip);

  // Edge case handling
  if (start > end) {
    // We're beyond the available messages, return empty array
    imap.end();
    return resolve([]);
  }

  const range = `${start}:${end}`;
  console.log(
    `Fetching email range: ${range} (page ${page}, limit ${limit}, skip ${skip})`
  );

  const fetchOptions = {
    bodies: ["HEADER", "TEXT", ""],
    struct: true,
    markSeen: false,
  };

  try {
    const fetch = imap.seq.fetch(range, fetchOptions);
    const emailMap = new Map(); // Use a map to combine parts by sequence number

    fetch.on("message", (msg, seqno) => {
      console.log(`Processing message #${seqno}`);

      // Initialize or get email object from map
      if (!emailMap.has(seqno)) {
        emailMap.set(seqno, {
          seqno,
          uid: null,
          messageId: null,
          from: null,
          to: null,
          subject: null,
          date: null,
          body: null,
          snippet: null,
          html: null,
          attachments: [],
          headers: {},
          internalDate: null,
          flags: [],
        });
      }

      const email = emailMap.get(seqno);

      msg.on("body", (stream, info) => {
        let buffer = "";

        stream.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
        });

        stream.once("end", () => {
          if (info.which === "HEADER") {
            // Parse full header
            const header = Imap.parseHeader(buffer);
            email.headers = header;

            // Extract common header fields
            email.from =
              header.from && header.from[0]
                ? {
                    text: header.from[0],
                    address: extractEmailAddress(header.from[0]),
                    name: extractDisplayName(header.from[0]),
                  }
                : null;

            email.to = header.to && header.to[0] ? header.to[0] : null;
            email.subject =
              header.subject && header.subject[0] ? header.subject[0] : null;
            email.date =
              header.date && header.date[0] ? new Date(header.date[0]) : null;
            email.messageId =
              header["message-id"] && header["message-id"][0]
                ? header["message-id"][0]
                : null;
          } else if (info.which === "TEXT") {
            // Store raw text part for later parsing
            email.textBuffer = buffer;
          } else if (info.which === "") {
            // Parse the full message, but do it asynchronously
            simpleParser(buffer)
              .then((parsed) => {
                // Update with more accurate parsed data
                if (!email.messageId && parsed.messageId) {
                  email.messageId = parsed.messageId;
                }

                if (parsed.from && parsed.from.text) {
                  email.from = parsed.from;
                }

                if (parsed.to) {
                  email.to = parsed.to;
                }

                if (parsed.subject) {
                  email.subject = parsed.subject;
                }

                if (parsed.date) {
                  email.date = parsed.date;
                }

                email.body = parsed.text;
                email.html = parsed.html;

                // Create a snippet from the text body
                if (parsed.text) {
                  email.snippet = parsed.text
                    .substring(0, 200)
                    .replace(/\n/g, " ");
                }

                if (parsed.attachments && parsed.attachments.length > 0) {
                  email.attachments = parsed.attachments.map((att) => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                  }));
                }
              })
              .catch((err) => {
                console.error(`Error parsing full message #${seqno}:`, err);
              });
          }
        });
      });

      // Get email UID and flags
      msg.once("attributes", (attrs) => {
        email.uid = attrs.uid;
        email.internalDate = attrs.date;
        email.flags = attrs.flags;
      });
    });

    fetch.once("error", (err) => {
      console.error("Fetch error:", err);
      imap.end();
      reject(new Error(`Error fetching emails: ${err.message}`));
    });

    fetch.once("end", () => {
      console.log("Fetch completed");

      // Wait a bit for parsing to complete
      setTimeout(() => {
        // Convert the map values to an array
        const fetchedEmails = Array.from(emailMap.values());

        // Check if any emails were parsed correctly
        console.log(`Fetched ${fetchedEmails.length} emails, validating...`);

        // Perform basic validation and fallback parsing if needed
        const validatedEmails = fetchedEmails.map((email) => {
          // If we don't have a parsed body but have a textBuffer, try to extract text
          if (!email.body && email.textBuffer) {
            try {
              // Simple extraction of plain text content
              email.body = email.textBuffer
                .replace(/=\r\n/g, "") // Remove soft line breaks
                .replace(/=([0-9A-F]{2})/g, (match, hex) =>
                  String.fromCharCode(parseInt(hex, 16))
                ) // Decode hex chars
                .replace(/[\r\n]+/g, "\n"); // Normalize line breaks

              // Create a snippet
              email.snippet = email.body.substring(0, 200).replace(/\n/g, " ");
            } catch (err) {
              console.error(
                `Error extracting text for email #${email.seqno}:`,
                err
              );
            }
          }

          // Return the potentially enhanced email
          return email;
        });

        // Add all validated emails to the result array
        emails.push(...validatedEmails);

        // Log message to help with debugging
        console.log(`Validated ${emails.length} emails, sorting by date...`);

        // Sort emails by date (newest first) with fallbacks for missing dates
        emails.sort((a, b) => {
          // Try different date fields with fallbacks
          const getDateValue = (email) => {
            if (email.date) return email.date.getTime();
            if (email.internalDate) return email.internalDate.getTime();
            if (email.headers && email.headers.date && email.headers.date[0])
              return new Date(email.headers.date[0]).getTime();
            return 0; // Fallback if no date available
          };

          return getDateValue(b) - getDateValue(a);
        });

        // Return only the requested number of emails after sorting
        const limitedEmails = emails.slice(0, limit);
        console.log(
          `Returning the ${limitedEmails.length} most recent emails by date`
        );

        imap.end();
        resolve(limitedEmails);
      }, 1000); // Give it 1 second for parsing to complete
    });
  } catch (err) {
    console.error("Fetch setup error:", err);
    imap.end();
    reject(new Error(`Error setting up fetch: ${err.message}`));
  }
}

/**
 * Helper function to extract email address from a string like "Name <email@example.com>"
 */
function extractEmailAddress(emailString) {
  if (!emailString) return null;

  const match = emailString.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1];
  }

  // If no angle brackets, check if it's just an email address
  if (emailString.includes("@")) {
    return emailString.trim();
  }

  return null;
}

/**
 * Helper function to extract display name from a string like "Name <email@example.com>"
 */
function extractDisplayName(emailString) {
  if (!emailString) return null;

  const match = emailString.match(/^([^<]+)</);
  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Fetches emails from a specific folder
 * @param {string} email - User's email address.
 * @param {string} accessToken - OAuth2 access token (not used in password auth mode).
 * @param {string} folder - Folder name to fetch from
 * @param {number} limit - Number of emails to fetch (default 10)
 * @param {number} page - Page number for pagination (default 1)
 * @returns {Promise<Array>} - Promise that resolves to array of emails
 */
export const fetchEmailsFromFolder = (
  email,
  accessToken,
  folder,
  limit = 10,
  page = 1
) => {
  return fetchEmails(email, accessToken, limit, folder, page);
};
