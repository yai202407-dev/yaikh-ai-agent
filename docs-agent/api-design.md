# YAI Bot — API Design Document

> **Version:** 1.0  
> **Last Updated:** 2026-03-12  
> **Tech Stack:** Express.js (TypeScript), MongoDB (Mongoose), LangChain, Gemini LLM  
> **Default Port:** `3001` (configurable via `PORT` env)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Notes](#2-architecture-notes)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Common Response Conventions](#4-common-response-conventions)
5. [Health Check](#5-health-check)
6. [Agent Routes — `/api/agent`](#6-agent-routes--apiagent)
7. [Agent Configuration Routes — `/api/agent-config`](#7-agent-configuration-routes--apiagent-config)
8. [Knowledge Base / RAG Routes — `/api/knowledge`](#8-knowledge-base--rag-routes--apiknowledge)
9. [Prompt Catalog Routes — `/api/prompts`](#9-prompt-catalog-routes--apiprompts)
10. [Role & Permission Routes — `/api/roles`](#10-role--permission-routes--apiroles)
11. [Monitoring Routes — `/api/monitor`](#11-monitoring-routes--apimonitor)
12. [User Routes — `/api/user`](#12-user-routes--apiuser)
13. [Data Models Reference](#13-data-models-reference)
14. [Error Reference](#14-error-reference)

---

## 1. Overview

YAI Bot is an enterprise AI assistant built on a **multi-agent architecture**. User messages are routed through an orchestrator that classifies intent and dispatches to the appropriate sub-agent:

| Sub-Agent        | Key (`agentId`) | Purpose                                        |
|------------------|-----------------|-------------------------------------------------|
| ChitChat Agent   | `chitchat`      | General conversation, knowledge Q&A             |
| Admin Agent      | `admin`         | Database queries, system administration          |
| Car Booking Agent| `booking`       | Manage vehicle reservations (book, modify, cancel)|
| Purchase Agent   | `purchase`      | Purchase requests and approvals                  |

All endpoints use JSON request/response bodies unless stated otherwise (e.g., `multipart/form-data` for file uploads).

---

## 2. Architecture Notes

### 2.1 Multi-Database Connections

The server maintains three separate MongoDB connections:

| Connection Name      | Purpose                                         |
|----------------------|-------------------------------------------------|
| `agentConnection`   | Bot-specific data (conversations, roles, usage, configs, memory) |
| `documentConnection`| RAG vector store (knowledge documents & embeddings) |
| `knowledgeConnection`| Knowledge artifacts and domain data             |

### 2.2 Real-Time Communication

SSE (Server-Sent Events) is used for streaming agent activity status updates to the frontend in real-time. The client subscribes to `GET /api/agent/status/:userId` and receives events as the orchestrator pipeline processes each stage.

### 2.3 Request Logging

All HTTP requests are logged via the `requestLogger` middleware.

### 2.4 Global Error Handling

Unhandled errors are caught by a centralized error handler middleware, which returns:

```json
{
  "error": "Internal server error occurred within YAI-Bot services."
}
```

---

## 3. Authentication & Authorization

### 3.1 System Token

Several endpoints accept a **system token** for authenticating with external services (e.g., YAI ERP system). This token is resolved in the following priority:

1. `Authorization: Bearer <token>` header
2. `systemToken` field in the request body

### 3.2 User Identity Resolution

User IDs are resolved flexibly. The system searches across multiple identifiers:
- `emp_code` (employee code)
- `emp_id` (employee ID)
- `name` (case-insensitive)
- `eng_name` (English name, case-insensitive)
- MongoDB `_id` (ObjectId)

### 3.3 RBAC (Role-Based Access Control)

Agent access is controlled through a multi-layer permission system:

```
User → BotUser (roles: string[]) → Role (permissions: string[]) → Agent Access
```

- **Wildcard permission:** `*` grants full access to all agents.
- **Agent-specific permission:** `access_agent_{agentId}` (e.g., `access_agent_car_booking`).
- **Functional permissions:** `chat`, `view_monitor`, `manage_knowledge`.

### 3.4 Default Roles

| Role      | Permissions                                                        |
|-----------|--------------------------------------------------------------------|
| `admin`   | `*` (full access)                                                  |
| `manager` | `view_monitor`, `manage_knowledge`, `access_agent_yai_manager`, `access_agent_car_booking` |
| `user`    | `chat`, `access_agent_car_booking`                                 |
| `worker`  | `chat`, `access_agent_car_booking`, `access_agent_purchase_request`|

---

## 4. Common Response Conventions

### Success Responses

```json
// Standard success
{ "success": true, "message": "...", ...data }

// List response
{ "success": true, "conversations": [...] }
```

### Error Responses

```json
// Validation error (400)
{ "error": "User ID is required" }

// Not found (404)  
{ "success": false, "message": "Conversation not found" }

// Unauthorized (401)
{ "success": false, "error": "Invalid credentials" }

// Server error (500)
{ "error": "Internal server error occurred within YAI-Bot services." }
```

---

## 5. Health Check

### `GET /health`

Server and database health status.

**Response `200 OK`:**
```json
{
  "status": "OK",
  "timestamp": "2026-03-12T07:50:53.000Z",
  "uptime": "1234s",
  "database": {
    "connected": true
  }
}
```

**Response `503 Service Unavailable`:**
```json
{
  "status": "Service Unavailable",
  "timestamp": "...",
  "uptime": "...",
  "database": {
    "connected": false
  }
}
```

---

## 6. Agent Routes — `/api/agent`

### 6.1 `POST /api/agent/chat`

**Primary entry point.** Routes the user's message through the Main Orchestrator pipeline, which auto-classifies intent and dispatches to the appropriate sub-agent.

**Request Body:**
```json
{
  "message": "I need to book a car for tomorrow at 9am",
  "userId": "EMP001",
  "conversationId": "6612abc...",    // optional — auto-created if missing
  "systemToken": "eyJhbGci..."       // optional — overridden by Authorization header
}
```

| Field            | Type   | Required | Description                                                      |
|------------------|--------|----------|------------------------------------------------------------------|
| `message`        | string | ✅       | The user's text message                                          |
| `userId`         | string | ✅       | User identifier (also accepted as query param `?userId=`)        |
| `conversationId` | string | ❌       | Existing conversation session ID. Auto-created with title "Auto-created Chat" if missing |
| `systemToken`    | string | ❌       | Bearer token for external system auth                            |

**Response `200 OK`:**
```json
{
  "reply": "Your car has been booked for March 13 at 9:00 AM.",
  "suggestions": ["Check my bookings", "Modify booking", "Cancel booking"],
  "conversationId": "6612abc..."
}
```

| Field            | Type     | Description                                        |
|------------------|----------|----------------------------------------------------|
| `reply`          | string   | The agent's text response                          |
| `suggestions`    | string[] | Follow-up action suggestions for the UI            |
| `conversationId` | string   | The conversation session ID used (new or existing) |

**Error `400`:** `{ "error": "User ID is required" }` or `{ "error": "Message payload is required" }`

---

### 6.2 `POST /api/agent/voice`

Same orchestrator pipeline as `/chat`, but accepts **base64-encoded audio** input. The audio is transcribed by the multimodal voice service before being processed.

**Request Body:**
```json
{
  "audio": "UklGRkYA...",                // base64 audio data
  "mimeType": "audio/webm;codecs=opus",  // audio MIME type
  "userId": "EMP001",
  "conversationId": "6612abc...",
  "systemToken": "eyJhbGci..."
}
```

| Field            | Type   | Required | Description                                    |
|------------------|--------|----------|------------------------------------------------|
| `audio`          | string | ✅       | Base64-encoded audio data                      |
| `mimeType`       | string | ✅       | Audio MIME type (e.g., `audio/webm`, `audio/mp4`) |
| `userId`         | string | ✅       | User identifier                                |
| `conversationId` | string | ❌       | Conversation session ID                        |
| `systemToken`    | string | ❌       | External system auth token                     |

**Response `200 OK`:**
```json
{
  "reply": "I've submitted your purchase request.",
  "suggestions": ["Check status", "New request"]
}
```

**Error `400`:** `{ "error": "Base64 audio and mimeType are required" }`

---

### 6.3 `POST /api/agent/direct/:agent/chat`

**Bypasses the orchestrator** and sends a text message directly to a specific sub-agent.

**Path Parameters:**

| Parameter | Type   | Required | Allowed Values                            |
|-----------|--------|----------|-------------------------------------------|
| `agent`   | string | ✅       | `chitchat`, `admin`, `booking`, `purchase` |

**Request Body:** Same as `/api/agent/chat`.

**Response `200 OK`:**
```json
{
  "reply": "Here are your pending bookings for this week...",
  "suggestions": ["Modify booking #12", "Cancel all"],
  "agent": "booking"
}
```

**Validation:**
- Agent key is validated against the active `AgentRegistry`. Returns `400` if the agent is unknown or inactive:
```json
{ "error": "Unknown or inactive agent 'invalid_key'." }
```

---

### 6.4 `POST /api/agent/direct/:agent/voice`

**Bypasses the orchestrator** and routes voice input directly to a specific sub-agent. Audio is transcribed first, then forwarded.

**Path Parameters:** Same as `6.3`.

**Request Body:** Same as `/api/agent/voice`.

**Response `200 OK`:**
```json
{
  "reply": "Your purchase request #45 has been submitted.",
  "suggestions": [],
  "agent": "purchase"
}
```

---

### 6.5 `POST /api/agent/feedback`

Captures user reinforcement feedback (RLHF-style data) on AI responses.

**Request Body:**
```json
{
  "userId": "EMP001",
  "prompt": "What is the expense limit?",
  "response": "The auto-approval limit is $500.",
  "isCorrect": true,
  "feedbackText": "Very accurate response",    // optional
  "agentRole": "chitchat"                       // optional
}
```

| Field          | Type    | Required | Description                                    |
|----------------|---------|----------|------------------------------------------------|
| `userId`       | string  | ✅       | User identifier                                |
| `prompt`       | string  | ❌       | The original prompt that led to the response    |
| `response`     | string  | ❌       | The AI-generated response being rated           |
| `isCorrect`    | boolean | ❌       | Whether the user verified/liked the response    |
| `feedbackText` | string  | ❌       | Free-text correction or comment                 |
| `agentRole`    | string  | ❌       | Which agent generated the response              |

**Response `200 OK`:**
```json
{ "success": true, "message": "Feedback stored successfully" }
```

---

### 6.6 `GET /api/agent/agents`

Lists all **active** agents registered in the system (no permission filtering).

**Response `200 OK`:**
```json
{
  "agents": [
    {
      "agentId": "car_booking",
      "key": "car_booking",
      "name": "Car Booking Agent",
      "label": "Car Booking Agent",
      "description": "Manages vehicle reservations",
      "capabilities": ["book_car", "modify_booking", "cancel_booking", "view_bookings"],
      "requiresAdmin": false,
      "category": "Domain",
      "isActive": true
    }
  ]
}
```

---

### 6.7 `GET /api/agent/available`

Lists agents **filtered by user permissions** (RBAC-aware).

**Query Parameters:**

| Parameter | Type   | Required | Description                                              |
|-----------|--------|----------|----------------------------------------------------------|
| `userId`  | string | ❌       | If omitted, returns all active agents (no RBAC filtering)|

**Response `200 OK`:** Same shape as `6.6`, but filtered based on the user's roles and permissions.

**Permission Resolution Flow:**
1. Look up `BotUser` by `userId` → get `roles[]`
2. Load all matching `Role` documents → collect `permissions[]`
3. If permissions include `*`, return all agents
4. Otherwise, filter agents where `access_agent_{agentId}` is in permissions

---

### 6.8 `GET /api/agent/greeting`

Generates a personalized greeting based on the user's long-term memory context. Uses the LLM to produce a smart, context-aware welcome message.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
|-----------|--------|----------|--------------------|
| `userId`  | string | ✅       | The user's ID      |

**Response `200 OK`:**
```json
{
  "success": true,
  "greeting": "Welcome back! Ready to check on your pending car booking?",
  "contextFound": true
}
```

| Field          | Type    | Description                                             |
|----------------|---------|---------------------------------------------------------|
| `greeting`     | string  | Personalized greeting (max ~15 words). Defaults to "How can I help you today?" if no context |
| `contextFound` | boolean | Whether relevant long-term memory was found             |

---

### 6.9 `GET /api/agent/status/:userId` — SSE Stream

Establishes a **Server-Sent Events** connection for real-time agent activity monitoring.

**Path Parameters:**

| Parameter | Type   | Required | Description     |
|-----------|--------|----------|-----------------|
| `userId`  | string | ✅       | The user's ID   |

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types:**

| Event Type    | Description                                     | Example Payload                                                          |
|---------------|-------------------------------------------------|--------------------------------------------------------------------------|
| `connected`   | Sent immediately on connection                  | `{ "type": "connected", "label": "Connected", "emoji": "✅", "userId": "..." }` |
| `activity`    | Agent pipeline stage updates                    | `{ "type": "activity", "label": "Classifying intent...", "emoji": "🧠" }` |
| Heartbeat     | Keepalive every 20s (SSE comment format)        | `: heartbeat`                                                            |

**Client Usage (JavaScript):**
```javascript
const source = new EventSource('/api/agent/status/EMP001');
source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.emoji, data.label);
};
```

---

### 6.10 `GET /api/agent/conversations`

Lists all conversation sessions for a user, sorted by most recently updated.

**Query Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| `userId`  | string | ✅       | User's ID    |

**Response `200 OK`:**
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "6612abc...",
      "userId": "EMP001",
      "title": "Car Booking Discussion",
      "lastMessage": "Your booking is confirmed.",
      "isActive": true,
      "metadata": {},
      "createdAt": "2026-03-12T07:00:00.000Z",
      "updatedAt": "2026-03-12T07:30:00.000Z"
    }
  ]
}
```

---

### 6.11 `POST /api/agent/conversations`

Creates a new conversation session.

**Request Body:**
```json
{
  "userId": "EMP001",
  "title": "Technical Support Chat"   // optional, defaults to "New Conversation"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "conversation": {
    "_id": "6612def...",
    "userId": "EMP001",
    "title": "Technical Support Chat",
    "isActive": true,
    "metadata": {},
    "createdAt": "2026-03-12T07:50:00.000Z",
    "updatedAt": "2026-03-12T07:50:00.000Z"
  }
}
```

---

### 6.12 `DELETE /api/agent/conversations/:id`

Deletes a specific conversation and its associated chat history from the memory store.

**Path Parameters:**

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| `id`      | string | ✅       | MongoDB ObjectId of conversation |

**Response `200 OK`:**
```json
{ "success": true, "message": "Conversation deleted" }
```

**Response `404`:**
```json
{ "success": false, "message": "Conversation not found" }
```

---

### 6.13 `DELETE /api/agent/conversations`

Deletes **all** conversations and associated histories for a user.

**Query/Body Parameters:**

| Parameter | Type   | Required | Description  |
|-----------|--------|----------|--------------|
| `userId`  | string | ✅       | User's ID    |

**Response `200 OK`:**
```json
{ "success": true, "message": "All conversations deleted" }
```

---

### 6.14 `GET /api/agent/history/:sessionId`

Retrieves the full chat message history for a given conversation session.

**Path Parameters:**

| Parameter   | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `sessionId` | string | ✅       | The conversation/session ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "messages": [
    {
      "role": "user",
      "content": "I need to book a car",
      "timestamp": "02:30 PM"
    },
    {
      "role": "assistant",
      "content": "Sure! When do you need it?",
      "timestamp": "02:30 PM"
    }
  ]
}
```

---

## 7. Agent Configuration Routes — `/api/agent-config`

### 7.1 `GET /api/agent-config`

Retrieves the LLM configuration for a specific user. Returns a **fallback configuration** (Gemini 2.0 Flash) if no saved config exists.

**Query Parameters:**

| Parameter | Type   | Required | Description                          |
|-----------|--------|----------|--------------------------------------|
| `userId`  | string | ❌       | Defaults to `"default-user"` if omitted |

**Response `200 OK` — Saved Config:**
```json
{
  "_id": "6612...",
  "userId": "EMP001",
  "roles": {
    "mainGenerator": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "AIzaSy...",
      "temperature": 0.7,
      "maxTokens": 2048,
      "additionalParams": {}
    },
    "intentClassifier": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "AIzaSy...",
      "temperature": 0.1,
      "maxTokens": 1024,
      "additionalParams": {}
    },
    "voiceTranscriber": null,
    "embeddingModel": null,
    "pdfTranscriber": null,
    "imageTranscriber": null
  },
  "permissions": ["user"],
  "isActive": true,
  "createdAt": "2026-03-01T...",
  "updatedAt": "2026-03-12T..."
}
```

**Response `200 OK` — Fallback Config (no config saved):**
```json
{
  "userId": "default-user",
  "roles": {
    "mainGenerator": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "SYSTEM_DEFAULT",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "intentClassifier": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "SYSTEM_DEFAULT",
      "temperature": 0.1,
      "maxTokens": 1024
    }
  },
  "isActive": true,
  "isFallback": true
}
```

### LLM Role Definitions

| Role               | Purpose                                               | Typical Temperature |
|--------------------|-------------------------------------------------------|---------------------|
| `mainGenerator`    | Primary LLM for generating agent responses            | `0.7`               |
| `intentClassifier` | Classifies user intent for orchestrator routing       | `0.1`               |
| `voiceTranscriber` | Audio-to-text transcription                           | —                   |
| `embeddingModel`   | Text embedding for RAG / vector similarity            | —                   |
| `pdfTranscriber`   | PDF text extraction and processing                    | —                   |
| `imageTranscriber` | Image-to-text via Vision Language Models (VLM)        | —                   |

### Supported LLM Providers

| Provider    | Enum Value   |
|-------------|-------------|
| OpenAI      | `OpenAI`    |
| Anthropic   | `Anthropic` |
| Google Gemini | `Gemini`  |

---

### 7.2 `GET /api/agent-config/models`

Lists all available Gemini models discovered from the Google AI APIs.

**Response `200 OK`:**
```json
{
  "success": true,
  "count": 15,
  "models": [
    {
      "name": "gemini-2.0-flash-exp",
      "displayName": "Gemini 2.0 Flash",
      "description": "Fast and versatile multimodal model",
      "inputTokenLimit": 1048576,
      "outputTokenLimit": 8192,
      "supportedGenerationMethods": ["generateContent", "countTokens"]
    }
  ]
}
```

---

### 7.3 `POST /api/agent-config`

Creates or updates (upserts) a user's LLM configuration.

**Request Body:**
```json
{
  "userId": "EMP001",
  "roles": {
    "mainGenerator": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "AIzaSy...",
      "temperature": 0.7,
      "maxTokens": 2048
    },
    "intentClassifier": {
      "provider": "Gemini",
      "model": "gemini-2.0-flash-exp",
      "apiKey": "AIzaSy...",
      "temperature": 0.1,
      "maxTokens": 1024
    }
  },
  "isActive": true,
  "permissions": ["user", "chat"]
}
```

| Field         | Type    | Required | Description                                          |
|---------------|---------|----------|------------------------------------------------------|
| `userId`      | string  | ✅       | Target user identifier                               |
| `roles`       | object  | ✅       | LLM provider config per role (see role definitions)  |
| `isActive`    | boolean | ❌       | Enable/disable the config                            |
| `permissions` | string[]| ❌       | Permissions array for this user                      |

> **Note:** API keys are **automatically encrypted** at rest using AES-256 and decrypted on read.

**Response `200 OK`:**
```json
{
  "message": "Configuration updated successfully",
  "config": { ... }
}
```

---

### 7.4 `POST /api/agent-config/clear-cache`

Forcefully clears the Gemini model discovery cache and optionally deletes stored user configurations.

**Query/Body Parameters:**

| Parameter | Type   | Required | Description                                                |
|-----------|--------|----------|------------------------------------------------------------|
| `userId`  | string | ❌       | If provided, only clears config for this user. Otherwise, clears ALL user configs (system-wide reset). |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Discovery cache cleared and configuration for user \"EMP001\" deleted (reset to defaults)."
}
```

---

## 8. Knowledge Base / RAG Routes — `/api/knowledge`

### 8.1 `GET /api/knowledge/topics`

Retrieves suggested topics from the knowledge base using the Admin Bot's exploration tools. Returns 3–5 interesting topics formatted in natural language.

**Response `200 OK`:**
```json
{
  "topics": [
    { "topic": "Car Bookings", "summary": "Vehicle reservation data and usage patterns" },
    { "topic": "Purchase Requests", "summary": "Employee purchase submissions and approval tracking" },
    { "topic": "Employee Directory", "summary": "Staff profiles, departments, and contact information" }
  ]
}
```

> **Fallback:** Returns hardcoded sample topics if the knowledge base is empty or the exploration fails.

---

### 8.2 `GET /api/knowledge/documents`

Lists unique documents that have been ingested into the RAG vector store for a specific user.

**Query Parameters:**

| Parameter | Type   | Required | Description                               |
|-----------|--------|----------|-------------------------------------------|
| `userId`  | string | ❌       | Defaults to `"default-user"` if omitted   |

**Response `200 OK`:**
```json
{
  "documents": [
    {
      "filename": "company-policy-v2.pdf",
      "folder": "policies",
      "createdAt": "2026-03-10T...",
      "source": "upload"
    }
  ]
}
```

---

### 8.3 `POST /api/knowledge/ingest`

Ingests plain text or markdown content into the RAG vector store.

**Request Body:**
```json
{
  "content": "Company policy: Maximum purchase auto-approval limit is $500...",
  "metadata": {
    "source": "manual",
    "filename": "expense-policy.md",
    "folder": "policies"
  },
  "userId": "EMP001"
}
```

| Field      | Type   | Required | Description                                    |
|------------|--------|----------|------------------------------------------------|
| `content`  | string | ✅       | The text content to ingest                     |
| `metadata` | object | ❌       | Arbitrary key-value metadata for the document  |
| `userId`   | string | ❌       | Defaults to `"default-user"`                   |

**Response `201 Created`:**
```json
{
  "message": "Document ingested successfully.",
  "documentId": "6612..."
}
```

---

### 8.4 `POST /api/knowledge/ingest-pdf`

Uploads and processes a PDF document for RAG indexing.

**Request Format:** `multipart/form-data`

| Field      | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| `file`     | File   | ✅       | The PDF file to upload (field name: `file`)|
| `metadata` | string | ❌       | JSON string of metadata                    |
| `userId`   | string | ❌       | User identifier                            |

**Response `201 Created`:**
```json
{
  "message": "PDF ingested successfully.",
  "documentId": "6612...",
  "chunks": 15
}
```

| Field        | Type   | Description                                       |
|------------- |--------|---------------------------------------------------|
| `documentId` | string | ID of the ingested document                       |
| `chunks`     | number | Number of text chunks the PDF was split into      |

---

### 8.5 `POST /api/knowledge/ingest-image`

Uploads and processes an image using a Vision Language Model (VLM) for transcription/ingestion.

**Request Format:** `multipart/form-data`

| Field      | Type   | Required | Description                                |
|------------|--------|----------|--------------------------------------------|
| `file`     | File   | ✅       | The image file (field name: `file`)        |
| `metadata` | string | ❌       | JSON string of metadata                    |
| `userId`   | string | ❌       | User identifier                            |

**Response `201 Created`:**
```json
{
  "message": "Image ingested successfully.",
  "documentId": "6612...",
  "chunks": 3
}
```

---

### 8.6 `POST /api/knowledge/query`

Directly tests RAG retrieval without invoking an agent pipeline. Useful for debugging and testing the vector search.

**Request Body:**
```json
{
  "query": "What is the expense approval limit?",
  "userId": "EMP001"
}
```

| Field   | Type   | Required | Description                           |
|---------|--------|----------|---------------------------------------|
| `query` | string | ✅       | Natural language query string         |
| `userId`| string | ❌       | User context for scoped retrieval     |

**Response `200 OK`:**
```json
{
  "results": [
    {
      "content": "The auto-approval limit for purchases is $500...",
      "metadata": { "source": "expense-policy.pdf", "page": 3 },
      "score": 0.92
    }
  ]
}
```

---

## 9. Prompt Catalog Routes — `/api/prompts`

### 9.1 `GET /api/prompts`

Fetches all saved override prompts, sorted by creation date (newest first).

**Response `200 OK`:**
```json
[
  {
    "_id": "6612...",
    "title": "Car Booking Troubleshooting Override",
    "description": "Special handling when users are angry about car bookings.",
    "domain": "chitchat",
    "instructions": "If the user asks about car bookings and seems frustrated, gently inform them to talk to the 'Car Booking Agent'...",
    "triggerKeywords": ["car booking", "frustrated", "angry", "broken"],
    "isActive": true,
    "createdAt": "2026-03-01T..."
  }
]
```

### Prompt Catalog Schema

| Field             | Type     | Description                                                  |
|-------------------|----------|--------------------------------------------------------------|
| `title`           | string   | Human-readable prompt title                                  |
| `description`     | string   | Brief description of the override behavior                   |
| `domain`          | string   | Target agent domain (`chitchat`, `admin`, `booking`, etc.)   |
| `instructions`    | string   | The actual prompt instructions injected at runtime           |
| `triggerKeywords` | string[] | Keywords that activate this override                         |
| `embedding`       | number[] | Vector embedding for semantic matching                       |
| `isActive`        | boolean  | Whether the prompt is currently active                       |

---

### 9.2 `POST /api/prompts/seed`

Seeds the database with sample override prompts for demonstration purposes.

**Response `200 OK`:**
```json
{ "success": true, "message": "Sample prompts seeded in vector store" }
```

**Seeded Prompts:**
1. **Car Booking Troubleshooting Override** — Handles frustrated users asking about bookings
2. **Expense Policy Explanation** — Explains purchase limits and Manager approval workflows

---

## 10. Role & Permission Routes — `/api/roles`

### 10.1 `GET /api/roles`

Lists all defined roles, sorted alphabetically.

**Response `200 OK`:**
```json
{
  "roles": [
    {
      "_id": "6612...",
      "name": "admin",
      "description": "System Administrator with full access",
      "permissions": ["*"],
      "createdAt": "2026-03-01T...",
      "updatedAt": "2026-03-01T..."
    },
    {
      "_id": "6613...",
      "name": "worker",
      "description": "Field or factory worker",
      "permissions": ["chat", "access_agent_car_booking", "access_agent_purchase_request"],
      "createdAt": "2026-03-01T...",
      "updatedAt": "2026-03-01T..."
    }
  ]
}
```

---

### 10.2 `POST /api/roles`

Creates a new role.

**Request Body:**
```json
{
  "name": "supervisor",
  "description": "Team supervisor with extended access",
  "permissions": ["chat", "access_agent_car_booking", "view_monitor"]
}
```

| Field         | Type     | Required | Description                         |
|---------------|----------|----------|-------------------------------------|
| `name`        | string   | ✅       | Unique role name                    |
| `description` | string   | ❌       | Human-readable description          |
| `permissions` | string[] | ❌       | Array of permission keys            |

**Response `201 Created`:**
```json
{ "role": { "_id": "...", "name": "supervisor", ... } }
```

---

### 10.3 `PUT /api/roles/:name`

Updates an existing role by its unique name.

**Path Parameters:**

| Parameter | Type   | Required | Description       |
|-----------|--------|----------|-------------------|
| `name`    | string | ✅       | The role name     |

**Request Body:**
```json
{
  "description": "Updated description",
  "permissions": ["chat", "access_agent_car_booking", "access_agent_purchase_request", "view_monitor"]
}
```

**Response `200 OK`:**
```json
{ "role": { ... } }
```

---

### 10.4 `POST /api/roles/assign`

Assigns roles to a specific user. Creates a `BotUser` entry if one doesn't exist (upsert).

**Request Body:**
```json
{
  "userId": "EMP001",
  "roles": ["worker", "user"]
}
```

| Field    | Type     | Required | Description                                                   |
|----------|----------|----------|---------------------------------------------------------------|
| `userId` | string   | ✅       | User ID (resolved via flexible identity matching)             |
| `roles`  | string[] | ✅       | Array of role names to assign                                 |

**Response `200 OK`:**
```json
{
  "message": "Roles assigned successfully",
  "user": {
    "_id": "6612...",
    "userId": "6612abc...",
    "name": "John Doe",
    "roles": ["worker", "user"],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 10.5 `POST /api/roles/seed`

Initializes the system with default roles, synchronizes the agent registry, and creates default permissions.

**Response `200 OK`:**
```json
{ "message": "Roles, Permissions and Agents synchronized successfully." }
```

---

### 10.6 `GET /api/roles/permissions`

Lists all available individual permissions, sorted by category and name.

**Response `200 OK`:**
```json
{
  "permissions": [
    {
      "_id": "6612...",
      "key": "access_agent_car_booking",
      "name": "Access Car Booking Agent",
      "category": "Agent",
      "description": "Allows user to interact with the Car Booking Agent"
    },
    {
      "_id": "6613...",
      "key": "view_monitor",
      "name": "View Monitoring Dashboard",
      "category": "System",
      "description": "Access the monitoring and analytics dashboard"
    }
  ]
}
```

---

### 10.7 `GET /api/roles/agents`

Lists all agents in the registry (active and inactive).

**Response `200 OK`:**
```json
{
  "agents": [
    {
      "_id": "6612...",
      "agentId": "car_booking",
      "name": "Car Booking Agent",
      "description": "Manages vehicle reservations",
      "capabilities": ["book_car", "modify_booking", "cancel_booking"],
      "isActive": true,
      "requiresAdmin": false,
      "category": "Domain"
    }
  ]
}
```

---

### 10.8 `GET /api/roles/users`

Lists users from the YAI system with their assigned bot roles.

**Query Parameters:**

| Parameter | Type   | Required | Description                                     |
|-----------|--------|----------|-------------------------------------------------|
| `search`  | string | ❌       | Search filter (case-insensitive regex on name, emp_code, email) |

**Response `200 OK`:**
```json
{
  "users": [
    {
      "_id": "6612abc...",
      "name": "Menghorng",
      "emp_code": "EMP001",
      "email": "menghorng@company.com",
      "roles": ["admin"],
      "userId": "6612abc..."
    }
  ]
}
```

> **Note:** Results are limited to 20 users. Uses flexible identity matching across `name`, `emp_code`, and `email` fields.

---

### 10.9 `POST /api/roles/sync`

Manually synchronizes the agent registry and permission entries with the system configuration.

**Response `200 OK`:**
```json
{ "message": "Registry and permissions synced." }
```

---

## 11. Monitoring Routes — `/api/monitor`

### 11.1 `GET /api/monitor/usage`

Returns comprehensive, aggregated usage analytics for the monitoring dashboard.

**Response `200 OK`:**
```json
{
  "summary": {
    "totalQuestions": 1234,
    "totalTokens": 5678900,
    "avgConfidence": 0.87,
    "totalErrors": 12,
    "userCount": 45,
    "topicCount": 89
  },
  "userStats": [
    {
      "_id": "EMP001",
      "count": 156,
      "tokens": 234567,
      "avgConfidence": 0.91
    }
  ],
  "lowConfidenceLogs": [
    {
      "userId": "EMP002",
      "prompt": "What about the thing we discussed?",
      "response": "I'm sorry, I'm not sure what you're referring to.",
      "confidence": 0.35,
      "agentRole": "chitchat",
      "createdAt": "2026-03-11T..."
    }
  ],
  "recentErrors": [
    {
      "userId": "EMP003",
      "prompt": "Book a car for...",
      "error": "API timeout after 30000ms",
      "agentRole": "booking",
      "createdAt": "2026-03-12T..."
    }
  ]
}
```

| Section             | Description                                                        |
|---------------------|--------------------------------------------------------------------|
| `summary`           | Aggregated totals: questions, tokens, confidence, errors, unique users/topics |
| `userStats`         | Top 10 users by query count with token usage and average confidence |
| `lowConfidenceLogs` | Last 10 responses with confidence < 0.6 (excluding errors)        |
| `recentErrors`      | Last 10 system errors                                              |

---

### 11.2 `POST /api/monitor/ask`

Query the monitoring data using **natural language**. An LLM (Analytics Assistant) analyzes the stats and answers the question.

**Request Body:**
```json
{
  "question": "Which user has the most car booking requests this week?",
  "stats": {
    "summary": { "totalQuestions": 1234 },
    "userStats": [...]
  },
  "userId": "admin"
}
```

| Field      | Type   | Required | Description                                      |
|------------|--------|----------|--------------------------------------------------|
| `question` | string | ✅       | The natural language question about the report   |
| `stats`    | object | ✅       | The monitoring statistics context to analyze      |
| `userId`   | string | ❌       | Used to resolve which LLM config to use          |

**Response `200 OK`:**
```json
{
  "answer": "**EMP001 (Menghorng)** has the most car booking requests with **45 queries** this week, averaging a confidence score of **0.93**."
}
```

---

### 11.3 `POST /api/monitor/login`

Simple credential-based authentication for the monitoring dashboard.

**Request Body:**
```json
{
  "username": "admin",
  "password": "YAI-Bot-Admin-2024"
}
```

| Field      | Type   | Required | Description              |
|------------|--------|----------|--------------------------|
| `username` | string | ✅       | Monitor dashboard username (env: `ADMIN_USERNAME`) |
| `password` | string | ✅       | Monitor dashboard password (env: `ADMIN_PASSWORD`) |

**Response `200 OK`:**
```json
{ "success": true, "message": "Login successful" }
```

**Response `401 Unauthorized`:**
```json
{ "success": false, "error": "Invalid credentials" }
```

---

## 12. User Routes — `/api/user`

### 12.1 `GET /api/user/:userId`

Retrieves combined user information from both the **YAI ERP system** (core identity) and the **Bot User** model (roles & permissions).

**Path Parameters:**

| Parameter | Type   | Required | Description                                                     |
|-----------|--------|----------|-----------------------------------------------------------------|
| `userId`  | string | ✅       | Flexible identifier (emp_code, emp_id, name, eng_name, ObjectId)|

**Response `200 OK`:**
```json
{
  "_id": "6612abc...",
  "name": "Menghorng",
  "emp_code": "EMP001",
  "emp_id": "1001",
  "email": "menghorng@company.com",
  "department": "IT",
  "position": "Software Engineer",
  "roles": ["admin"]
}
```

**Identity Resolution:**
1. Searches the YAI `users` collection (ERP data) using flexible matching
2. Uses the canonical `_id` to look up the corresponding `BotUser`
3. Merges both records, with `roles` coming from `BotUser`

---

## 13. Data Models Reference

### 13.1 Conversation

| Field         | Type              | Description                                |
|---------------|-------------------|--------------------------------------------|
| `userId`      | string (indexed) | Owner of the conversation                   |
| `title`       | string            | Display title (default: "New Conversation") |
| `lastMessage` | string?           | Last message content preview                |
| `isActive`    | boolean           | Whether the conversation is active          |
| `metadata`    | Mixed             | Arbitrary metadata object                   |
| `createdAt`   | Date              | Auto-generated timestamp                    |
| `updatedAt`   | Date              | Auto-generated timestamp                    |

### 13.2 Agent Registry

| Field          | Type               | Description                              |
|----------------|-------------------|------------------------------------------|
| `agentId`      | string (unique)    | Machine identifier (e.g., `car_booking`) |
| `name`         | string             | Display name                             |
| `description`  | string             | Agent purpose description                |
| `capabilities` | string[]           | List of tool/action capabilities         |
| `isActive`     | boolean            | Whether agent is currently available     |
| `requiresAdmin`| boolean            | Whether admin privileges are needed      |
| `category`     | string             | `Domain`, `SubAgent`, or `Tool`          |

### 13.3 Role

| Field         | Type              | Description                           |
|---------------|-------------------|---------------------------------------|
| `name`        | string (unique)   | Role identifier (e.g., `admin`)       |
| `description` | string            | Human-readable description            |
| `permissions` | string[]          | Array of permission keys              |

### 13.4 Permission

| Field         | Type               | Description                                    |
|---------------|-------------------|------------------------------------------------|
| `key`         | string (unique)    | Machine identifier (e.g., `access_agent_car_booking`) |
| `name`        | string             | Display name                                   |
| `category`    | string             | Category grouping (`System`, `Agent`, `Data`)  |
| `description` | string             | What this permission grants                    |

### 13.5 Bot User

| Field     | Type              | Description                                    |
|-----------|-------------------|------------------------------------------------|
| `userId`  | string (unique)   | Canonical user ID (from YAI system `_id`)      |
| `name`    | string            | User display name                              |
| `roles`   | string[]          | Assigned role names                            |

### 13.6 User Agent Config

| Field         | Type              | Description                                   |
|---------------|-------------------|-----------------------------------------------|
| `userId`      | string (unique)   | User identifier                               |
| `roles`       | object            | LLM provider config per role (see §7.1)       |
| `permissions` | string[]          | User-level permissions (default: `["user"]`)  |
| `isActive`    | boolean           | Whether config is enabled                     |

### 13.7 Bot Usage

| Field           | Type              | Description                              |
|-----------------|-------------------|------------------------------------------|
| `userId`        | string (indexed)  | User who made the query                  |
| `conversationId`| string (indexed)  | Conversation session                     |
| `messageId`     | string?           | Specific message reference               |
| `prompt`        | string            | User's input text                        |
| `response`      | string            | Agent's response text                    |
| `tokens.prompt` | number            | Input token count                        |
| `tokens.completion`| number         | Output token count                       |
| `tokens.total`  | number            | Total token count                        |
| `confidence`    | number            | Response confidence (0.0 – 1.0)         |
| `latencyMs`     | number            | Response time in milliseconds            |
| `agentRole`     | string            | Which agent handled the query            |
| `error`         | string?           | Error message if the request failed      |

### 13.8 Response Feedback

| Field          | Type    | Description                                        |
|----------------|---------|----------------------------------------------------|
| `userId`       | string  | User who provided feedback                         |
| `messageId`    | string? | Reference to the specific message                  |
| `prompt`       | string  | The input prompt that led to the response          |
| `response`     | string  | The AI-generated response being rated              |
| `isCorrect`    | boolean | User verification (thumbs up/down)                 |
| `feedbackText` | string? | Detailed correction or user comment                |
| `agentRole`    | string  | Which agent produced the response                  |

### 13.9 Long-Term Memory

| Field       | Type                                          | Description                                   |
|-------------|-----------------------------------------------|-----------------------------------------------|
| `userId`    | string (indexed)                              | Memory owner                                  |
| `key`       | string                                        | Memory type (e.g., `user_preference`, `discovered_fact`) |
| `value`     | string                                        | The distilled knowledge content               |
| `relevance` | number                                        | Importance weight (0.0 – 1.0)                 |
| `category`  | enum: `preference`, `fact`, `summary`, `behavior` | Memory classification                      |
| `metadata`  | Mixed                                         | Arbitrary context data                        |
| `embedding` | number[]                                      | Vector embedding for semantic search          |

> **Unique Constraint:** `userId + key + value` prevents duplicate memories.

### 13.10 Prompt Catalog

| Field             | Type     | Description                                              |
|-------------------|----------|----------------------------------------------------------|
| `title`           | string   | Prompt override title                                    |
| `description`     | string   | Brief description of behavior                            |
| `domain`          | string   | Target agent domain (`chitchat`, `admin`, etc.)          |
| `instructions`    | string   | The actual prompt instructions                           |
| `triggerKeywords` | string[] | Activation keywords                                     |
| `embedding`       | number[] | Vector embedding for semantic matching                   |
| `isActive`        | boolean  | Whether the override is active                           |

### 13.11 Knowledge Artifact

| Field      | Type   | Description                           |
|------------|--------|---------------------------------------|
| `topic`    | string | Knowledge topic identifier            |
| `summary`  | string | Brief topic summary                   |
| `metadata` | Mixed  | Arbitrary metadata                    |

---

## 14. Error Reference

| HTTP Code | Meaning                | Common Causes                                                  |
|-----------|------------------------|----------------------------------------------------------------|
| `400`     | Bad Request            | Missing required fields (`userId`, `message`, `audio`, etc.)   |
| `401`     | Unauthorized           | Invalid monitor dashboard credentials                          |
| `404`     | Not Found              | Conversation ID not found                                      |
| `500`     | Internal Server Error  | Unhandled exceptions, database connectivity issues, LLM API failures |

### Standard Error Shape

```json
{
  "error": "Human-readable error description"
}
```

For validation-related endpoints:
```json
{
  "success": false,
  "message": "Conversation not found"
}
```
