import { HfInference } from "@huggingface/inference";
import { split } from "sentence-splitter";
import { getEmailsByUser } from "../models/emailModel.js";
import {
  getStyleProfile,
  saveStyleProfile,
} from "../models/userStyleProfileModel.js";
import emailService from "./emailService.js";
import dotenv from "dotenv";

dotenv.config();

// Initialize HuggingFace inference
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const SENTIMENT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english";

/**
 * StyleAnalyzerService handles the analysis of user writing style
 * from previous emails to create a style profile
 */
class StyleAnalyzerService {
  constructor() {
    this.hf = hf;
  }

  /**
   * Analyzes a user's emails to extract their writing style
   * Automatically fetches emails from the sent folder if available
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Style profile data
   */
  async analyzeUserStyle(userId) {
    try {
      // Get the user's existing style profile, if any
      const existingProfile = await getStyleProfile(userId);
      if (existingProfile) {
        const lastUpdated = new Date(existingProfile.last_updated);
        const now = new Date();
        // If profile is less than 7 days old, return it without reanalyzing
        if ((now - lastUpdated) / (1000 * 60 * 60 * 24) < 7) {
          console.log("Using existing style profile (less than 7 days old)");
          return existingProfile;
        }
      }

      // Try to get emails from the user's sent folder first
      let emailTexts = [];
      try {
        // First try to get emails from the sent folder via IMAP
        console.log("Attempting to fetch emails from sent folder...");
        const userEmail = await this.getUserEmailFromId(userId);

        if (userEmail) {
          // Fetch emails from the sent folder
          const sentEmails = await emailService.getFolder(
            userEmail,
            "dummy-token",
            "[Gmail]/Sent Mail",
            20
          );
          if (sentEmails && sentEmails.length > 0) {
            console.log(
              `Successfully fetched ${sentEmails.length} emails from sent folder`
            );
            emailTexts = sentEmails.map(
              (email) => email.body || email.text || ""
            );
          }
        }
      } catch (error) {
        console.warn(
          "Error fetching from sent folder, will try database:",
          error.message
        );
      }

      // If we couldn't get sent emails, fall back to emails in the database
      if (emailTexts.length === 0) {
        console.log("Falling back to emails stored in database...");
        const dbEmails = await getEmailsByUser(userId);
        if (!dbEmails || dbEmails.length === 0) {
          throw new Error("No emails found for this user");
        }
        emailTexts = dbEmails.map((email) => email.body);
        console.log(
          `Found ${emailTexts.length} emails in database for analysis`
        );
      }

      return this.analyzeEmailTexts(userId, emailTexts);
    } catch (error) {
      console.error("Style analysis error:", error);
      throw new Error(`Failed to analyze user style: ${error.message}`);
    }
  }

  /**
   * Helper function to get a user's email address from their ID
   * @param {number} userId - User ID
   * @returns {Promise<string|null>} - User's email address or null
   */
  async getUserEmailFromId(userId) {
    try {
      // Simplified mock implementation - in a real app, this would query the users table
      // For now, just use the EMAIL_USER from environment variables
      return process.env.EMAIL_USER || null;
    } catch (error) {
      console.error("Error getting user email:", error);
      return null;
    }
  }

  /**
   * Analyzes specific email texts to extract writing style
   * This allows analyzing just a subset of emails (e.g., only sent emails)
   * @param {number} userId - User ID
   * @param {Array<string>} emailTexts - Array of email body texts to analyze
   * @returns {Promise<Object>} - Style profile data
   */
  async analyzeEmailTexts(userId, emailTexts) {
    try {
      if (!emailTexts || emailTexts.length === 0) {
        throw new Error("No email texts provided for analysis");
      }

      // Analyze various style aspects
      const commonPhrases = await this.extractCommonPhrases(emailTexts);
      const toneScore = await this.analyzeTone(emailTexts);
      const formalityScore = await this.analyzeFormality(emailTexts);
      const avgSentenceLength = this.calculateAvgSentenceLength(emailTexts);
      const { greetingStyle, signature } =
        this.extractGreetingAndSignature(emailTexts);

      // Create embeddings of user's writing style
      const styleEmbeddings = await this.generateStyleEmbeddings(emailTexts);

      // Combine all analysis into a style profile
      const styleProfile = {
        common_phrases: commonPhrases,
        tone_score: toneScore,
        formality_score: formalityScore,
        avg_sentence_length: avgSentenceLength,
        greeting_style: greetingStyle,
        signature: signature,
        style_data: {
          embeddings: styleEmbeddings,
        },
      };

      // Save the style profile
      return await saveStyleProfile(userId, styleProfile);
    } catch (error) {
      console.error("Style analysis error:", error);
      throw new Error(`Failed to analyze email texts: ${error.message}`);
    }
  }

  /**
   * Extract common phrases from email texts
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {Promise<Array<string>>} - Array of common phrases
   */
  async extractCommonPhrases(emailTexts) {
    // Simple n-gram extraction for common phrases
    const phrases = [];
    const combinedText = emailTexts.join(" ");

    // Split into sentences
    const sentences = split(combinedText);

    // Extract common greeting and closing phrases
    for (const sentence of sentences) {
      if (sentence.type !== "Sentence") continue;
      const text = sentence.raw.trim().toLowerCase();

      // Check for greeting phrases
      if (
        text.startsWith("hi") ||
        text.startsWith("hello") ||
        text.startsWith("dear") ||
        text.startsWith("greetings") ||
        text.startsWith("good morning") ||
        text.startsWith("good afternoon") ||
        text.startsWith("good evening")
      ) {
        phrases.push(sentence.raw.trim());
      }

      // Check for closing phrases
      if (
        text.includes("regards") ||
        text.includes("sincerely") ||
        text.includes("best wishes") ||
        text.includes("thank you") ||
        text.includes("thanks") ||
        text.includes("yours truly")
      ) {
        phrases.push(sentence.raw.trim());
      }
    }

    // Return unique phrases, up to 10
    return [...new Set(phrases)].slice(0, 10);
  }

