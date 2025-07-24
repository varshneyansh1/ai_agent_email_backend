# Postman Voice Search API Testing Guide

This guide shows how to test the Voice Search API using Postman or similar tools.

---

## Table of Contents

1. [Setup](#setup)
2. [Example Searches](#example-searches)
   - [Keyword Search](#keyword-search)
   - [Time-based Search](#time-based-search)
   - [Sender Search](#sender-search)
   - [Combined Search](#combined-search)
   - [Folder Search](#folder-search)
   - [Result Limit](#result-limit)
   - [Date Range](#date-range)
3. [Authentication](#authentication)
4. [Query Parameters](#query-parameters)
5. [Expected Response](#expected-response)
6. [Troubleshooting](#troubleshooting)
7. [Related API Docs](#related-api-docs)

---

## Setup

- Create a new POST request to `http://localhost:5000/email/voice-search`
- Set header: `Content-Type: application/json`

---

## Example Searches

### Keyword Search

```json
{
  "voiceText": "show me emails about project update"
}
```

### Time-based Search

```json
{
  "voiceText": "find emails from last week"
}
```

### Sender Search

```json
{
  "voiceText": "show emails from john@example.com"
}
```

### Combined Search

```json
{
  "voiceText": "find emails from Sarah about quarterly report received in March"
}
```

### Folder Search

```json
{
  "voiceText": "show me important emails in spam folder"
}
```

### Result Limit

```json
{
  "voiceText": "show me the top 5 emails from support team"
}
```

### Date Range

```json
{
  "voiceText": "find emails received between January 1 and January 31"
}
```

---

## Authentication

- If required, add `Authorization` header (Bearer or Basic)

---

## Query Parameters

- You can add `email` and `userId` fields:

```json
{
  "voiceText": "show me emails about budget approval",
  "email": "user@example.com",
  "userId": 123
}
```

---

## Expected Response

- See [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md) for response format and details.

---

## Troubleshooting

- 400: Check JSON and required fields
- 500: See server logs
- Empty results: Try simpler queries
- Auth errors: Check credentials

---

## Related API Docs

- [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md)
- [AI Email API Guide](docs/AI_EMAIL_API_GUIDE.md)
