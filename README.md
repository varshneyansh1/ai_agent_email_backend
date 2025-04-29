# AI Email Assistant Backend

A Node.js/Express backend for an AI-powered email assistant application that can read, analyze, and respond to emails using local LLM capabilities.

## Features

- 📧 Email integration with Gmail via OAuth2
- 🔒 Secure authentication with Google OAuth
- 📁 Email fetching via IMAP
- ✉️ Email sending via SMTP
- 💾 Local data storage with SQLite
- 🔄 Background processing with Bull and Redis
- 🧠 Integration ready for local LLM models

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- Redis server (for job queues)
- Optional: Local LLM model for AI capabilities

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/email-ai-backend.git
cd email-ai-backend
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=your_session_secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

4. Set up Google OAuth credentials:
   - Go to [Google Developer Console](https://console.developers.google.com/)
   - Create a new project
   - Enable the Gmail API
   - Create OAuth credentials
   - Add the OAuth scopes for Gmail
   - Set the authorized redirect URL to match `CALLBACK_URL` in your `.env` file

### Running the Application

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

### Authentication

- `GET /auth/google` - Initiate Google OAuth login
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/profile` - Get user profile
- `GET /auth/logout` - Logout user
- `DELETE /auth/account` - Delete user account

### Email Operations

- `GET /email/inbox` - Get user's inbox emails
- `GET /email/folder/:folderName` - Get emails from specific folder
- `POST /email/send` - Send an email
- `POST /email/reply` - Reply to an email
- `POST /email/save` - Save an email to database
- `GET /email/saved` - Get saved emails
- `DELETE /email/:id` - Delete an email

## AI Email Response Generation

The application includes AI-powered email response generation with the following features:

1. **Style Analysis**: Analyzes user's previous emails to create a personal writing style profile

   - Extracts common phrases, greeting styles, and signatures
   - Measures tone, formality, and average sentence length
   - Generates semantic embeddings of the user's writing style

2. **Response Generation**: Uses a locally hosted LLaMA 3.2 model (or HuggingFace API as fallback)

   - Generates draft responses to incoming emails
   - Post-processes drafts by applying the user's style profile
   - Returns both the generated response and a confidence score

3. **API Endpoints**:
   - `POST /ai/generate-response`: Generate a styled email response
   - `POST /ai/analyze-style`: Analyze a user's writing style
   - `GET /ai/style-profile/:userId`: Get a user's style profile
   - `POST /ai/intelligent-reply`: Generate a complete reply to a specific email with style matching

### Configuration

To use the AI features, add the following to your `.env` file:

```
# AI Configuration
HUGGINGFACE_API_KEY=your-huggingface-api-key
LLAMA_API_URL=http://localhost:8080/completion
LOCAL_LLM_ENABLED=true  # Set to true if using local LLaMA server
```

### Setting Up LLaMA 3.2 Locally

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

## Implementation Roadmap

- [x] Basic email reading/sending functionality
- [x] OAuth2 authentication with Google
- [x] IMAP/SMTP integration
- [x] Background email processing
- [ ] Style analysis engine
- [ ] Local LLM integration
- [ ] Response generation pipeline
- [ ] User style adaptation

## Local LLM Integration (Coming Soon)

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

## Testing the API

The voice search API is available at:

```
POST /email/voice-search
```

Example request body:

```json
{
  "voiceText": "show me emails from John about project update received last week"
}
```

To test the parsing functionality without performing an actual search, use:

```
node src/test-voice-search.js "your search query here"
```

## Features

The voice search supports:

- **Keyword extraction**: Find emails containing specific terms
- **Date range parsing**: Search by relative dates ("last week", "yesterday", "this month") or specific dates
- **Sender filtering**: Find emails from specific people
- **Folder targeting**: Search in specific email folders (inbox, sent, spam, etc.)
- **Result limiting**: Specify the number of results to return

## License

ISC
