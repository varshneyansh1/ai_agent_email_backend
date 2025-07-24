# Postman API Testing Guide

This guide helps you test the AI Email Assistant Backend using Postman. It covers intelligent reply, compose email, and error handling workflows.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setting Up Postman](#setting-up-postman)
3. [Intelligent Reply Workflow](#intelligent-reply-workflow)
4. [Compose Email API](#compose-email-api)
5. [Error Handling](#error-handling)
6. [Troubleshooting](#troubleshooting)
7. [Related API Docs](#related-api-docs)

---

## Prerequisites

- Backend server running at `http://localhost:5000`
- User account in the database
- Email credentials set in `.env`

---

## Setting Up Postman

1. Create a new Collection (e.g., "Email AI Backend Testing")
2. (Optional) Set up environment variables:
   - `base_url`: http://localhost:5000
   - `user_id`: 1

---

## Intelligent Reply Workflow

### 1. Generate Intelligent Reply

- **Endpoint:** `POST /ai/intelligent-reply`
- **Body Example:**

```json
{
  "userId": 1,
  "emailId": 1,
  "forceStyleUpdate": true
}
```

- **Expected Response:**
  - Reply text, subject, recipient, confidence score

### 2. Send the Generated Reply

- **Endpoint:** `POST /email/reply`
- **Body Example:**

```json
{
  "email": "your-email@gmail.com",
  "recipient": "recipient@example.com",
  "subject": "Re: Subject",
  "body": "Reply body",
  "inReplyTo": "email-id"
}
```

---

## Compose Email API

- **Endpoint:** `POST /ai/compose-email`
- **Body Example:**

```json
{
  "instructions": "Write a project update to dev@company.com. Copy pm@company.com.",
  "userId": 1
}
```

- **Expected Response:**

  - Draft with to, cc, subject, body, confidence, language

- **Non-English Example:**

```json
{
  "instructions": "Schreiben Sie eine Einladung an client@example.com für ein Meeting am Freitag um 14 Uhr.",
  "userId": 1
}
```

---

## Error Handling

- Missing required fields returns 400 error
- Example:

```json
{
  "userId": 1
}
```

- **Expected:** Error message about missing instructions

---

## Troubleshooting

- Check `.env` for credentials
- Ensure Hugging Face API key or local LLaMA is running
- Add sample emails if "No emails found"
- See server logs for errors

---

## Related API Docs

- [AI Email API Guide](docs/AI_EMAIL_API_GUIDE.md)
- [Compose Email API](docs/compose-email-api.md)
- [Voice Reply API](docs/voice-reply-api.md)
- [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md)
