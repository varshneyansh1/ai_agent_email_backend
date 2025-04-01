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

## License

ISC
