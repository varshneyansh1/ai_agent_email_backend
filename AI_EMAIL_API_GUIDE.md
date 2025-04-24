# AI Email System API Guide

This guide provides details on how to use the AI Email system API, including the improved workflow for generating intelligent replies.

## API Endpoints Overview

### Email Operations

- `GET /email/inbox` - Fetch recent emails from inbox
- `GET /email/folder/:folderName` - Fetch emails from a specific folder
- `GET /email/folders` - List available email folders
- `POST /email/send` - Send a new email
- `POST /email/reply` - Send a reply to an email
- `POST /email/save` - Save an email to the database
- `GET /email/saved` - Get saved emails for a user
- `DELETE /email/:id` - Delete an email from the database

### AI Operations

- `POST /ai/generate-response` - Generate an AI response to email content
- `POST /ai/intelligent-reply` - Generate an intelligent reply to an email (improved)
- `POST /ai/reply-to-sequence` - One-step endpoint to fetch an email by sequence number and generate a reply
- `POST /ai/generate-voice-reply` - Generate a reply based on custom voice instructions in any language
- `POST /ai/analyze-style` - Analyze a user's writing style
- `GET /ai/style-profile/:userId` - Get a user's style profile

## Recent Improvements

### Enhanced Email Fetching for Latest Messages

The inbox fetching API has been improved to ensure it returns the most recent emails by date, not just by sequence number. The system now:

1. Fetches a larger set of emails (3x the requested limit)
2. Sorts them by date (newest first)
3. Returns only the most recent ones up to the requested limit

This ensures you always get the truly latest emails, even if the IMAP sequence numbers don't perfectly align with email dates.

**Example Usage:**

```http
GET http://localhost:5000/email/inbox?limit=10
```

This will return the 10 most recent emails by date, not just the 10 highest sequence numbers.

## Improved Workflow for Generating Intelligent Replies

The system now offers multiple ways to generate intelligent email replies, addressing the previous need to save emails to the database first.

### Option 1: Direct Reply from Inbox (Recommended)

Use the new `/ai/reply-to-sequence` endpoint to generate a reply directly from an email in your inbox:

```http
POST http://localhost:5000/ai/reply-to-sequence
Content-Type: application/json

{
  "seqno": 33,
  "userId": 1,
  "email": "your-email@gmail.com"  // Optional, defaults to EMAIL_USER from .env
}
```

This endpoint:

1. Fetches the email with the specified sequence number from your inbox
2. Analyzes your writing style
3. Generates an appropriate AI response
4. Automatically saves the email to the database for future reference
5. Returns a complete reply package ready to be sent

**Response:**

```json
{
  "message": "Intelligent reply generated successfully",
  "reply": {
    "to": "sender@example.com",
    "subject": "Re: Original Subject",
    "body": "Generated response text with your style...",
    "inReplyTo": "original-message-id",
    "messageSeqNo": 33,
    "databaseId": 42,
    "confidence": 0.85,
    "originalContent": "Original email content..."
  }
}
```

### Option 2: Reply Using Direct Email Content

If you already have the email content and metadata, you can use the improved `/ai/intelligent-reply` endpoint:

```http
POST http://localhost:5000/ai/intelligent-reply
Content-Type: application/json

{
  "userId": 1,
  "emailContent": "Email body content...",
  "emailData": {
    "from": "sender@example.com",
    "to": "your-email@gmail.com",
    "subject": "Email Subject",
    "date": "2025-02-24T15:27:16.000Z"
  }
}
```

This endpoint:

1. Uses the provided email content and metadata directly
2. Analyzes your writing style
3. Generates an appropriate AI response
4. Optionally saves the email to the database
5. Returns a complete reply package

### Option 3: Reply to Database Email (Original Method)

You can still use the original method of first saving the email to the database:

```http
POST http://localhost:5000/email/save
Content-Type: application/json

{
  "userId": 1,
  "sender": "sender@example.com",
  "subject": "Email Subject",
  "body": "Email content..."
}
```

Then generate a reply using the returned ID:

```http
POST http://localhost:5000/ai/intelligent-reply
Content-Type: application/json

{
  "userId": 1,
  "emailId": 42  // Database ID from the save response
}
```

