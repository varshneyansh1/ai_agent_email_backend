import express from "express";
import composeEmailService from "./services/composeEmailService.js";

// Create a simple Express app
const app = express();
const PORT = 5001;

// Middleware for parsing JSON
app.use(express.json());

// Route for compose-email API
app.post("/ai/compose-email", async (req, res) => {
  try {
    const { instructions } = req.body;

    // Validate required fields
    if (!instructions) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    console.log("Received instructions:", instructions);

    // Generate the email draft
    const emailDraft = await composeEmailService.composeEmail(instructions);

    // Return complete email draft
    res.json({
      message: "Email draft generated successfully",
      draft: {
        to: emailDraft.to,
        cc: emailDraft.cc,
        bcc: emailDraft.bcc,
        subject: emailDraft.subject,
        body: emailDraft.body,
        confidence: emailDraft.confidence,
        instructionsLanguage: emailDraft.originalLanguage,
        wasTranslated: emailDraft.translatedInstructions !== null,
      },
    });
  } catch (error) {
    console.error("Error composing email:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(
    `Try the compose-email API at: http://localhost:${PORT}/ai/compose-email`
  );
  console.log(
    'Example POST body: { "instructions": "Write an email to team@company.com about project status" }'
  );
});

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  process.exit(0);
});
