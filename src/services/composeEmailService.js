import translationService from "./translationService.js";
import config from "../config.js";

/**
 * ComposeEmailService handles generating email drafts based on user instructions
 * Can process instructions in any language and generate appropriate emails
 */
class ComposeEmailService {
  /**
   * Compose an email based on user instructions
   * @param {string} instructions - User instructions in any language
   * @returns {Promise<Object>} - Generated email draft with metadata
   */
  async composeEmail(instructions) {
    try {
      // Step 1: Detect the language of the instructions
      let detectedLanguage = "en"; // Default to English
      let translatedInstructions = instructions;
      let originalLanguage = "en";
      let wasTranslated = false;

      try {
        // Try to detect language
        detectedLanguage = await translationService.detectLanguage(
          instructions
        );
        originalLanguage = detectedLanguage;

        // Step 2: Translate instructions to English if not already in English
        if (detectedLanguage !== "en") {
          const translationResult = await translationService.translateText(
            instructions,
            "en",
            detectedLanguage
          );
          translatedInstructions = translationResult.translatedText;
          wasTranslated = true;
        }
      } catch (translationError) {
        console.warn(
          "Translation failed, proceeding with original instructions:",
          translationError.message
        );
        // Continue with original instructions if translation fails
      }

      // Step 3: Generate email using the instructions (translated or original)
      const emailDraft = await this.generateEmailDraft(translatedInstructions);

      // Return the draft with additional metadata
      return {
        subject: emailDraft.subject,
        to: emailDraft.to,
        cc: emailDraft.cc || "",
        bcc: emailDraft.bcc || "",
        body: emailDraft.body,
        confidence: emailDraft.confidence,
        originalInstructions: instructions,
        originalLanguage: originalLanguage,
        translatedInstructions: wasTranslated ? translatedInstructions : null,
      };
    } catch (error) {
      console.error("Email composition error:", error);
      throw new Error(`Failed to compose email: ${error.message}`);
    }
  }

  /**
   * Generate an email draft using LLM based on user instructions
   * @param {string} instructions - User instructions for email composition
   * @returns {Promise<Object>} - Generated email draft
   */
  async generateEmailDraft(instructions) {
    try {
      // Create prompt for the LLM
      const prompt = this.createComposePrompt(instructions);

      // Generate email draft using Ollama
      const emailDraftText = await this.generateWithOllama(prompt);

      // Parse the generated text to extract components
      const parsedEmail = this.parseEmailDraft(emailDraftText);

      // Calculate a confidence score
      const confidenceScore = this.calculateConfidenceScore(
        instructions,
        parsedEmail
      );

      return {
        ...parsedEmail,
        confidence: confidenceScore,
      };
    } catch (error) {
      console.error("Email draft generation error:", error);
      throw new Error(`Failed to generate email draft: ${error.message}`);
    }
  }

  /**
   * Create a prompt for LLM to compose an email
   * @param {string} instructions - User instructions
   * @returns {string} - Complete prompt for LLM
   */
  createComposePrompt(instructions) {
    return `You are an AI email assistant. Your task is to draft a complete email according to these specific instructions:

INSTRUCTIONS FROM USER:
${instructions}

Your task is to create a complete email draft with the following components:
1. TO: The email address(es) the message should be sent to
2. CC: Carbon copy recipients (if any)
3. BCC: Blind carbon copy recipients (if any)
4. SUBJECT: A clear and concise subject line
5. BODY: The main content of the email

Follow these guidelines:
- Extract all relevant information from the user's instructions
- If recipient emails aren't specified, use placeholder like "recipient@example.com"
- Write a professional email that accomplishes the user's goals
- The body should be 2-4 paragraphs unless specified otherwise

CRITICAL FORMAT INSTRUCTIONS:
- You MUST follow the exact format below with each field on a separate line
- Each section MUST start with the field name in ALL CAPS followed by a colon
- After the "BODY:" line, include ONLY the email body content
- DO NOT include any explanations or additional notes
- DO NOT include the brackets [ ] in your response

Format your response as follows:

TO: recipient@example.com
CC: 
BCC: 
SUBJECT: Your Subject Line Here
BODY:
Your email body starts here.

This is the second paragraph of the body.

Best regards,
`;
  }

