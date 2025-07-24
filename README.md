# AI Email Assistant Backend

---

## 📽️ Project Demo

[Watch the demo video on Google Drive](https://drive.google.com/file/d/19woPUuQqYcCs3xAMSEkY3KOMH_Dqy49X/view?usp=drive_link)

### App Screenshots

<img src="docs/screenshots/mail content.jpg" alt="Mail Content" width="400" height="250" />

<img src="docs/screenshots/smart compose.jpg" alt="Smart Compose" width="400" height="250" />

<img src="docs/screenshots/sent.jpg" alt="Sent" width="400" height="250" />

<img src="docs/screenshots/drawers.jpg" alt="Drawers" width="400" height="250" />

---

## Overview

AI Email Assistant Backend is a Node.js/Express backend for an AI-powered email assistant. It can read, analyze, search, and respond to emails using local LLM (Large Language Model) capabilities, with support for natural language and voice commands.

---

## Features

- 📧 Gmail integration (OAuth2, IMAP, SMTP)
- 🔒 Secure Google authentication
- 💾 Local SQLite storage
- 🔄 Background processing (Bull + Redis)
- 🧠 Local LLM/AI-powered:
  - Email response generation
  - Style analysis & adaptation
  - Voice-instructed replies
  - Natural language/voice search
- 🌐 RESTful API endpoints
- 🗣️ Multilingual support for instructions

---

## Architecture Overview

- **Node.js + Express**: REST API server
- **IMAP/SMTP**: Email fetching/sending
- **Google OAuth2**: Secure authentication
- **SQLite**: Local data storage
- **Bull + Redis**: Background job queue
- **Local LLM (LLaMA 3.1) or HuggingFace**: AI/ML for email response, style, and search
- **Modular Services**: For email, AI, style, translation, and voice

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed diagram and explanation.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Redis server
- (Optional) Local LLM (LLaMA 3.2) for full AI features

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/email-ai-backend.git
   cd email-ai-backend
   ```

````
2. **Install dependencies**
   ```bash
npm install
````

3. **Configure environment variables**
   - Copy `.env.example` (if available) or create `.env`:
   ```
   PORT=5000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CALLBACK_URL=http://localhost:5000/auth/google/callback
   SESSION_SECRET=your_session_secret
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

# AI/LLM

HUGGINGFACE_API_KEY=your-huggingface-api-key
LLAMA_API_URL=http://localhost:8080/completion
LOCAL_LLM_ENABLED=true

````
4. **Set up Google OAuth** ([see detailed guide](docs/SETUP_GUIDE.md))
5. **(Optional) Set up Local LLaMA** ([see detailed guide](docs/SETUP_GUIDE.md))

---

## Running the Application

- **Development:**
  ```bash
  npm run dev
````

- **Production:**
  ```bash
  npm start
  ```

---


1. Download LLaMA 3.2 model from [Meta AI website](https://llama.meta.com/llama2/)
2. Use [llamafile](https://github.com/Mozilla-Ocho/llamafile) to run the model locally:
   ```
   ./llamafile-server --model llama-3.2-8b.Q5_K_M.gguf --port 8080
   ```
3. Set `LOCAL_LLM_ENABLED=true` in your `.env` file

### API Usage Examples

**Generate Email Response**:

```javascript
// POST /ai/generate-response
const response = await fetch("/ai/generate-response", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: 1,
    emailContent: "Hi, I would like to schedule a meeting next week...",
  }),
});
const data = await response.json();
// data = { message: "Response generated successfully", response: "...", confidence: 0.87 }
```

**Intelligent Reply to a Specific Email**:

```javascript
// POST /ai/intelligent-reply
const response = await fetch("/ai/intelligent-reply", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: 1,
    emailId: 42,
    forceStyleUpdate: false, // Optional: set to true to force style analysis
  }),
});
const data = await response.json();
/* 
data = { 
  message: "Intelligent reply generated successfully", 
  reply: {
    to: "sender@example.com",
    subject: "Re: Meeting Request",
    body: "...",
    inReplyTo: 42,
    confidence: 0.87,
    originalContent: "..."
  }
}
*/
```

**Analyze User Style**:

```javascript
// POST /ai/analyze-style
const response = await fetch("/ai/analyze-style", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: 1 }),
});
const data = await response.json();
// data = { message: "Style analysis completed", styleProfile: {...} }
```

The backend is designed to integrate with locally hosted LLM models for:

- Email summarization
- Response generation
- Style analysis
- Conversation context understanding

## AI-Powered Email Search

This repository contains a new voice search feature that allows searching emails using natural language queries.

## Natural Language Email Search

The system now supports searching emails using natural language voice commands. Users can search for emails using queries like:

- "Show me emails from John about the project proposal from last week"
- "Find emails containing quarterly report received in March"
- "Show emails from support team with attachments"

### How It Works

The backend processes natural language queries by:

1. Parsing the text to extract search parameters (keywords, dates, senders, folders)
2. Converting these parameters into a structured search query
3. Executing the search against email sources (IMAP or local database)
4. Returning matching results

### Documentation

- [Voice Search API Guide](VOICE_SEARCH_API_GUIDE.md) - Detailed API documentation
- [Postman Testing Examples](POSTMAN_VOICE_SEARCH_EXAMPLES.md) - Examples for testing with Postman


- **Authentication:** `/auth/*`
- **Email Operations:** `/email/*`
- **AI/LLM:** `/ai/*`
- **Voice Search:** `/email/voice-search`

See detailed API docs:

- [AI Email API Guide](docs/AI_EMAIL_API_GUIDE.md)
- [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md)
- [Compose Email API](docs/compose-email-api.md)
- [Voice Reply API](docs/voice-reply-api.md)

---

## Testing the API

- Use [Postman examples](POSTMAN_TESTING.md, POSTMAN_VOICE_SEARCH_EXAMPLES.md) for quick testing.
- Example: Voice search
  ```bash
  curl -X POST http://localhost:5000/email/voice-search \
    -H "Content-Type: application/json" \
    -d '{"voiceText": "show me emails from John about project update received last week"}'
  ```
- For local testing scripts, see `src/test-*.js` files.

---

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements or bug fixes.

---

## Contact

For questions, contact varshneyansh9@gmail.com
