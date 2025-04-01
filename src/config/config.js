import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export default {
  // Server configuration
  server: {
    port: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || "development",
  },

  // Database configuration
  database: {
    path: process.env.DB_PATH || "./database.sqlite",
  },

  // Authentication configuration
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl:
        process.env.CALLBACK_URL ||
        "http://localhost:5000/auth/google/callback",
    },
    session: {
      secret: process.env.SESSION_SECRET || "your-secret-key",
      cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
      },
    },
  },

  // Email configuration
  email: {
    imap: {
      host: process.env.EMAIL_IMAP_HOST || "imap.gmail.com",
      port: parseInt(process.env.EMAIL_IMAP_PORT) || 993,
      tls: true,
    },
    smtp: {
      host: process.env.EMAIL_SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
    },
  },

  // Queue configuration (for future use with Bull)
  queue: {
    redis: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
    },
    emailProcessing: {
      concurrency: parseInt(process.env.EMAIL_PROCESSING_CONCURRENCY) || 2,
    },
  },

  // AI/LLM configuration (for future use)
  ai: {
    modelPath: process.env.AI_MODEL_PATH || "./models/llm-model",
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 800,
  },
};