  /**
   * Generate text using Ollama API
   * @param {string} prompt - Prompt for LLM
   * @returns {Promise<string>} - Generated text
   */
  async generateWithOllama(prompt) {
    try {
      const ollamaConfig = config.localLLM.ollama;
      const endpointUrl = ollamaConfig.endpointUrl;
      const modelName = ollamaConfig.defaultModel;

      const response = await fetch(endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 800,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      let generatedText = result.response || "";

      // Extract just the email draft part
      const draftStartIdx = generatedText.indexOf("EMAIL DRAFT:");
      if (draftStartIdx !== -1) {
        generatedText = generatedText
          .substring(draftStartIdx + "EMAIL DRAFT:".length)
          .trim();
      }

      return generatedText;
    } catch (error) {
      console.error("Ollama API error:", error);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  /**
   * Parse the generated email draft text into components
   * @param {string} emailDraftText - Raw text from LLM
   * @returns {Object} - Parsed email components
   */
  parseEmailDraft(emailDraftText) {
    const emailParts = {
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
    };

    // Split by lines to parse each section
    const lines = emailDraftText.split("\n");
    let currentSection = null;
    let bodyStarted = false;
    let bodyLines = [];

    for (const line of lines) {
      if (bodyStarted) {
        bodyLines.push(line);
        continue;
      }

      // Check for section headers
      if (line.startsWith("TO:")) {
        currentSection = "to";
        emailParts.to = line.substring(3).trim();
      } else if (line.startsWith("CC:")) {
        currentSection = "cc";
        emailParts.cc = line.substring(3).trim();
      } else if (line.startsWith("BCC:")) {
        currentSection = "bcc";
        emailParts.bcc = line.substring(4).trim();
      } else if (line.startsWith("SUBJECT:")) {
        currentSection = "subject";
        emailParts.subject = line.substring(8).trim();
      } else if (line.startsWith("BODY:")) {
        currentSection = "body";
        bodyStarted = true;
        // Skip the BODY: line itself by not adding it to bodyLines
      } else if (currentSection && !bodyStarted) {
        // Append to current section if it's a continuation line
        emailParts[currentSection] += " " + line.trim();
      }
    }

    // Join all body lines
    emailParts.body = bodyLines.join("\n").trim();

    // Post-process to ensure sections aren't merged
    this.validateAndFixParsedEmail(emailParts);

    // Clean up any spaces
    Object.keys(emailParts).forEach((key) => {
      if (typeof emailParts[key] === "string") {
        emailParts[key] = emailParts[key].trim();
      }
    });

    return emailParts;
  }

  /**
   * Validate and fix the parsed email to ensure sections aren't merged
   * @param {Object} emailParts - Parsed email components
   */
  validateAndFixParsedEmail(emailParts) {
    // Handle case where model didn't properly format the response

    // Check if subject contains BODY: and content is merged
    if (emailParts.subject.includes("BODY:")) {
      // Extract the actual subject and body
      const parts = emailParts.subject.split("BODY:");
      if (parts.length > 1) {
        emailParts.subject = parts[0].trim();
        // If we already have body content, prepend the content from subject
        if (emailParts.body) {
          emailParts.body = parts[1].trim() + "\n\n" + emailParts.body;
        } else {
          emailParts.body = parts[1].trim();
        }
      }
    }

    // Ensure to/cc/bcc fields don't contain multiple fields
    // Check if TO: field contains CC: or SUBJECT:
    if (emailParts.to.includes("CC:")) {
      const parts = emailParts.to.split("CC:");
      emailParts.to = parts[0].trim();
      if (parts.length > 1) {
        // Extract CC value, but check if it contains SUBJECT:
        let ccValue = parts[1].trim();
        if (ccValue.includes("SUBJECT:")) {
          const ccParts = ccValue.split("SUBJECT:");
          emailParts.cc = ccParts[0].trim();
          if (ccParts.length > 1 && !emailParts.subject) {
            emailParts.subject = ccParts[1].trim();
          }
        } else {
          emailParts.cc = ccValue;
        }
      }
    }

    // Check if TO: field contains SUBJECT: directly
    if (emailParts.to.includes("SUBJECT:")) {
      const parts = emailParts.to.split("SUBJECT:");
      emailParts.to = parts[0].trim();
      if (parts.length > 1 && !emailParts.subject) {
        emailParts.subject = parts[1].trim();
      }
    }

    // Apply similar logic to CC field
    if (emailParts.cc.includes("SUBJECT:")) {
      const parts = emailParts.cc.split("SUBJECT:");
      emailParts.cc = parts[0].trim();
      if (parts.length > 1 && !emailParts.subject) {
        emailParts.subject = parts[1].trim();
      }
    }

    // Check if subject field contains BODY: directly
    if (emailParts.subject.includes("BODY:")) {
      const parts = emailParts.subject.split("BODY:");
      emailParts.subject = parts[0].trim();
      if (parts.length > 1 && !emailParts.body) {
        emailParts.body = parts[1].trim();
      }
    }

    // Handle case where subject might contain multiple parts with no markers
    // This happens if model ignores format and puts everything in one field
    if (
      !emailParts.body &&
      emailParts.subject &&
      emailParts.subject.length > 50
    ) {
      // Look for patterns that indicate a subject line ending
      const patterns = [
        /\.\s+[A-Z]/, // Period followed by uppercase letter
        /\n\s*\n/, // Double line break
        /[\.!\?]\s+[A-Z]/, // Any sentence ending punctuation followed by uppercase
      ];

      for (const pattern of patterns) {
        const match = emailParts.subject.match(pattern);
        if (match && match.index > 15) {
          // Ensure we don't split too early
          // Split at the matched position
          const splitIndex = match.index + 1; // Include the period in the subject
          const extractedSubject = emailParts.subject
            .substring(0, splitIndex)
            .trim();
          const extractedBody = emailParts.subject.substring(splitIndex).trim();

          emailParts.subject = extractedSubject;
          emailParts.body = extractedBody;
          break;
        }
      }
    }

    // If the body is still empty, check if other fields might contain body content
    if (!emailParts.body && emailParts.subject.length > 100) {
      // Long subject might actually be body content
      const lines = emailParts.subject.split("\n");
      if (lines.length > 1) {
        // Keep first line as subject, rest is likely body
        emailParts.subject = lines[0].trim();
        emailParts.body = lines.slice(1).join("\n").trim();
      }
    }

    // Default values for required fields if empty
    if (!emailParts.to) {
      emailParts.to = "recipient@example.com";
    }

    if (!emailParts.subject) {
      emailParts.subject = "Email Subject";
    }

    // Ensure body is not empty
    if (!emailParts.body) {
      emailParts.body =
        "This email was generated based on your instructions. The content could not be fully parsed.";
    }
  }

  /**
   * Calculate a simple confidence score for the generated email
   * @param {string} instructions - Original instructions
   * @param {Object} parsedEmail - Parsed email components
   * @returns {number} - Confidence score between 0 and 1
   */
  calculateConfidenceScore(instructions, parsedEmail) {
    // This is a simple heuristic - in production you'd use a more sophisticated approach
    let score = 0.7; // Base score

    // Check if all required fields are filled
    if (parsedEmail.to && parsedEmail.subject && parsedEmail.body) {
      score += 0.1;
    }

    // Check if body is of reasonable length
    const wordCount = parsedEmail.body.split(/\s+/).length;
    if (wordCount > 30 && wordCount < 500) {
      score += 0.1;
    }

    // Check if instructions were likely addressed
    const instructionsLower = instructions.toLowerCase();
    const bodyLower = parsedEmail.body.toLowerCase();

    // Extract key terms from instructions (simple approach)
    const instructionWords = instructionsLower
      .split(/\s+/)
      .filter((word) => word.length > 4) // Only consider longer words as significant
      .filter(
        (word) =>
          ![
            "about",
            "should",
            "would",
            "could",
            "please",
            "email",
            "write",
            "draft",
          ].includes(word)
      );

    // Count how many instruction keywords appear in the body
    const matchedWords = instructionWords.filter((word) =>
      bodyLower.includes(word)
    );
    const matchRatio =
      instructionWords.length > 0
        ? matchedWords.length / instructionWords.length
        : 0;

    score += matchRatio * 0.1;

    // Ensure score is between 0 and 1
    return Math.min(Math.max(score, 0), 1);
  }
}

export default new ComposeEmailService();
