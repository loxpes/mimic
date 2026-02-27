# API Reference

Mimic REST API documentation. Base URL: `http://localhost:4001`

---

## Overview

The API provides endpoints for managing testing sessions, personas, objectives, projects, and real-time event streaming.

### Response Format

All responses are JSON. Successful responses return data directly. Errors return:

```json
{
  "error": "Error message description"
}
```

---

## Sessions

### List Sessions

```http
GET /api/sessions
```

**Response:**

```json
[
  {
    "id": "session_abc123",
    "personaId": "persona_xyz",
    "objectiveId": "objective_123",
    "targetUrl": "https://example.com",
    "llmConfig": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
    "visionConfig": { "includeScreenshots": true },
    "state": {
      "status": "completed",
      "actionCount": 15,
      "progress": 1.0
    },
    "results": { "outcome": "completed", "findings": 3 },
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:45:00Z"
  }
]
```

### Get Session

```http
GET /api/sessions/:id
```

**Parameters:**
- `id` (path) - Session ID

### Create Session

```http
POST /api/sessions
Content-Type: application/json
```

**Request Body:**

```json
{
  "personaId": "persona_xyz",
  "objectiveId": "objective_123",
  "targetUrl": "https://example.com",
  "llmConfig": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.7
  },
  "visionConfig": {
    "includeScreenshots": true,
    "screenshotInterval": 10
  }
}
```

**Response:**

```json
{
  "id": "session_newid",
  "personaId": "persona_xyz",
  "objectiveId": "objective_123",
  "targetUrl": "https://example.com",
  "state": {
    "status": "pending",
    "actionCount": 0,
    "progress": 0
  },
  "createdAt": "2025-01-15T12:00:00Z"
}
```

### Start Session

```http
POST /api/sessions/:id/start
```

Starts agent execution for a pending session.

### Cancel Session

```http
POST /api/sessions/:id/cancel
```

Cancels a running session.

---

## Projects

### List Projects

```http
GET /api/projects
```

### Get Project

```http
GET /api/projects/:id
```

### Create Project

```http
POST /api/projects
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "My Project",
  "description": "Project description",
  "targetUrl": "https://example.com"
}
```

---

## Session Chains

### List Session Chains

```http
GET /api/session-chains
```

### Create Session Chain

```http
POST /api/session-chains
Content-Type: application/json
```

---

## Personas

### List Personas

```http
GET /api/personas
```

**Response:**

```json
[
  {
    "id": "maria-jardinera",
    "name": "Maria Garcia",
    "definition": {
      "identity": "Profesora de primaria de 45 anos...",
      "techProfile": "Escribes lento y con cuidado...",
      "personality": "Paciente leyendo, pero frustrada...",
      "tendencies": ["Leer descripciones a fondo", "Buscar opiniones"]
    },
    "metadata": {
      "archetype": "elderly-shopper",
      "tags": ["cautious", "low-tech"]
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Persona

```http
GET /api/personas/:id
```

---

## Objectives

### List Objectives

```http
GET /api/objectives
```

**Response:**

```json
[
  {
    "id": "add-to-cart",
    "name": "Add Product to Cart",
    "definition": {
      "goal": "Find and add a gardening product to shopping cart",
      "constraints": ["Budget max 50EUR", "No account creation"],
      "successCriteria": "Cart contains at least one item"
    },
    "config": {
      "autonomyLevel": "goal-directed",
      "maxActions": 50
    },
    "createdAt": "2025-01-01T00:00:00Z"
  }
]
```

### Get Objective

```http
GET /api/objectives/:id
```

---

## Events

### List Session Events

```http
GET /api/events/:sessionId
```

Returns all events for a session in chronological order.

**Response:**

```json
[
  {
    "id": "event_1",
    "sessionId": "session_abc123",
    "sequence": 1,
    "context": {
      "url": "https://example.com",
      "pageTitle": "Example Shop"
    },
    "decision": {
      "action": {
        "type": "click",
        "target": { "elementId": "e15", "description": "Search button" }
      },
      "reasoning": {
        "observation": "I see a search bar at the top",
        "thought": "Maria would search for gardening products",
        "confidence": 0.85
      }
    },
    "outcome": {
      "success": true,
      "duration": 1200
    },
    "createdAt": "2025-01-15T10:31:00Z"
  }
]
```

### Event Stream (SSE)

```http
GET /api/events/:sessionId/stream
Accept: text/event-stream
```

Server-Sent Events stream for real-time session updates.

**Events:**

```
event: connected
data: {"sessionId":"session_abc123","timestamp":1705315800000}

