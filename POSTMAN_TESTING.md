# Testing Intelligent Reply in Postman

This guide will walk you through testing the AI email response functionality in Postman.

## Prerequisites

1. Your backend server is running at http://localhost:5000
2. You have a user account in the database
3. You need to have your email credentials set in `.env` file

## Setting Up Postman

1. **Create a new Collection**

   - Name it "Email AI Backend Testing"

2. **Set up environment variables** (optional but recommended)
   - Create a new environment called "Email AI Local"
   - Add these variables:
     - `base_url`: http://localhost:5000
     - `user_id`: 1 (or another valid user ID in your database)

## Test Workflow with Automatic Style Analysis

The system now automatically analyzes your writing style by fetching emails from your sent folder. You don't need to manually add sample emails anymore.

### Test 1: Generate Intelligent Reply

1. **Create a new request**:

   - Method: POST
   - URL: `{{base_url}}/ai/intelligent-reply` (or `http://localhost:5000/ai/intelligent-reply`)
   - Headers: `Content-Type: application/json`
   - Body (raw JSON):

   ```json
   {
     "userId": 1,
     "emailId": 1, // The ID of an email in your database
     "forceStyleUpdate": true // Set to true to ensure style analysis runs
   }
   ```

2. **Send the request**

3. **Examine the response**, which should include:

   - Complete reply text with greeting and signature
   - Subject line prefixed with "Re:"
   - Recipient address (the sender of the original email)
   - Confidence score

4. **Check server logs** to see:
   - Automatic fetching of emails from sent folder
   - Style analysis process
   - Response generation

### Test 2: Send the Generated Reply

1. **Create a new request**:

   - Method: POST
   - URL: `{{base_url}}/email/reply` (or `http://localhost:5000/email/reply`)
   - Headers: `Content-Type: application/json`
   - Body (raw JSON) - use values from the previous response:

   ```json
   {
     "email": "your-email@gmail.com",
     "recipient": "recipient-from-previous-response@example.com",
     "subject": "subject-from-previous-response",
     "body": "body-from-previous-response",
     "inReplyTo": "email-id-from-previous-response"
   }
   ```

2. **Send the request** and verify the email was sent successfully

## Compose Email API Testing

**Endpoint:** `POST /ai/compose-email`

This endpoint accepts user instructions (in any language) and generates a complete email draft with appropriate recipients, subject, and body content.

1. Open a new request in Postman
2. Set the method to `POST`
3. Enter the URL: `http://localhost:5000/ai/compose-email`
4. In the "Headers" tab, add:
   - `Content-Type: application/json`
5. In the "Body" tab, select "raw" and "JSON", then enter:

```json
{
  "instructions": "Write a project status update to the team at dev@company.com. Let them know we've completed the login feature but are still working on the payment integration. We expect to finish by next Friday. Copy the project manager at pm@company.com.",
  "userId": 1
}
```

6. Click "Send" to execute the request
7. Verify that the response contains:
   - `message`: "Email draft generated successfully"
   - `draft` object with:
     - `to`: Contains "dev@company.com"
     - `cc`: Contains "pm@company.com"
     - `subject`: A relevant subject line for a status update
     - `body`: Email text that mentions login completion, payment integration, and next Friday
     - `confidence`: A numeric value between 0 and 1
     - `instructionsLanguage`: "en"
     - `wasTranslated`: false

**Testing with Non-English Instructions:**

1. Create a new request with the same settings, but use non-English instructions:

```json
{
  "instructions": "Schreiben Sie eine Einladung an client@example.com für ein Meeting am Freitag um 14 Uhr. Das Thema ist Produktpräsentation.",
  "userId": 1
}
```

2. Send the request and verify:
   - Email draft is generated correctly with appropriate recipient, subject, and content
   - `instructionsLanguage` shows "de" or another detected language
   - `wasTranslated` is `true` since the instructions were not in English

**Error Testing:**

1. Create a request without instructions:

```json
{
  "userId": 1
}
```

2. Verify that you receive a 400 error with a message indicating that instructions are required

## What's Happening Behind the Scenes

When you call the `/ai/intelligent-reply` endpoint, the system:

1. **Automatically analyzes your writing style**:

   - First tries to fetch emails from your sent folder via IMAP
   - Falls back to database emails if IMAP fails
   - Creates/updates your style profile based on these emails

2. **Retrieves the target email** that you're replying to

3. **Generates an AI response** using LLaMA or HuggingFace models

4. **Applies your writing style** to the response:

   - Adds your typical greeting
   - Adjusts tone and formality
   - Matches your sentence structure
   - Appends your signature

5. **Returns a complete reply package** ready to be sent

## Frontend Integration

For frontend integration, you would:

1. Add a "Reply Intelligently" button next to each email
2. When clicked, call the `/ai/intelligent-reply` endpoint with the email ID
3. Display the generated reply in a compose window
4. Allow the user to edit before sending
5. Submit the final reply through the `/email/reply` endpoint

## Troubleshooting

1. **If style analysis fails**:

   - Check your email credentials in `.env` file
   - Make sure your Hugging Face API key is valid
   - Check server logs for IMAP connection errors

2. **If generation fails**:

   - Check for error messages in the server console
   - Verify that either your local LLaMA is running or Hugging Face API key is valid
   - Try with shorter email content

3. **If you see "No emails found" error**:
   - Make sure there's at least one email in your database
   - Add a sample email using the `/email/save` endpoint:
   ```json
   {
     "userId": 1,
     "sender": "test@example.com",
     "subject": "Test Email",
     "body": "This is a test email body.",
     "receivedAt": "2023-06-15T14:30:00Z"
   }
   ```
