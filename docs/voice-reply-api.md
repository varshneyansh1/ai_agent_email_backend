# Voice Reply API Endpoint Documentation

## Overview

The Voice Reply API endpoint allows users to generate email replies based on voice instructions. The unique aspect of this endpoint is that it can accept instructions in any language, which will be translated to English internally if needed, and generates appropriate English replies that follow those instructions.

## Endpoint Details

- **URL:** `/ai/generate-voice-reply`
- **Method:** `POST`
- **Content-Type:** `application/json`

## Request Parameters

| Parameter    | Type   | Required | Description                                                                                                                    |
| ------------ | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| seqno        | number | Yes      | The sequence number of the email to reply to                                                                                   |
| instructions | string | Yes      | Custom instructions in any language (e.g., "iss email ka jawab casual tone mai doh", "respond in a professional manner", etc.) |
| userId       | number | No       | User ID to retrieve style profile (defaults to 1)                                                                              |
| email        | string | No       | Email address to use (defaults to EMAIL_USER in .env)                                                                          |
| limit        | number | No       | Maximum number of emails to fetch when searching (default: 50)                                                                 |

## Response Format

```json
{
  "message": "Voice-instructed reply generated successfully",
  "reply": {
    "to": "original.sender@example.com",
    "subject": "Re: Original Subject",
    "body": "Generated reply content following instructions...",
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

## Example Usage

### Example 1: Hindi Instructions

```json
POST /ai/generate-voice-reply
{
  "seqno": 42,
  "instructions": "iss email ka jawab casual tone mai doh aur reply ke content mai include karo ki I want this project to be completed by end of month",
  "userId": 1
}
```

### Example 2: English Instructions

```json
POST /ai/generate-voice-reply
{
  "seqno": 35,
  "instructions": "Reply in a professional tone and ask for the agenda of the meeting. Also mention that I will be bringing two team members with me.",
  "userId": 2,
  "email": "my.email@example.com"
}
```

## Error Responses

| Status Code | Description             | Response Body                                                                       |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------- |
| 400         | Missing required fields | `{"error": "Email sequence number (seqno) is required"}`                            |
| 400         | Missing required fields | `{"error": "Instructions are required"}`                                            |
| 400         | Invalid format          | `{"error": "Sequence number must be a valid integer"}`                              |
| 404         | Email not found         | `{"error": "Email with sequence number 42 not found in the most recent 50 emails"}` |
| 500         | Server error            | `{"error": "Error message", "stack": "..."}`                                        |

## Notes

- The system will translate non-English instructions to English internally.
- The reply will be generated in English, following the style profile of the specified user.
- The confidence score indicates the system's confidence in the generated reply.
- The endpoint automatically fetches the email from the user's inbox using the provided sequence number.
- The email will be saved to the database for future reference.
