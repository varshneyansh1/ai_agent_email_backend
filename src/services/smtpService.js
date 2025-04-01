import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Sends an email using Gmail's SMTP with direct password auth for testing.
 * @param {string} senderEmail - Sender's email.
 * @param {string} accessToken - OAuth2 access token (not used in password mode).
 * @param {string} recipient - Recipient's email.
 * @param {string} subject - Email subject.
 * @param {string} body - Email body (plain text).
 * @param {string} htmlBody - HTML version of the email body (optional).
 * @param {Array} attachments - Array of attachment objects (optional).
 * @returns {Promise<Object>} - Promise with the email sending result.
 */
export const sendEmail = async (
  senderEmail,
  accessToken,
  recipient,
  subject,
  body,
  htmlBody = null,
  attachments = []
) => {
  try {
    console.log(`Preparing to send email to ${recipient}`);
    // Create reusable transporter with password auth (for testing)
    // In production, use OAuth2 auth
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || senderEmail,
        pass: process.env.EMAIL_PASS,
      },
      // Add some options for better reliability
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
    });

    // Setup email options
    const mailOptions = {
      from: process.env.EMAIL_USER || senderEmail,
      to: recipient,
      subject,
      text: body, // Plain text body
    };

    // Add HTML version if provided
    if (htmlBody) {
      mailOptions.html = htmlBody;
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    console.log(`Sending email with subject: ${subject}`);
    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);

    return {
      message: "Email sent successfully",
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Sends an email with HTML content.
 * This is a convenience method wrapping sendEmail.
 */
export const sendHtmlEmail = async (
  senderEmail,
  accessToken,
  recipient,
  subject,
  plainText,
  htmlContent,
  attachments = []
) => {
  return sendEmail(
    senderEmail,
    accessToken,
    recipient,
    subject,
    plainText,
    htmlContent,
    attachments
  );
};

/**
 * Sends a reply to an email.
 * @param {string} senderEmail - Sender's email.
 * @param {string} accessToken - OAuth2 access token (not used in password mode).
 * @param {string} recipient - Recipient's email.
 * @param {string} subject - Email subject (usually "Re: Original Subject").
 * @param {string} body - Email body.
 * @param {string} htmlBody - HTML version of the body (optional).
 * @param {string} inReplyTo - Message ID being replied to.
 * @param {string} references - References header for threading.
 * @returns {Promise<Object>} - Promise with the email sending result.
 */
export const sendReply = async (
  senderEmail,
  accessToken,
  recipient,
  subject,
  body,
  htmlBody = null,
  inReplyTo = null,
  references = null
) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER || senderEmail,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER || senderEmail,
      to: recipient,
      subject: subject.startsWith("Re:") ? subject : `Re: ${subject}`,
      text: body,
    };

    if (htmlBody) {
      mailOptions.html = htmlBody;
    }

    // Add email threading headers if available
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
    }

    if (references) {
      mailOptions.references = references;
    }

    const info = await transporter.sendMail(mailOptions);
    return {
      message: "Reply sent successfully",
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("Error sending reply:", error);
    throw new Error(`Failed to send reply: ${error.message}`);
  }
};
