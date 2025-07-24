# Voice Search API - cURL Testing Guide

This guide provides cURL commands for testing the Voice Search API. Windows PowerShell and Linux/Mac syntax notes included.

---

## Table of Contents

1. [Usage Notes](#usage-notes)
2. [Example cURL Commands](#example-curl-commands)
   - [Keyword Search](#keyword-search)
   - [Date Range](#date-range)
   - [Sender](#sender)
   - [Folder](#folder)
   - [Combined](#combined)
   - [Limit](#limit)
   - [Month-based](#month-based)
   - [Domain](#domain)
   - [Complex Query](#complex-query)
   - [User ID](#user-id)
   - [Email Address](#email-address)
3. [Expected Response](#expected-response)
4. [Troubleshooting](#troubleshooting)
5. [Related API Docs](#related-api-docs)

---

## Usage Notes

- Windows: Use double quotes for JSON
- Linux/Mac: Use single quotes for JSON

---

## Example cURL Commands

### Keyword Search

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails about project updates\"}"
```

### Date Range

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails from last week\"}"
```

### Sender

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from john@example.com\"}"
```

### Folder

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails in spam folder\"}"
```

### Combined

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from Sarah about quarterly report received in March\"}"
```

### Limit

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me the top 5 emails from support team\"}"
```

### Month-based

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from December containing holiday\"}"
```

### Domain

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from google.com received last month\"}"
```

### Complex Query

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me important emails with attachments from the marketing team received between March 15 and April 10 about the product launch\"}"
```

### User ID

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails about budget approval\", \"userId\": 1}"
```

### Email Address

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails from yesterday\", \"email\": \"your.email@example.com\"}"
```

---

## Expected Response

- See [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md) for response format and details.

---

## Troubleshooting

- Windows: Escape quotes properly
- 400: Check JSON and required fields
- 500: See server logs
- Empty results: Try simpler queries

---

## Related API Docs

- [Voice Search API Guide](docs/VOICE_SEARCH_API_GUIDE.md)
- [AI Email API Guide](docs/AI_EMAIL_API_GUIDE.md)
