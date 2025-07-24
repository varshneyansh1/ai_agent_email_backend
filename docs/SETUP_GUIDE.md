# Setup Guide

This guide will help you set up the AI Email Assistant Backend from scratch.

---

## 1. Prerequisites

- **Node.js** (v18 or higher)
- **Redis** (for background jobs)
- **Google Cloud account** (for OAuth)
- **(Optional) Local LLM (LLaMA 3.1)**

---

## 2. Clone the Repository

```bash
git clone https://github.com/yourusername/email-ai-backend.git
cd email-ai-backend
```

---

## 3. Install Dependencies

```bash
npm install
```

---

## 4. Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=your_session_secret
REDIS_HOST=localhost
REDIS_PORT=6379
# AI/LLM
HUGGINGFACE_API_KEY=your-huggingface-api-key
LLAMA_API_URL=http://localhost:8080/completion
LOCAL_LLM_ENABLED=true
```

---

## 5. Google OAuth Setup

1. Go to [Google Developer Console](https://console.developers.google.com/)
2. Create a new project
3. Enable the Gmail API
4. Create OAuth credentials (Client ID & Secret)
5. Set the redirect URI to match your `CALLBACK_URL`
6. Add Gmail API scopes
7. Copy credentials to your `.env`

---

## 6. Redis Setup

- Install Redis ([download](https://redis.io/download))
- Start Redis server:
  ```bash
  redis-server
  ```
- Ensure `REDIS_HOST` and `REDIS_PORT` in `.env` match your setup

---

## 7. (Optional) Local LLaMA 3.1 Setup

1. Download LLaMA 3.1 model from [Meta AI](https://llama.meta.com/llama2/)
2. Use [llamafile](https://github.com/Mozilla-Ocho/llamafile) to run locally:
   ```bash
   ./llamafile-server --model llama-3.2-8b.Q5_K_M.gguf --port 8080
   ```
3. Set `LLAMA_API_URL` and `LOCAL_LLM_ENABLED=true` in `.env`

---

## 8. Running the App

- Development:
  ```bash
  npm run dev
  ```
- Production:
  ```bash
  npm start
  ```

---

## 9. Testing

- Use Postman or cURL to test endpoints
- See [POSTMAN_TESTING.md](../POSTMAN_TESTING.md) for examples

---

## Troubleshooting

- Check `.env` for missing/incorrect values
- Ensure Redis and (optionally) LLaMA server are running
- Review logs for errors
