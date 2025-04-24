import responseGeneratorService from "./responseGeneratorService.js";
import translationService from "./translationService.js";

/**
 * VoiceReplyService handles generating email replies based on voice instructions
 * Can process instructions in any language and generate appropriate replies
 */
class VoiceReplyService {
  /**
   * Generate a reply based on voice instructions and email content
   * @param {number} userId - User ID
   * @param {string} emailContent - Original email content to reply to
   * @param {string} instructions - User instructions in any language
   * @returns {Promise<Object>} - Generated reply with metadata
   */
  async generateVoiceReply(userId, emailContent, instructions) {
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

      // Step 3: Generate a response using the instructions (translated or original)
      const response =
        await responseGeneratorService.generateInstructedResponse(
          userId,
          emailContent,
          translatedInstructions
        );

      // Return the response with additional metadata
      return {
        response: response.response,
        confidence: response.confidence,
        originalInstructions: instructions,
        originalLanguage: originalLanguage,
        translatedInstructions: wasTranslated ? translatedInstructions : null,
      };
    } catch (error) {
      console.error("Voice reply generation error:", error);
      throw new Error(`Failed to generate voice reply: ${error.message}`);
    }
  }
}

export default new VoiceReplyService();
