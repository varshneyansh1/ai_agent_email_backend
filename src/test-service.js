// Test script for the TranslationService

import translationService from "./services/translationService.js";

async function testTranslationService() {
  try {
    console.log("Testing language detection...");
    const englishText = "Hello world";
    const englishLang = await translationService.detectLanguage(englishText);
    console.log(`Text: "${englishText}" | Detected language: ${englishLang}`);

    const hindiText = "नमस्ते दुनिया";
    const hindiLang = await translationService.detectLanguage(hindiText);
    console.log(`Text: "${hindiText}" | Detected language: ${hindiLang}`);

    console.log("\nTesting translation...");
    const translatedHindi = await translationService.translateText(
      hindiText,
      "en"
    );
    console.log("Hindi to English translation:");
    console.log(`Original: "${hindiText}"`);
    console.log(`Translated: "${translatedHindi.translatedText}"`);
    console.log(
      `Detected source language: ${translatedHindi.detectedSourceLang}`
    );

    const englishToSpanish = await translationService.translateText(
      englishText,
      "es"
    );
    console.log("\nEnglish to Spanish translation:");
    console.log(`Original: "${englishText}"`);
    console.log(`Translated: "${englishToSpanish.translatedText}"`);
    console.log(
      `Detected source language: ${englishToSpanish.detectedSourceLang}`
    );

    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Translation service test failed:", error);
  }
}

testTranslationService();
