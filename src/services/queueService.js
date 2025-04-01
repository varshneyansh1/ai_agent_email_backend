import dotenv from "dotenv";
import emailService from "./emailService.js";
import { saveEmail } from "../models/emailModel.js";

dotenv.config();

// In-memory storage for scheduled jobs
const scheduledJobs = new Map();
let jobIdCounter = 1;

/**
 * Process emails directly without using a queue
 * @param {number} userId - The user's ID
 * @param {string} userEmail - The user's email address
 * @param {string} accessToken - OAuth2 access token
 * @returns {Promise<Object>} - Result of the email processing
 */
export const processEmails = async (userId, userEmail, accessToken) => {
  try {
    console.log(`Processing email fetch for user: ${userEmail}`);

    // Fetch emails
    const emails = await emailService.getInbox(userEmail, accessToken, 20);

    // Save new emails to database
    const savedEmails = [];
    for (const email of emails) {
      try {
        const savedEmail = await saveEmail(
          userId,
          email.from,
          email.subject,
          email.body,
          email.date
        );
        savedEmails.push(savedEmail);
      } catch (error) {
        console.error(`Error saving email: ${error.message}`);
      }
    }

    console.log(
      `Processed ${emails.length} emails, saved ${savedEmails.length}.`
    );
    return { processed: emails.length, saved: savedEmails.length };
  } catch (error) {
    console.error(`Error processing emails: ${error.message}`);
    throw error;
  }
};

/**
 * Send an email directly without using a queue
 * @param {Object} emailData - Data for sending an email
 * @returns {Promise<Object>} - Result of the send operation
 */
export const sendEmailDirectly = async (emailData) => {
  const {
    userEmail,
    accessToken,
    recipient,
    subject,
    body,
    htmlBody,
    attachments,
  } = emailData;

  try {
    console.log(`Sending email for user: ${userEmail}`);

    // Send the email
    const result = await emailService.sendEmail(
      userEmail,
      accessToken,
      recipient,
      subject,
      body,
      htmlBody,
      attachments
    );

    console.log(`Email sent successfully: ${result.message}`);
    return result;
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

/**
 * Add a job to fetch and process emails for a user (simplified without queue)
 * @param {number} userId - The user's ID
 * @param {string} userEmail - The user's email address
 * @param {string} accessToken - OAuth2 access token
 * @returns {Promise<Object>} - Result of the email processing
 */
export const scheduleEmailFetch = async (userId, userEmail, accessToken) => {
  return processEmails(userId, userEmail, accessToken);
};

/**
 * Add a job to send an email (simplified without queue)
 * @param {Object} emailData - Data for sending an email
 * @returns {Promise<Object>} - Result of the send operation
 */
export const scheduleSendEmail = async (emailData) => {
  return sendEmailDirectly(emailData);
};

/**
 * Set up recurring email fetch using simple setInterval
 * @param {Array} users - Array of user objects
 * @param {number} interval - Interval in minutes
 */
export const scheduleRecurringEmailFetch = (users, interval = 10) => {
  // Convert interval to milliseconds
  const intervalMs = interval * 60 * 1000;

  // Schedule for each user
  users.forEach((user) => {
    const intervalId = setInterval(() => {
      processEmails(user.id, user.email, user.access_token).catch((error) =>
        console.error(`Scheduled job error for ${user.email}:`, error)
      );
    }, intervalMs);

    // Store the interval ID so it can be cleared later if needed
    const jobId = jobIdCounter++;
    scheduledJobs.set(jobId, {
      userId: user.id,
      userEmail: user.email,
      intervalId,
    });

    console.log(
      `Scheduled recurring email fetch for ${user.email} every ${interval} minutes`
    );
  });
};

/**
 * Stop a recurring job
 * @param {number} jobId - The ID of the job to stop
 * @returns {boolean} - Whether the job was successfully stopped
 */
export const stopRecurringJob = (jobId) => {
  const job = scheduledJobs.get(jobId);
  if (job) {
    clearInterval(job.intervalId);
    scheduledJobs.delete(jobId);
    console.log(`Stopped recurring job for ${job.userEmail}`);
    return true;
  }
  return false;
};

export default {
  scheduleEmailFetch,
  scheduleSendEmail,
  scheduleRecurringEmailFetch,
  stopRecurringJob,
  getScheduledJobs: () => Array.from(scheduledJobs.entries()),
};