## Sending the Generated Reply

Regardless of which method you use to generate the reply, you can send it using the `/email/reply` endpoint:

```http
POST http://localhost:5000/email/reply
Content-Type: application/json

{
  "recipient": "sender@example.com", // From the intelligent-reply response
  "subject": "Re: Email Subject",    // From the intelligent-reply response
  "body": "Generated response...",   // From the intelligent-reply response
  "inReplyTo": "original-message-id" // Optional, for email threading
}
```

## Generating Voice-Instructed Replies

The system now supports generating email replies based on voice instructions in any language. This feature allows users to provide specific instructions about how they want the reply to be composed, including tone, content, and specific information to include.

### Voice Reply Workflow

Use the `/ai/generate-voice-reply` endpoint to generate a reply based on voice instructions, similar to how you'd use the `/ai/reply-to-sequence` endpoint:

```http
POST http://localhost:5000/ai/generate-voice-reply
Content-Type: application/json

{
  "seqno": 42,
  "instructions": "iss email ka jawab casual tone mai doh aur reply ke content mai include karo ki I want this project to be completed by end of month",
  "userId": 1,
  "email": "your-email@gmail.com"  // Optional, defaults to EMAIL_USER from .env
}
```

This endpoint:

1. Fetches the email with the specified sequence number from your inbox
2. Detects the language of the instructions (works with Hindi, English, or any other language)
3. Translates instructions to English if they're in another language
4. Generates a customized response following the specified instructions
5. Applies the user's writing style to maintain consistency
6. Automatically saves the email to the database for future reference
7. Returns a complete reply package ready to be sent

**Response:**

```json
{
  "message": "Voice-instructed reply generated successfully",
  "reply": {
    "to": "sender@example.com",
    "subject": "Re: Project Discussion",
    "body": "Generated response following instructions...",
    "inReplyTo": "original-message-id",
    "messageSeqNo": 42,
    "databaseId": 123,
    "confidence": 0.85,
    "originalContent": "Original email content...",
    "instructionsLanguage": "hi",
    "wasTranslated": true
  }
}
```

### Example: Responding with Custom Instructions

For example, if you want to reply to an email about a project timeline with specific details:

```http
POST http://localhost:5000/ai/generate-voice-reply
Content-Type: application/json

{
  "seqno": 35,
  "instructions": "Reply in a professional tone. Mention that I am available on Tuesday and Thursday afternoon. Also mention that I want to complete the project by end of month.",
  "userId": 1
}
```

For more details about the voice reply API, refer to the [Voice Reply API Documentation](docs/voice-reply-api.md).

## Example: Complete Workflow with the Amazon Job Application Email

For your specific example with the Amazon job application email, here's how to use the new streamlined workflow:

### 1. Fetch the email from inbox:

```http
GET http://localhost:5000/email/inbox
```

This returns a list of emails, including:

```json
{
  "seqno": 33,
  "from": "noreply@mail.amazon.jobs",
  "to": "anshvar2002@gmail.com",
  "subject": "Thank you for Applying to Amazon!",
  "date": "2025-02-24T15:27:16.000Z",
  "body": "Amazon.jobs"
}
```

### 2. Generate an intelligent reply using the sequence number:

```http
POST http://localhost:5000/ai/reply-to-sequence
Content-Type: application/json

{
  "seqno": 33,
  "userId": 1
}
```

### 3. Send the generated reply:

```http
POST http://localhost:5000/email/reply
Content-Type: application/json

{
  "recipient": "noreply@mail.amazon.jobs",
  "subject": "Re: Thank you for Applying to Amazon!",
  "body": "Generated response from previous step"
}
```

## Alternative: Direct Reply Using Email Content

If you already have the email content, you can use this approach instead:

```http
POST http://localhost:5000/ai/intelligent-reply
Content-Type: application/json

{
  "userId": 1,
  "emailContent": "Amazon.jobs",
  "emailData": {
    "from": "noreply@mail.amazon.jobs",
    "to": "anshvar2002@gmail.com",
    "subject": "Thank you for Applying to Amazon!",
    "date": "2025-02-24T15:27:16.000Z"
  }
}
```

This provides a more streamlined experience without requiring multiple API calls.
