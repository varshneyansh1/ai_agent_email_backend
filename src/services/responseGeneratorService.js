import { split } from "sentence-splitter";
import styleAnalyzerService from "./styleAnalyzerService.js";
import { getStyleProfile } from "../models/userStyleProfileModel.js";
import dotenv from "dotenv";

dotenv.config();

// Ollama API settings
const OLLAMA_API_URL =
  process.env.OLLAMA_API_URL || "http://localhost:11434/api/generate";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const LOCAL_LLM_ENABLED = true; // Default to true since we're using Ollama

/**
 * ResponseGeneratorService generates AI email responses based on user style
 */
class ResponseGeneratorService {
  /**
   * Generate a response to an email using LLM and apply user's style
   * @param {number} userId - User ID
   * @param {string} emailContent - Content of the email to respond to
   * @returns {Promise<Object>} - Generated response and confidence score
   */
  async generateResponse(userId, emailContent) {
    try {
      // Get or create the user's style profile
      let styleProfile = await getStyleProfile(userId);
      if (!styleProfile) {
        styleProfile = await styleAnalyzerService.analyzeUserStyle(userId);
      }

      // Generate base response with LLM
      const baseResponse = await this.generateBaseResponse(emailContent);

      // Apply user's style to the response
      const styledResponse = await this.applyUserStyle(
        baseResponse,
        styleProfile
      );

      // Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(
        emailContent,
        styledResponse,
        baseResponse
      );

      return {
        response: styledResponse,
        confidence: confidenceScore,
        raw_llm_response: baseResponse,
      };
    } catch (error) {
      console.error("Response generation error:", error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate a response to an email with custom instructions and apply user's style
   * @param {number} userId - User ID
   * @param {string} emailContent - Content of the email to respond to
   * @param {string} instructions - Custom instructions for reply generation
   * @returns {Promise<Object>} - Generated response and confidence score
   */
  async generateInstructedResponse(userId, emailContent, instructions) {
    try {
      // Get or create the user's style profile
      let styleProfile = await getStyleProfile(userId);
      if (!styleProfile) {
        styleProfile = await styleAnalyzerService.analyzeUserStyle(userId);
      }

      // Generate base response with LLM using custom instructions
      const customPrompt = this.createInstructedPrompt(
        emailContent,
        instructions
      );
      const baseResponse = await this.generateWithOllama(customPrompt);

      // Apply user's style to the response
      const styledResponse = await this.applyUserStyle(
        baseResponse,
        styleProfile
      );

      // Calculate confidence score
      const confidenceScore = await this.calculateConfidenceScore(
        emailContent,
        styledResponse,
        baseResponse
      );

      return {
        response: styledResponse,
        confidence: confidenceScore,
        raw_llm_response: baseResponse,
      };
    } catch (error) {
      console.error("Instructed response generation error:", error);
      throw new Error(
        `Failed to generate instructed response: ${error.message}`
      );
    }
  }

  /**
   * Create a prompt that incorporates custom instructions
   * @param {string} emailContent - Original email content
   * @param {string} instructions - Custom instructions for response generation
   * @returns {string} - Complete prompt for LLM
   */
  createInstructedPrompt(emailContent, instructions) {
    // Try to extract key information from the email
    const emailLines = emailContent.split("\n");
    let cleanedContent = emailContent;

    // Try to remove quoted content (common in replies)
    if (emailContent.includes(">")) {
      const nonQuotedLines = emailLines.filter(
        (line) => !line.trim().startsWith(">")
      );
      if (nonQuotedLines.length > 0) {
        cleanedContent = nonQuotedLines.join("\n");
      }
    }

    // Create a custom prompt with the user's instructions
    return `You are an AI email assistant. Your task is to write a response to the following email according to these specific instructions:

INSTRUCTIONS FROM USER:
${instructions}

EMAIL TO REPLY TO:
${cleanedContent}

Follow the user's instructions carefully to craft the email reply. The tone, style, and content should match what was requested in the instructions.
Make sure the response addresses the key points in the original email.
Don't include any salutations or signatures, as they will be added later.
Your response should be 2-4 paragraphs long.

EMAIL RESPONSE:`;
  }

  /**
   * Generate base response using Ollama with Llama 3.1 model
   * @param {string} emailContent - Content of the email to respond to
   * @returns {Promise<string>} - Generated response
   */
  async generateBaseResponse(emailContent) {
    try {
      // Set up prompt for LLM
      const prompt = this.createResponsePrompt(emailContent);
      return await this.generateWithOllama(prompt);
    } catch (error) {
      console.error("Error generating base response:", error);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Create a prompt for the LLM to generate an email response
   * @param {string} emailContent - Content of the email to respond to
   * @returns {string} - Complete prompt
   */
  createResponsePrompt(emailContent) {
    // Try to extract key information from the email
    const emailLines = emailContent.split("\n");
    let cleanedContent = emailContent;

    // Try to remove quoted content (common in replies)
    if (emailContent.includes(">")) {
      const nonQuotedLines = emailLines.filter(
        (line) => !line.trim().startsWith(">")
      );
      if (nonQuotedLines.length > 0) {
        cleanedContent = nonQuotedLines.join("\n");
      }
    }

    // Try to detect questions or action items in the email
    const hasQuestion = emailContent.includes("?");
    const actionWords = [
      "please",
      "could you",
      "would you",
      "need",
      "required",
      "send",
      "review",
      "provide",
    ];
    const hasActionItem = actionWords.some((word) =>
      emailContent.toLowerCase().includes(word.toLowerCase())
    );

    // Create a more detailed and contextual prompt based on email content
    return `You are an AI email assistant. Your task is to write a concise, appropriate response to the following email:

EMAIL:
${cleanedContent}

${
  hasQuestion
    ? "This email contains a question that you should address in your response."
    : ""
}
${
  hasActionItem
    ? "This email likely contains a request or action item that you should acknowledge."
    : ""
}

Write a helpful, clear and professional response that directly addresses the key points in the email.
Make sure to respond to any questions or requests.

Your response should be 2-4 paragraphs long.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Do NOT copy or repeat any lines from the original email in your response
2. Do NOT include a subject line in your response
3. Do NOT include any email headers (From:, To:, Subject:, etc.)
4. Start with a proper greeting like "Dear [Name]," or "Hello [Name],"
5. End with a proper closing like "Best regards," or "Thank you,"
6. Only write the body of the email - no headers or metadata

EMAIL RESPONSE:`;
  }

  /**
   * Generate response using Ollama API with Llama 3.1
   * @param {string} prompt - Prompt for LLM
   * @returns {Promise<string>} - Generated response
   */
  async generateWithOllama(prompt) {
    try {
      const response = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 500,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      let generatedText = result.response || "";

      // Extract just the response part and clean formatting
      const responseStartIdx = generatedText.indexOf("EMAIL RESPONSE:");
      if (responseStartIdx !== -1) {
        generatedText = generatedText
          .substring(responseStartIdx + "EMAIL RESPONSE:".length)
          .trim();
      }

      // Clean up the response to remove any contamination from original email
      generatedText = this.cleanResponseText(generatedText);

      return generatedText;
    } catch (error) {
      console.error("Error calling Ollama API:", error);
      throw error;
    }
  }

  /**
   * Clean the generated response text to remove unwanted elements
   * @param {string} text - Raw generated text
   * @returns {string} - Cleaned text
   */
  cleanResponseText(text) {
    if (!text) return "";

    // Split the text into lines
    const lines = text.split("\n");
    let cleanedLines = [];

    // Remove any lines that look like they're from the original email or contain subject/forwarding markers
    const removePatterns = [
      /^Hi\s*,\s*[A-Z]/i, // Matches lines starting with "Hi, Name" from original email
      /^Subject:/i, // Matches subject lines
      /^Fw:/i, // Matches forwarded email markers
      /^From:/i, // Matches from field
      /^To:/i, // Matches to field
      /^Cc:/i, // Matches cc field
      /^Bcc:/i, // Matches bcc field
      /^Date:/i, // Matches date field
      /^Sent:/i, // Matches sent field
      /^-{3,}/, // Matches email separators (---)
    ];

    // Find the first greeting line as the starting point for our clean response
    const greetingPatterns = [
      /^Dear\s+/i,
      /^Hello\s+/i,
      /^Hi\s+/i,
      /^Greetings/i,
      /^Good\s+(morning|afternoon|evening)/i,
      /^Thank\s+you/i,
    ];

    let foundStart = false;
    let skipCurrentSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines at the beginning
      if (!foundStart && line === "") {
        continue;
      }

      // Check if this is a line we should remove
      const shouldRemove = removePatterns.some((pattern) => pattern.test(line));

      // If we find a subject line or other email header, skip everything until we find a greeting
      if (shouldRemove) {
        skipCurrentSection = true;
        continue;
      }

      // Check if this is a greeting line
      const isGreeting = greetingPatterns.some((pattern) => pattern.test(line));

      // If we found a greeting, mark that we've found the start and stop skipping
      if (isGreeting) {
        foundStart = true;
        skipCurrentSection = false;
      }

      // Only include the line if we're not skipping the current section
      if (!skipCurrentSection) {
        cleanedLines.push(line);
      }
    }

    // If we didn't find any greeting, but there's content, return all non-header content
    if (!foundStart && lines.length > 0) {
      return lines
        .filter(
          (line) => !removePatterns.some((pattern) => pattern.test(line.trim()))
        )
        .join("\n");
    }

    return cleanedLines.join("\n");
  }

  /**
   * Apply user's writing style to the base response
   * @param {string} baseResponse - Raw LLM generated response
   * @param {Object} styleProfile - User's style profile
   * @returns {Promise<string>} - Styled response
   */
  async applyUserStyle(baseResponse, styleProfile) {
    // Start with user's greeting style if available
    let styledResponse = styleProfile.greeting_style
      ? `${styleProfile.greeting_style}\n\n`
      : "Hi,\n\n";

    // Split the base response into sentences
    const sentences = split(baseResponse);
    let processedText = "";

    // Apply styling to each sentence based on user profile
    for (const sentence of sentences) {
      if (sentence.type !== "Sentence") {
        processedText += sentence.raw;
        continue;
      }

      let modifiedSentence = sentence.raw;

      // Adjust sentence length based on user's average
      const userAvgLength = styleProfile.avg_sentence_length || 15;
      const currentLength = sentence.raw.split(/\s+/).length;

      if (Math.abs(currentLength - userAvgLength) > 5) {
        if (currentLength > userAvgLength + 5) {
          // Sentence is too long, simplify it
          modifiedSentence = this.simplifySentence(sentence.raw);
        } else if (currentLength < userAvgLength - 5) {
          // Sentence is too short, consider expanding it
          // This is a simplistic approach; real expansion would be more sophisticated
          modifiedSentence = this.expandSentence(sentence.raw);
        }
      }

      processedText += modifiedSentence;
    }

    // Add the processed content to the response
    styledResponse += processedText;

    // Add common phrases if appropriate places are found
    if (styleProfile.common_phrases && styleProfile.common_phrases.length > 0) {
      const phrases = styleProfile.common_phrases;

      // Look for appropriate places to insert phrases
      // This is a simplistic approach
      if (Math.random() > 0.7 && phrases.length > 0) {
        const randomPhraseIndex = Math.floor(Math.random() * phrases.length);
        const phrase = phrases[randomPhraseIndex];

        if (
          phrase.toLowerCase().includes("thank") ||
          phrase.toLowerCase().includes("appreciate")
        ) {
          styledResponse += `\n\n${phrase}`;
        }
      }
    }

    // Add user's signature
    if (styleProfile.signature) {
      styledResponse += `\n\n${styleProfile.signature}`;
    } else {
      styledResponse += "\n\nRegards,";
    }

    return styledResponse;
  }

  /**
   * Simplify a sentence (for long sentences)
   * @param {string} sentence - Original sentence
   * @returns {string} - Simplified sentence
   */
  simplifySentence(sentence) {
    // This is a placeholder; a real implementation would use NLP
    // to intelligently simplify the sentence
    return sentence;
  }

  /**
   * Expand a sentence (for short sentences)
   * @param {string} sentence - Original sentence
   * @returns {string} - Expanded sentence
   */
  expandSentence(sentence) {
    // This is a placeholder; a real implementation would use NLP
    // to intelligently expand the sentence
    return sentence;
  }

  /**
   * Calculate confidence score for the generated response
   * @param {string} originalEmail - Original email content
   * @param {string} response - Generated response
   * @param {string} rawResponse - Raw LLM response before styling
   * @returns {Promise<number>} - Confidence score between 0 and 1
   */
  async calculateConfidenceScore(originalEmail, response, rawResponse) {
    try {
      // Calculate semantic similarity between email and response using Ollama embeddings
      const similarityScore = await this.calculateSemanticSimilarity(
        originalEmail,
        response
      );

      // Calculate fluency score
      const fluencyScore = this.calculateFluencyScore(response);

      // Calculate coherence between raw and styled response
      const coherenceScore = await this.calculateSemanticSimilarity(
        rawResponse,
        response
      );

      // Combine scores with weights
      const combinedScore =
        similarityScore * 0.5 + fluencyScore * 0.3 + coherenceScore * 0.2;

      // Ensure score is between 0 and 1
      return Math.min(Math.max(combinedScore, 0), 1);
    } catch (error) {
      console.error("Error calculating confidence score:", error);
      return 0.75; // Default reasonable confidence
    }
  }

  /**
   * Calculate semantic similarity between two texts using Ollama embeddings
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {Promise<number>} - Similarity score between 0 and 1
   */
  async calculateSemanticSimilarity(text1, text2) {
    try {
      // Generate embeddings for both texts using Ollama
      const embedding1 = await this.getEmbedding(text1.slice(0, 5000));
      const embedding2 = await this.getEmbedding(text2.slice(0, 5000));

      // Calculate cosine similarity
      return this.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      console.error("Error calculating semantic similarity:", error);
      return 0.7; // Default similarity
    }
  }

  /**
   * Get embeddings from Ollama
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async getEmbedding(text) {
    try {
      const response = await fetch(
        `${
          process.env.OLLAMA_EMBEDDINGS_URL ||
          "http://localhost:11434/api/embeddings"
        }`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.OLLAMA_EMBEDDING_MODEL || "llama3.1", // Use appropriate embedding model
            prompt: text,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result.embedding || [];
    } catch (error) {
      console.error("Error getting embeddings from Ollama:", error);
      // Return a dummy vector in case of error
      return Array(768)
        .fill(0)
        .map(() => Math.random());
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Array<number>} vec1 - First vector
   * @param {Array<number>} vec2 - Second vector
   * @returns {number} - Similarity score between 0 and 1
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1.length || !vec2.length || vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }

    return dotProduct / (mag1 * mag2);
  }

  /**
   * Calculate fluency score based on simple heuristics
   * @param {string} text - Text to evaluate
   * @returns {number} - Fluency score between 0 and 1
   */
  calculateFluencyScore(text) {
    // Basic fluency checks:
    // 1. Check for reasonable sentence length
    const sentences = split(text);
    const sentenceLengths = sentences
      .filter((s) => s.type === "Sentence")
      .map((s) => s.raw.split(/\s+/).length);

    if (sentenceLengths.length === 0) return 0.5;

    const avgSentenceLength =
      sentenceLengths.reduce((sum, len) => sum + len, 0) /
      sentenceLengths.length;

    // Penalize very short or very long sentences
    let lengthScore = 1;
    if (avgSentenceLength < 3 || avgSentenceLength > 40) {
      lengthScore = 0.5;
    } else if (avgSentenceLength < 5 || avgSentenceLength > 30) {
      lengthScore = 0.8;
    }

    // 2. Check for repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    const maxRepetition = Math.max(...Object.values(wordFreq));
    const repetitionScore = Math.max(0, 1 - (maxRepetition - 5) / 10);

    // Combine scores
    return lengthScore * 0.6 + repetitionScore * 0.4;
  }
}

export default new ResponseGeneratorService();
