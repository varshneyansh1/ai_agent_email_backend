/**
 * Configuration for the Email AI Backend
 * This file centralizes configuration settings for easier management
 */
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// API Keys and Services
const config = {
  // HuggingFace API Configuration

  // Local LLM Configuration
  localLLM: {
    enabled: process.env.LOCAL_LLM_ENABLED === "true", // Disabled by default
    apiUrl: process.env.LLAMA_API_URL || "http://localhost:8080/completion",
    // Ollama specific settings
    ollama: {
      enabled: true,
      defaultModel: process.env.OLLAMA_MODEL || "llama3.1", // Use llama3 as default
      endpointUrl: "http://localhost:11434/api/generate",
      alternatePorts: [5000, 8000], // Additional ports to try
    },
    // OpenAI compatible settings
    openaiCompat: {
      enabled: true,
      endpointUrl: "http://localhost:5000/v1/completions",
    }
  },

  // Google Translate API Configuration
  googleTranslate: {
    enabled: true, // No specific env var for this, always try to enable
    fallbackLanguage: "en",
  },

  // Email Service Configuration
  email: {
    defaultUser: process.env.EMAIL_USER || "",
    defaultPassword: process.env.EMAIL_PASSWORD || "",
    imapServer: process.env.IMAP_SERVER || "imap.gmail.com",
    imapPort: parseInt(process.env.IMAP_PORT || "993", 10),
    smtpServer: process.env.SMTP_SERVER || "smtp.gmail.com",
    smtpPort: parseInt(process.env.SMTP_PORT || "465", 10),
  },

  // API Request Timeouts (milliseconds)
  timeouts: {
    llm: parseInt(process.env.LLM_TIMEOUT || "10000", 10), // Increased from 5s to 10s
    email: parseInt(process.env.EMAIL_TIMEOUT || "30000", 10),
    translation: parseInt(process.env.TRANSLATION_TIMEOUT || "5000", 10),
  },

  // Development and Debugging
  dev: {
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    showStackTraces: process.env.NODE_ENV === "development",
  },
};

export default config;
