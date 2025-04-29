# Compose Email API

The Compose Email API allows you to generate complete email drafts based on natural language instructions from the user. The AI will interpret these instructions and produce an appropriate email with all necessary components (recipients, subject, body).

## Basic Usage

**Endpoint:** `/ai/compose-email`  
**Method:** POST  
**Content-Type:** application/json

### Request Parameters

| Parameter    | Type   | Required | Description                                                  |
| ------------ | ------ | -------- | ------------------------------------------------------------ |
| instructions | string | Yes      | User's natural language instructions for composing the email |
| userId       | number | No       | User ID for tracking (defaults to 1)                         |

### Response Format

The API returns a JSON object with:

| Field                      | Type    | Description                                |
| -------------------------- | ------- | ------------------------------------------ |
| message                    | string  | Success or error message                   |
| draft                      | object  | The generated email draft                  |
| draft.to                   | string  | Recipient email address(es)                |
| draft.cc                   | string  | Carbon copy recipients (if any)            |
| draft.bcc                  | string  | Blind carbon copy recipients (if any)      |
| draft.subject              | string  | Generated subject line                     |
| draft.body                 | string  | Main email content                         |
| draft.confidence           | number  | AI confidence score (0-1)                  |
| draft.instructionsLanguage | string  | Detected language of original instructions |
| draft.wasTranslated        | boolean | Whether instructions were translated       |

## Example Usage

### Basic Email Composition

```
POST http://localhost:5000/ai/compose-email
Content-Type: application/json

{
  "instructions": "Send an email to john@example.com thanking him for the meeting yesterday and confirming that we'll send the proposal by Friday",
  "userId": 1
}
```

Response:

```json
{
  "message": "Email draft generated successfully",
  "draft": {
    "to": "john@example.com",
    "cc": "",
    "bcc": "",
    "subject": "Thank You for Yesterday's Meeting",
    "body": "Hi John,\n\nI wanted to thank you for taking the time to meet with us yesterday. It was a productive discussion and we appreciate your insights on the project requirements.\n\nI'm writing to confirm that we will have the complete proposal ready and sent to you by Friday, as discussed.\n\nIf you have any questions or need any clarification before then, please don't hesitate to reach out.\n\nBest regards,",
    "confidence": 0.88,
    "instructionsLanguage": "en",
    "wasTranslated": false
  }
}
```

### Multiple Recipients and Complex Instructions

```
POST http://localhost:5000/ai/compose-email
Content-Type: application/json

{
  "instructions": "Write a formal email to the engineering team (engineering@company.com) and copy the project manager (pm@company.com) about the system outage we experienced yesterday from 2-4pm. Explain that it was caused by a database overload and that we've implemented a fix to prevent it from happening again. Mark it as high priority and mention that a detailed report will follow next week.",
  "userId": 1
}
```

Response:

```json
{
  "message": "Email draft generated successfully",
  "draft": {
    "to": "engineering@company.com",
    "cc": "pm@company.com",
    "bcc": "",
    "subject": "[HIGH PRIORITY] System Outage Resolution - Database Overload Incident",
    "body": "Dear Engineering Team,\n\nI am writing regarding the system outage that occurred yesterday between 2:00 PM and 4:00 PM. After thorough investigation, we have determined that the root cause was a database overload caused by an unexpected spike in concurrent transactions.\n\nI want to inform you that our team has implemented an immediate fix to address this issue by optimizing query performance and increasing the connection pool capacity. These measures should prevent similar outages from occurring in the future.\n\nA comprehensive incident report with detailed analysis and long-term preventive measures will be shared with the team by next week.\n\nPlease feel free to reach out if you have any questions or concerns.\n\nRegards,",
    "confidence": 0.92,
    "instructionsLanguage": "en",
    "wasTranslated": false
  }
}
```

### Non-English Instructions

The API supports instructions in multiple languages. The AI will detect the language and translate it if necessary.

```
POST http://localhost:5000/ai/compose-email
Content-Type: application/json

{
  "instructions": "Escribir un correo a support@company.com para reportar un problema con mi cuenta. Mi nombre de usuario es user123 y no puedo iniciar sesión desde ayer. Ya intenté restablecer mi contraseña pero sigo recibiendo un error.",
  "userId": 1
}
```

Response:

```json
{
  "message": "Email draft generated successfully",
  "draft": {
    "to": "support@company.com",
    "cc": "",
    "bcc": "",
    "subject": "Account Login Issue - Username: user123",
    "body": "Hello Support Team,\n\nI am writing to report an issue with my account. My username is user123, and I have been unable to log in since yesterday.\n\nI have already attempted to reset my password, but I continue to receive an error message when trying to access my account.\n\nCould you please investigate this issue and help me regain access to my account? I would appreciate your prompt assistance with this matter.\n\nThank you for your help.\n\nBest regards,",
    "confidence": 0.85,
    "instructionsLanguage": "es",
    "wasTranslated": true
  }
}
```

## Best Practices

1. **Be specific in your instructions** - The more details you provide, the better the AI can generate an appropriate email.

2. **Include recipient information** - Clearly state who should receive the email, including any CC or BCC recipients.

3. **Specify tone and formality** - If you need a particular tone (formal, casual, friendly, professional), mention it in your instructions.

4. **Review the generated drafts** - While the AI generates high-quality drafts, it's always good practice to review them before sending.

5. **Use natural language** - You don't need to use a specific format - write your instructions as you would explain them to a person.

## Error Handling

The API returns appropriate HTTP status codes:

- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - Server-side issues

Error responses include an `error` field with a description of what went wrong.