event: update
data: {"type":"action","data":{"decision":{...},"outcome":{...}}}

event: update
data: {"type":"finding","data":{"type":"ux-issue","severity":"medium",...}}

event: update
data: {"type":"progress","data":{"status":"running","progress":0.5}}

event: heartbeat
data: {"timestamp":1705315830000}

event: update
data: {"type":"complete","data":{"outcome":"completed","findings":3}}
```

**Event Types:**

| Type | Description |
|------|-------------|
| `connected` | Initial connection established |
| `action` | Agent performed an action |
| `finding` | Issue discovered |
| `progress` | Progress update |
| `complete` | Session completed |
| `error` | Error occurred |
| `heartbeat` | Keep-alive (every 30s) |

---

## Findings

### List Findings

```http
GET /api/findings
```

Returns findings, optionally filtered by session.

**Response:**

```json
[
  {
    "id": "finding_1",
    "sessionId": "session_abc123",
    "eventId": "event_5",
    "type": "ux-issue",
    "severity": "medium",
    "description": "Search results page loads slowly",
    "personaPerspective": "Maria got frustrated waiting for the page to load",
    "evidence": {
      "url": "https://example.com/search?q=garden",
      "loadTime": 4500
    },
    "createdAt": "2025-01-15T10:35:00Z"
  }
]
```

---

## Reports

### List Session Reports

```http
GET /api/reports
```

Returns generated session reports with summaries and analysis.

---

## Screenshots

### Get Screenshot

```http
GET /api/screenshots/:id
```

Returns a screenshot image captured during a session.

---

## Settings

### Get App Settings

```http
GET /api/settings
```

Returns application-wide settings (LLM provider, model, etc.).

### Update App Settings

```http
PUT /api/settings
Content-Type: application/json
```

**Request Body:**

```json
{
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-20250514",
  "llmApiKey": "sk-ant-..."
}
```

---

## Integrations

### Trello

```http
GET /api/integrations/trello
```

Trello integration endpoints for syncing findings to Trello boards.

---

## Health Check

### API Info

```http
GET /api/info
```

**Response:**

```json
{
  "name": "Mimic API",
  "version": "0.1.0",
  "status": "healthy"
}
```

### Simple Health

```http
GET /health
```

**Response:**

```json
{
  "status": "ok"
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Examples

### Create and Start Session (cURL)

```bash
# Create session
curl -X POST http://localhost:4001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "maria-jardinera",
    "objectiveId": "explore-site",
    "targetUrl": "https://example.com"
  }'

# Start session (use returned ID)
curl -X POST http://localhost:4001/api/sessions/session_abc123/start
```

### Subscribe to Events (JavaScript)

```javascript
const eventSource = new EventSource(
  'http://localhost:4001/api/events/session_abc123/stream'
);

eventSource.addEventListener('update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data.type, data.data);
});

eventSource.addEventListener('connected', () => {
  console.log('Connected to session stream');
});

eventSource.onerror = () => {
  console.log('Stream closed');
  eventSource.close();
};
```

### Fetch with TanStack Query (React)

```typescript
import { useQuery } from '@tanstack/react-query';

function SessionList() {
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions').then(r => r.json())
  });

  return (
    <ul>
      {sessions?.map(s => (
        <li key={s.id}>{s.targetUrl} - {s.state.status}</li>
      ))}
    </ul>
  );
}
```
