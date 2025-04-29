import emailService from "./emailService.js";
import translationService from "./translationService.js";

/**
 * VoiceSearchService handles searching emails based on voice instructions
 * Can process natural language instructions and convert them to search parameters
 */
class VoiceSearchService {
  /**
   * Process voice search instructions and fetch matching emails
   * @param {string} userEmail - User's email address
   * @param {string} accessToken - OAuth2 access token
   * @param {string} voiceText - Natural language voice instruction
   * @param {number} userId - User ID for database searches
   * @param {boolean} searchLocal - Whether to search in local database
   * @returns {Promise<Object>} - Search results and metadata
   */
  async searchByVoiceInstruction(
    userEmail,
    accessToken,
    voiceText,
    userId = null,
    searchLocal = false
  ) {
    try {
      // Step 1: Detect the language of the instructions
      let detectedLanguage = "en"; // Default to English
      let translatedInstructions = voiceText;
      let originalLanguage = "en";
      let wasTranslated = false;

      console.log(`Processing voice search: "${voiceText}"`);

      try {
        // Try to detect language
        detectedLanguage = await translationService.detectLanguage(voiceText);
        originalLanguage = detectedLanguage;

        // Translate instructions to English if not already in English
        if (detectedLanguage !== "en") {
          const translationResult = await translationService.translateText(
            voiceText,
            "en",
            detectedLanguage
          );
          translatedInstructions = translationResult.translatedText;
          wasTranslated = true;
          console.log(
            `Translated from ${detectedLanguage} to English: "${translatedInstructions}"`
          );
        }
      } catch (translationError) {
        console.warn(
          "Translation failed, proceeding with original instructions:",
          translationError.message
        );
        // Continue with original instructions if translation fails
      }

      // Step 2: Parse the voice instructions into search parameters
      const searchParams = await emailService.parseVoiceSearchQuery(
        translatedInstructions
      );

      // Add the userId and searchLocal parameters
      searchParams.userId = userId;
      searchParams.searchLocal = searchLocal;

      console.log(
        "Parsed search parameters:",
        JSON.stringify(searchParams, null, 2)
      );

      // Log detailed information about date parameters
      if (searchParams.startDate || searchParams.endDate) {
        console.log("Date range details:");
        if (searchParams.startDate) {
          const startDate = new Date(searchParams.startDate);
          console.log(
            `- Start date: ${startDate.toLocaleString()} (${
              searchParams.startDate
            })`
          );
        }
        if (searchParams.endDate) {
          const endDate = new Date(searchParams.endDate);
          console.log(
            `- End date: ${endDate.toLocaleString()} (${searchParams.endDate})`
          );
        }
      }

      // Step 3: Execute the search with the parsed parameters
      const searchResults = await emailService.searchEmails(
        userEmail,
        accessToken,
        searchParams
      );

      console.log(`Search returned ${searchResults.length} results`);

      // Format search description for user feedback
      const searchDescription = this.generateSearchDescription(
        searchParams,
        translatedInstructions
      );

      // Return the results with metadata about the search
      return {
        results: searchResults,
        count: searchResults.length,
        originalQuery: voiceText,
        originalLanguage,
        translatedQuery: wasTranslated ? translatedInstructions : null,
        parsedParameters: searchParams,
        searchDescription,
      };
    } catch (error) {
      console.error("Voice search error:", error);
      throw new Error(`Failed to process voice search: ${error.message}`);
    }
  }

  /**
   * Generate a human-readable description of the search that was performed
   * @param {Object} searchParams - The search parameters used
   * @param {string} originalQuery - The original search query
   * @returns {string} - A description of the search
   */
  generateSearchDescription(searchParams, originalQuery) {
    const parts = [];

    // Describe what we're searching for
    if (searchParams.keyword) {
      if (searchParams.complexQuery) {
        // Handle complex queries with specific subject/body terms
        const subjectMatch = searchParams.keyword.match(/subject:"([^"]+)"/i);
        const bodyMatch = searchParams.keyword.match(/body:"([^"]+)"/i);

        if (subjectMatch && bodyMatch) {
          parts.push(
            `emails with subject containing "${subjectMatch[1]}" AND body containing "${bodyMatch[1]}"`
          );
        } else if (subjectMatch) {
          parts.push(`emails with subject containing "${subjectMatch[1]}"`);
        } else if (bodyMatch) {
          parts.push(`emails with body containing "${bodyMatch[1]}"`);
        } else {
          parts.push(`emails matching "${searchParams.keyword}"`);
        }
      } else {
        parts.push(`emails containing "${searchParams.keyword}"`);
      }
    } else {
      parts.push("emails");
    }

    // Add sender information if available
    if (searchParams.sender) {
      parts.push(`from ${searchParams.sender}`);
    }

    // Add date range if available
    if (searchParams.startDate && searchParams.endDate) {
      const startDate = new Date(searchParams.startDate);
      const endDate = new Date(searchParams.endDate);
      parts.push(
        `between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()}`
      );
    } else if (searchParams.startDate) {
      const startDate = new Date(searchParams.startDate);
      parts.push(`after ${startDate.toLocaleDateString()}`);
    } else if (searchParams.endDate) {
      const endDate = new Date(searchParams.endDate);
      parts.push(`before ${endDate.toLocaleDateString()}`);
    }

    // Add folder information if not inbox
    if (searchParams.folder && searchParams.folder !== "INBOX") {
      // Clean up Gmail folder names for display
      const folderName = searchParams.folder
        .replace("[Gmail]/", "")
        .replace(/([A-Z])/g, " $1")
        .trim();
      parts.push(`in the ${folderName} folder`);
    }

    // Combine all parts into a readable sentence
    let description = `Showing ${parts.join(" ")}`;

    // Add limit information if not default
    if (searchParams.limit && searchParams.limit !== 20) {
      description += ` (limited to ${searchParams.limit} results)`;
    }

    return description;
  }
}

export default new VoiceSearchService();
