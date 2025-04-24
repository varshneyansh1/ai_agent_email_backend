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
 * @returns {Promise<Array>} - Promise that resolves to array of emails
 */
export const fetchEmails = (
  email,
  accessToken,
  limit = 10,
  mailbox = "INBOX"
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

                fetchEmailsFromBox(imap, box2, limit, emails, resolve, reject);
              });
              return;
            }

            imap.end();
            return reject(
              new Error(`Error opening mailbox ${gmailMailbox}: ${err.message}`)
            );
          }

          fetchEmailsFromBox(imap, box, limit, emails, resolve, reject);
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
function fetchEmailsFromBox(imap, box, limit, emails, resolve, reject) {
  console.log(`Mailbox opened with ${box.messages.total} messages`);

  // If no messages, return empty array
  if (box.messages.total === 0) {
    imap.end();
    return resolve([]);
  }

  // Fetch more emails than requested to ensure we get the most recent ones after sorting
  // Use a multiplier to fetch more messages than the limit
  const fetchMultiplier = 3;
  const fetchLimit = Math.min(limit * fetchMultiplier, box.messages.total);

  // Calculate start message (total - fetchLimit or 1 if total < fetchLimit)
  const start =
    box.messages.total > fetchLimit ? box.messages.total - fetchLimit + 1 : 1;
  const range = `${start}:${box.messages.total}`;
  console.log(
    `Fetching email range: ${range} (${fetchLimit} emails to ensure getting the most recent ${limit})`
  );

  const fetchOptions = {
    bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
    struct: true,
    markSeen: false,
  };

  try {
    const fetch = imap.seq.fetch(range, fetchOptions);

    fetch.on("message", (msg, seqno) => {
      const email = {
        seqno,
        id: null,
        from: null,
        to: null,
        subject: null,
        date: null,
        body: null,
        html: null,
        attachments: [],
      };

      console.log(`Processing message #${seqno}`);

      msg.on("body", (stream, info) => {
        let buffer = "";

        stream.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
        });

        stream.once("end", () => {
          if (info.which.includes("HEADER")) {
            const header = Imap.parseHeader(buffer);
            email.from = header.from ? header.from[0] : null;
            email.to = header.to ? header.to[0] : null;
            email.subject = header.subject ? header.subject[0] : null;
            email.date = header.date ? new Date(header.date[0]) : null;
          } else {
            // Parse the email body
            simpleParser(buffer, (err, parsed) => {
              if (err) {
                console.error("Error parsing email:", err);
                return;
              }

              email.id = parsed.messageId;
              email.body = parsed.text;
              email.html = parsed.html;

              if (parsed.attachments && parsed.attachments.length > 0) {
                email.attachments = parsed.attachments.map((att) => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size,
                }));
              }

              // Add to emails array
              emails.push(email);
            });
          }
        });
      });
    });

    fetch.once("error", (err) => {
      console.error("Fetch error:", err);
      imap.end();
      reject(new Error(`Error fetching emails: ${err.message}`));
    });

    fetch.once("end", () => {
      console.log("Fetch completed");
      imap.end();

      // Log message to help with debugging
      console.log(`Fetched ${emails.length} emails, sorting by date...`);

      // Sort emails by date (newest first)
      emails.sort((a, b) => {
        const dateA = a.date ? a.date.getTime() : 0;
        const dateB = b.date ? b.date.getTime() : 0;
        return dateB - dateA;
      });

      // Return only the requested number of emails after sorting
      const limitedEmails = emails.slice(0, limit);
      console.log(
        `Returning the ${limitedEmails.length} most recent emails by date`
      );

      resolve(limitedEmails);
    });
  } catch (err) {
    console.error("Fetch setup error:", err);
    imap.end();
    reject(new Error(`Error setting up fetch: ${err.message}`));
  }
}

/**
 * Fetches emails from a specific folder
 * @param {string} email - User's email address
 * @param {string} accessToken - OAuth2 access token
 * @param {string} folder - Folder name (e.g., "Sent", "Drafts")
 * @param {number} limit - Number of emails to fetch
 * @returns {Promise<Array>} - Promise that resolves to array of emails
 */
export const fetchEmailsFromFolder = (
  email,
  accessToken,
  folder,
  limit = 10
) => {
  return fetchEmails(email, accessToken, limit, folder);
};
