# Voice Search API Guide

This document describes how to use the natural language voice search API to search for emails using natural language queries.

## Voice Search Endpoint

```
POST /email/voice-search
```

### Request Body

```json
{
  "voiceText": "string", // Required - Natural language search query
  "email": "string", // Optional - User's email address (falls back to env variable)
  "userId": "number" // Optional - User ID for searching locally stored emails
}
```

### Response

```json
{
  "query": "string", // The original search query
  "extractedParams": {
    // The parsed search parameters
    "keyword": "string", // Search keyword (null if not found)
    "startDate": "string", // Start date in ISO format (null if not found)
    "endDate": "string", // End date in ISO format (null if not found)
    "sender": "string", // Sender email or name (null if not found)
    "folder": "string", // Email folder to search in (default: "INBOX")
    "limit": "number" // Maximum number of results (default: 20)
  },
  "results": [
    // Array of email objects matching the search
    {
      // Email properties depend on whether searching locally or via IMAP
    }
  ]
}
```

## Example Queries

The voice search API can understand a wide variety of natural language queries:

1. **Time-based queries**:

   - "Show me emails from last week"
   - "Find emails from yesterday"
   - "Show emails from January"
   - "Search for emails between March 1 and April 15"

2. **Sender-based queries**:

   - "Show emails from John"
   - "Find messages from support@company.com"
   - "Show emails from Google"

3. **Content-based queries**:

   - "Find emails about project proposal"
   - "Show emails containing quarterly report"
   - "Search for emails with the subject meeting"

4. **Folder-specific queries**:

   - "Show emails in spam folder"
   - "Find messages in trash"
   - "Search for emails in sent mail"

5. **Combined queries**:
   - "Find emails from John about project proposal from last month"
   - "Show me important emails from Maria received yesterday"
   - "Search for emails with attachments from support team received this week"

## Example Requests

### Using cURL

```bash
curl -X POST http://localhost:3000/email/voice-search \
  -H "Content-Type: application/json" \
  -d '{"voiceText": "show me emails from John about quarterly reports received last month"}'
```

### Using JavaScript Fetch

```javascript
fetch("/email/voice-search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    voiceText:
      "show me emails from John about quarterly reports received last month",
  }),
})
  .then((response) => response.json())
  .then((data) => {
    console.log("Search results:", data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
```

## Supported Natural Language Features

The voice search API can extract the following information from natural language queries:

1. **Keywords/Topics**: Extracted from phrases like "about X", "containing Y", "with Z", "related to A", etc.

2. **Date Ranges**:

   - Specific dates: "2023-01-15", "01/15/2023", etc.
   - Month names: "January", "February", etc.
   - Relative dates: "today", "yesterday", "last week", "this month", etc.

3. **Senders**: Extracted from phrases like "from X", where X can be an email address or a name.

4. **Folders**: Recognizes common folder names like "inbox", "spam", "trash", "sent", "drafts", etc.

5. **Result Limits**: Phrases like "top 5", "first 10", "latest 20", or "5 emails".

## Implementation Notes

- The voice search functionality first parses the natural language query to extract search parameters
- It then uses these parameters to perform a search using either the local database or IMAP
- If both local and remote searches are configured, results can be combined
- For best results, speak naturally as if you were asking a human assistant to find emails for you