  /**
   * Analyze the tone of email texts
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {Promise<number>} - Tone score between 0 (negative) and 1 (positive)
   */
  async analyzeTone(emailTexts) {
    try {
      // Use a sentiment analysis model to detect tone
      const combinedText = emailTexts.join(" ").slice(0, 2000); // Limit text size

      const response = await this.hf.textClassification({
        model: SENTIMENT_MODEL,
        inputs: combinedText,
      });

      // Extract positive sentiment score
      const positiveScore =
        response.find((r) => r.label === "POSITIVE")?.score || 0.5;
      return positiveScore;
    } catch (error) {
      console.error("Error analyzing tone:", error);
      return 0.5; // Default neutral tone
    }
  }

  /**
   * Analyze the formality of email texts
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {Promise<number>} - Formality score between 0 (casual) and 1 (formal)
   */
  async analyzeFormality(emailTexts) {
    // For this demo, we'll use a simple heuristic based on keywords
    const formalKeywords = [
      "sincerely",
      "regards",
      "dear",
      "request",
      "kindly",
      "please",
      "thank you",
      "appreciate",
      "consideration",
      "formally",
      "would like to",
      "pursuant",
      "reference",
      "acknowledge",
      "opportunity",
    ];

    const casualKeywords = [
      "hey",
      "hi",
      "thanks",
      "cheers",
      "cool",
      "awesome",
      "btw",
      "gonna",
      "wanna",
      "yeah",
      "yep",
      "nope",
      "lol",
      "haha",
      "sure thing",
      "no worries",
    ];

    let formalCount = 0;
    let casualCount = 0;

    const combinedText = emailTexts.join(" ").toLowerCase();

    for (const word of formalKeywords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = combinedText.match(regex);
      if (matches) {
        formalCount += matches.length;
      }
    }

    for (const word of casualKeywords) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = combinedText.match(regex);
      if (matches) {
        casualCount += matches.length;
      }
    }

    // Calculate formality score between 0 and 1
    if (formalCount + casualCount === 0) return 0.5;

    return formalCount / (formalCount + casualCount);
  }

  /**
   * Calculate average sentence length
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {number} - Average sentence length
   */
  calculateAvgSentenceLength(emailTexts) {
    let totalSentences = 0;
    let totalWords = 0;

    for (const text of emailTexts) {
      const sentences = split(text);
      totalSentences += sentences.filter((s) => s.type === "Sentence").length;

      // Count words in the text
      const words = text.split(/\s+/);
      totalWords += words.length;
    }

    if (totalSentences === 0) return 15; // Default average

    return totalWords / totalSentences;
  }

  /**
   * Extract greeting style and signature from emails
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {Object} - Object containing greeting style and signature
   */
  extractGreetingAndSignature(emailTexts) {
    let greetings = [];
    let signatures = [];

    for (const text of emailTexts) {
      // Extract greeting (first line)
      const lines = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (lines.length > 0) {
        const firstLine = lines[0];
        if (
          /^(hi|hello|dear|greetings|good morning|good afternoon|good evening)/i.test(
            firstLine
          )
        ) {
          greetings.push(firstLine);
        }
      }

      // Extract signature (last few lines)
      if (lines.length > 2) {
        const lastLines = lines.slice(-3);
        const potentialSignature = lastLines.join("\n");
        if (
          /regards|sincerely|best wishes|thank you|thanks|cheers/i.test(
            potentialSignature
          )
        ) {
          signatures.push(potentialSignature);
        }
      }
    }

    // Find most common greeting and signature
    const mostCommonGreeting = this.findMostCommon(greetings) || "Hi,";
    const mostCommonSignature = this.findMostCommon(signatures) || "Regards,";

    return {
      greetingStyle: mostCommonGreeting,
      signature: mostCommonSignature,
    };
  }

  /**
   * Find the most common item in an array
   * @param {Array<string>} items - Array of items
   * @returns {string|null} - Most common item or null if array is empty
   */
  findMostCommon(items) {
    if (items.length === 0) return null;

    const frequency = {};
    let maxFreq = 0;
    let mostCommon = items[0];

    for (const item of items) {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxFreq) {
        maxFreq = frequency[item];
        mostCommon = item;
      }
    }

    return mostCommon;
  }

  /**
   * Generate embeddings for user's writing style
   * @param {Array<string>} emailTexts - Array of email body texts
   * @returns {Promise<Array<number>>} - Averaged embedding vector
   */
  async generateStyleEmbeddings(emailTexts) {
    try {
      // Use a reasonable sample of text to generate embeddings
      const combinedText = emailTexts.join(" ").slice(0, 5000); // Limit text size

      // Get embedding from Hugging Face
      const response = await this.hf.featureExtraction({
        model: EMBEDDING_MODEL,
        inputs: combinedText,
      });

      return response; // This is an array of numbers (the embedding vector)
    } catch (error) {
      console.error("Error generating embeddings:", error);
      return []; // Return empty array on error
    }
  }
}

export default new StyleAnalyzerService();
