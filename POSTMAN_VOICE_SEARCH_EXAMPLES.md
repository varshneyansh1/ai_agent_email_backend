# Testing Voice Search API with Postman

This guide shows how to test the Voice Search API using Postman or similar API testing tools.

## Basic Setup

1. Create a new request in Postman
2. Set the request type to **POST**
3. Set the URL to: `http://localhost:5000/email/voice-search`
4. Go to the "Headers" tab and add:
   - Key: `Content-Type`
   - Value: `application/json`

## Example 1: Simple Keyword Search

### Request Body

```json
{
  "voiceText": "show me emails about project update"
}
```

This simulates a user asking for emails containing the keywords "project update".

## Example 2: Time-based Search

### Request Body

```json
{
  "voiceText": "find emails from last week"
}
```

This searches for emails received within the last 7 days.

## Example 3: Search by Sender

### Request Body

```json
{
  "voiceText": "show emails from john@example.com"
}
```

This searches for emails from a specific sender.

## Example 4: Combined Search with Multiple Criteria

### Request Body

```json
{
  "voiceText": "find emails from Sarah about quarterly report received in March"
}
```

This searches for emails:

- From a sender named "Sarah"
- Containing the keywords "quarterly report"
- Received during the month of March

## Example 5: Folder-specific Search

### Request Body

```json
{
  "voiceText": "show me important emails in spam folder"
}
```

This searches for emails containing the keyword "important" in the spam folder.

## Example 6: Search with Result Limit

### Request Body

```json
{
  "voiceText": "show me the top 5 emails from support team"
}
```

This limits the search results to the 5 most recent emails from "support team".

## Example 7: Date Range Search

### Request Body

```json
{
  "voiceText": "find emails received between January 1 and January 31"
}
```

This searches for emails within a specific date range.

## Testing with Authentication

If your API requires authentication, add the appropriate auth headers:

### For Bearer Token

Add a header:

- Key: `Authorization`
- Value: `Bearer your-token-here`

### For Basic Auth

Add a header:

- Key: `Authorization`
- Value: `Basic base64encoded-username:password`

## Query Parameters

You can also include optional query parameters:

### Request Body with User Info

```json
{
  "voiceText": "show me emails about budget approval",
  "email": "user@example.com",
  "userId": 123
}
```

This specifies:

- The user's email address to search (overrides environment default)
- The user ID for searching locally stored emails

## Expected Response

The response will include:

1. The original query
2. Extracted search parameters
3. Search results

For example:

```json
{
  "query": "find emails from Sarah about quarterly report received in March",
  "extractedParams": {
    "keyword": "quarterly report",
    "startDate": "2023-03-01T00:00:00.000Z",
    "endDate": "2023-03-31T23:59:59.999Z",
    "sender": "Sarah",
    "folder": "INBOX",
    "limit": 20
  },
  "results": [
    {
      "id": "abc123",
      "from": {
        "text": "Sarah Johnson <sarah.j@example.com>"
      },
      "subject": "Q1 Quarterly Report Draft",
      "date": "2023-03-15T14:25:30.000Z",
      "snippet": "Please find attached the quarterly report draft for Q1 2023...",
      "body": "Please find attached the quarterly report draft for Q1 2023. I need your feedback by end of week..."
    }
    // More email results...
  ]
}
```

## Troubleshooting

If you encounter issues:

1. **400 Bad Request**: Check that your JSON is valid and includes the required `voiceText` field.

2. **500 Internal Server Error**: Check the server logs for details. This could indicate an issue with the parsing logic or the search implementation.

3. **Empty Results**: Try simpler queries first to verify that the search is working, then add complexity.

4. **Authentication Errors**: Ensure you're including the correct authentication credentials if required.
