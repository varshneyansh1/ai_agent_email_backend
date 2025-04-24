// Simple script to test translation functionality

import { translate } from "@vitalets/google-translate-api";

async function testTranslate() {
  try {
    console.log("Testing translation...");
    const result = await translate("Hello world", { to: "es" });
    console.log("Translation result:", result.text);
    console.log("Response structure:", JSON.stringify(result, null, 2));

    console.log("\nTesting language detection...");
    const hindi = "नमस्ते दुनिया";
    const hindiResult = await translate(hindi, { to: "en" });
    console.log("Hindi text:", hindi);
    console.log("Translated to English:", hindiResult.text);
    console.log("Response structure:", JSON.stringify(hindiResult, null, 2));
  } catch (error) {
    console.error("Translation test failed:", error);
  }
}

testTranslate();
