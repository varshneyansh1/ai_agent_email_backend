# Voice Search API - Testing with cURL

Below are cURL commands you can use to test the voice search API. These commands are formatted for Windows PowerShell. For Linux/Mac terminals, replace the double quotes with single quotes for the JSON data.

## Example 1: Simple Keyword Search

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails about project updates\"}"
```

## Example 2: Search by Date Range

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails from last week\"}"
```

## Example 3: Search by Sender

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from john@example.com\"}"
```

## Example 4: Search by Folder

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails in spam folder\"}"
```

## Example 5: Combined Search

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from Sarah about quarterly report received in March\"}"
```

## Example 6: Specific Date Range

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show emails received between January 1 and January 31\"}"
```

## Example 7: Limit Results

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me the top 5 emails from support team\"}"
```

## Example 8: Month-based Search

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from December containing holiday\"}"
```

## Example 9: Search with Domain

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails from google.com received last month\"}"
```

## Example 10: Complex Query

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me important emails with attachments from the marketing team received between March 15 and April 10 about the product launch\"}"
```

## Using with a Specific User ID (for local database search)

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"find emails about budget approval\", \"userId\": 1}"
```

## Using with a Specific Email Address

```bash
curl -X POST "http://localhost:3000/email/voice-search" -H "Content-Type: application/json" -d "{\"voiceText\": \"show me emails from yesterday\", \"email\": \"your.email@example.com\"}"
```

# Expected Response Format

The API returns a JSON response with the following structure:

```json
{
  "summary": {
    "query": "find emails from Sarah about quarterly report received in March",
    "folder": "INBOX",
    "totalResults": 3,
    "searchCriteria": {
      "keyword": "\"quarterly report\"",
      "sender": "Sarah",
      "dateRange": "3/1/2024 to 3/31/2024",
      "maximumResults": 20
    }
  },
  "extractedParams": {
    "keyword": "quarterly report",
    "startDate": "2024-03-01T00:00:00.000Z",
    "endDate": "2024-03-31T23:59:59.999Z",
    "sender": "Sarah",
    "folder": "INBOX",
    "limit": 20
  },
  "results": [
    // Array of email objects matching the search criteria
  ]
}
```
