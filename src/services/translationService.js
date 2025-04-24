import { translate } from "@vitalets/google-translate-api";
import config from "../config.js";

/**
 * TranslationService handles translation between different languages
 * Uses Google Translate API under the hood
 */
class TranslationService {
  /**
   * Translate text from the source language to target language
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code (default: 'en')
   * @param {string} sourceLang - Source language code (auto-detect if not provided)
   * @returns {Promise<Object>} - Translated text and detected language
   */
  async translateText(text, targetLang = "en", sourceLang = "auto") {
    try {
      // Set timeout from config
      const timeout = config.timeouts.translation;

      // Call Google Translate API
      const result = await translate(text, {
        from: sourceLang,
        to: targetLang,
        timeout: timeout,
      });

      return {
        translatedText: result.text,
        detectedSourceLang: result.raw.src,
        originalText: text,
      };
    } catch (error) {
      console.error("Translation error:", error);
      throw new Error(`Failed to translate text: ${error.message}`);
    }
  }

  /**
   * Detect the language of a text string
   * @param {string} text - Text to analyze
   * @returns {Promise<string>} - Detected language code
   */
  async detectLanguage(text) {
    try {
      // We use a translation to a different language to detect the source
      const result = await translate(text.substring(0, 100), {
        to: "en",
      });

      // The source language is in result.raw.src
      return result.raw.src;
    } catch (error) {
      console.error("Language detection error:", error);
      throw new Error(`Failed to detect language: ${error.message}`);
    }
  }
}

export default new TranslationService();
