# TestFarm Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TESTFARM ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐  │
│  │   CONFIG    │────►│   ORCHESTRATOR   │◄────│    API / CLI        │  │
│  │   (YAML)    │     │                  │     │                     │  │
│  │ - Personas  │     │ - Session mgmt   │     │ - Start sessions    │  │
│  │ - Objectives│     │ - Lifecycle      │     │ - Monitor progress  │  │
│  │ - LLM config│     │ - Data collection│     │ - View reports      │  │
│  └─────────────┘     └────────┬─────────┘     └─────────────────────┘  │
│                               │                                         │
│                               ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        AI AGENT RUNTIME                          │  │
│  │                                                                  │  │
│  │  ┌────────────────┐    ┌────────────────┐    ┌────────────────┐ │  │
│  │  │Context Builder │───►│   LLM Client   │───►│Action Executor │ │  │
│  │  │                │    │                │    │                │ │  │
│  │  │ - Load persona │    │ - Multi-provider│   │ - Playwright   │ │  │
│  │  │ - Extract DOM  │    │ - Build prompt │    │ - Timing       │ │  │
│  │  │ - History mgmt │    │ - Parse response│   │ - Error handling│ │  │
│  │  │ - Memory       │    │ - Retry logic  │    │ - Capture      │ │  │
│  │  └────────────────┘    └────────────────┘    └────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        DATA LAYER                                 │  │
│  │  Sessions │ Events │ Findings │ Reports                          │  │
│  │  Storage: SQLite (dev) / PostgreSQL (prod)                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Package Architecture

### Dependency Graph

```
@testfarm/shared (Types & Interfaces)
       │
       ├──────────────────────────────────┐
       │                                  │
       ▼                                  ▼
@testfarm/db                      @testfarm/core
(Database Layer)                  (Agent Runtime)
       │                                  │
       └──────────────┬───────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   @testfarm/api  @testfarm/web  @testfarm/cli
   (REST Server)  (Dashboard)    (CLI)
```

### Package Responsibilities

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `@testfarm/shared` | TypeScript types shared across all packages | `types.ts` |
| `@testfarm/db` | Database schema, connection, queries | `schema.ts`, `client.ts` |
| `@testfarm/core` | AI agent runtime, LLM client, browser control | `agent.ts`, `llm/client.ts`, `browser/controller.ts` |
| `@testfarm/api` | REST API server with Hono | `index.ts`, `routes/*.ts` |
| `@testfarm/web` | React dashboard SPA | `App.tsx`, `pages/*.tsx` |
| `@testfarm/cli` | Command-line interface | `index.ts` |

---

## Component Details

### 1. AI Agent (`@testfarm/core/agent.ts`)

The agent implements the observe-decide-act loop:

```typescript
class Agent {
  // Core loop
  async run(): Promise<SessionResult>

  // Observe current page state
  private async observe(): Promise<AgentContext>

  // Ask LLM for decision
  private async decide(context: AgentContext): Promise<AgentDecision>

  // Execute action via browser
  private async act(decision: AgentDecision): Promise<ActionOutcome>

  // Event callbacks
  onAction?: (event: ActionEvent) => void
  onFinding?: (finding: Finding) => void
  onProgress?: (progress: Progress) => void
}
```

### 2. LLM Client (`@testfarm/core/llm/client.ts`)

Multi-provider LLM client using Vercel AI SDK:

```typescript
class LLMClient {
  // Get structured decision from LLM
  async decide(context: AgentContext): Promise<AgentDecision>

  // Simple text completion
  async complete(prompt: string, system?: string): Promise<string>
}

// Supported providers
type Provider = 'anthropic' | 'openai' | 'ollama' | 'custom' | 'claude-cli'
```

### 3. Browser Controller (`@testfarm/core/browser/controller.ts`)

Playwright wrapper for browser automation:

```typescript
class BrowserController {
  // Navigation
  async navigate(url: string): Promise<void>
  async goBack(): Promise<void>

  // Actions
  async click(selector: string): Promise<void>
  async type(selector: string, text: string): Promise<void>
  async scroll(direction: 'up' | 'down'): Promise<void>

  // State
  async getPageState(): Promise<PageState>
  async screenshot(): Promise<Buffer>
}
```

### 4. Vision Module (`@testfarm/core/vision/extractor.ts`)

Token-efficient DOM extraction:

```typescript
interface StructuredDOM {
  metadata: { title: string; url: string }
  elements: ActionableElement[]    // Clickable/editable elements
  textRegions: TextRegion[]        // Summarized text content
  navigation: NavigationElement[]  // Nav structure
}

interface ActionableElement {
  id: string           // "e15" - referenced by LLM
  type: ElementType    // 'button', 'link', 'input-text'
  text: string         // Visible text or aria-label
  location: { region: PageRegion }
  state: { visible: boolean; enabled: boolean }
  selector: string     // CSS selector for Playwright
}
```

---

## Data Flow

### Session Execution Flow

```
1. User creates session (API/CLI)
   └─► Session stored in DB (status: pending)

2. Session started
   └─► Agent initialized with persona + objective
       └─► Browser launched

3. Agent loop (repeat until done):
   ├─► OBSERVE: Extract DOM, optionally screenshot
   ├─► DECIDE: LLM analyzes and chooses action
   ├─► ACT: Playwright executes action
   ├─► RECORD: Event stored in DB
   └─► EMIT: SSE event sent to frontend

4. Session complete
   └─► Results stored, findings summarized
```

### Real-time Updates (SSE)

```
Frontend ──────────────────────────────► API
    │                                     │
    │  GET /api/events/:sessionId/stream  │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: connected              │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: action                 │
    │       data: { decision, outcome }   │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: finding                │
    │       data: { type, severity, ... } │
    │ ◄──────────────────────────────────│
    │                                     │
    │  SSE: event: heartbeat (30s)        │
    │ ◄──────────────────────────────────│
```

---

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│    personas     │     │   objectives    │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ name            │     │ name            │
│ definition (JSON)     │ definition (JSON)
│ metadata (JSON) │     │ config (JSON)   │
│ timestamps      │     │ timestamps      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┘
         │    │
         ▼    ▼
┌─────────────────┐
│    sessions     │
├─────────────────┤
│ id              │
│ personaId (FK)  │
│ objectiveId (FK)│
│ targetUrl       │
│ llmConfig (JSON)│
│ state (JSON)    │
│ results (JSON)  │
│ timestamps      │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐ ┌─────────────────┐
│     events      │ │    findings     │
├─────────────────┤ ├─────────────────┤
│ id              │ │ id              │
│ sessionId (FK)  │ │ sessionId (FK)  │
│ sequence        │ │ eventId (FK)    │
│ context (JSON)  │ │ type            │
│ decision (JSON) │ │ severity        │
│ outcome (JSON)  │ │ description     │
│ timestamp       │ │ evidence (JSON) │
└─────────────────┘ └─────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/:id` | Get session details |
| POST | `/api/sessions/:id/start` | Start session execution |
| POST | `/api/sessions/:id/cancel` | Cancel running session |
| GET | `/api/personas` | List personas |
| GET | `/api/objectives` | List objectives |
| GET | `/api/events/:sessionId` | Get session events |
| GET | `/api/events/:sessionId/stream` | SSE stream |
| GET | `/api/events/:sessionId/findings` | Get findings |

---

## Frontend Architecture

```
apps/web/src/
├── main.tsx              # Entry point, providers setup
├── App.tsx               # Router configuration
├── components/
│   ├── ui/               # shadcn/ui components (button, card, badge)
│   └── layout/           # Layout wrapper with navigation
├── pages/
│   ├── Dashboard.tsx     # Overview, stats, recent sessions
│   ├── Sessions.tsx      # Session list, create form
│   ├── SessionDetail.tsx # Timeline, findings, real-time updates
│   ├── Personas.tsx      # Persona cards
│   ├── Objectives.tsx    # Objective cards
│   └── Features.tsx      # Product features page
├── lib/
│   ├── api.ts            # API client functions
│   └── utils.ts          # Utility functions
└── styles/
    └── globals.css       # Tailwind + CSS variables
```

### State Management

- **Server State**: TanStack Query for API data
- **URL State**: React Router for navigation
- **Local State**: React useState for UI state
- **Real-time**: EventSource for SSE subscriptions

---

## Configuration

### LLM Configuration

```typescript
interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'ollama' | 'custom' | 'claude-cli'
  model: string           // e.g., 'claude-sonnet-4-20250514'
  apiKey?: string         // Falls back to env vars
  baseUrl?: string        // For custom/Ollama providers
  temperature?: number    // Default: 0.7
  maxTokens?: number      // Default: 2048
}
```

---

## LLM Providers

TestFarm supports multiple LLM providers. The default is `claude-cli` which uses the Claude Code CLI.

### Provider Comparison

| Provider | API Key Required | Best For |
|----------|-----------------|----------|
| `claude-cli` | No (uses CLI auth) | Claude Max subscribers, default choice |
| `anthropic` | Yes | Direct API access with full control |
| `openai` | Yes | GPT-4 and other OpenAI models |
| `ollama` | No | Local models, self-hosted |
| `custom` | Depends | OpenAI-compatible APIs |

### claude-cli (Default)

Uses the Claude Code CLI to execute LLM calls, leveraging your Claude Max subscription.

**Advantages**:
- No separate API key needed
- Real token usage and cost tracking (USD)
- Same capabilities as direct API

**Requirements**:
```bash
npm install -g @anthropic-ai/claude-code
claude auth login
```

**Metrics Available**:
- `promptTokens` - Input tokens
- `completionTokens` - Output tokens
- `cacheTokens` - Cache creation tokens
- `costUsd` - Total cost in USD

See [CLAUDE_CLI_PROVIDER.md](./CLAUDE_CLI_PROVIDER.md) for detailed documentation.

### anthropic

Direct Anthropic API access via Vercel AI SDK.

```typescript
{
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY
}
```

### openai

OpenAI API access.

```typescript
{
  provider: 'openai',
  model: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY
}
```

### ollama

Local Ollama models.

```typescript
{
  provider: 'ollama',
  model: 'llama2',
  baseUrl: 'http://localhost:11434/v1'
}
```

### custom

Any OpenAI-compatible API.

```typescript
{
  provider: 'custom',
  model: 'your-model',
  baseUrl: 'https://your-api.com/v1',
  apiKey: 'your-api-key'
}
```

### Vision Configuration

```typescript
interface VisionConfig {
  extractionDepth: 'minimal' | 'standard' | 'comprehensive'
  includeScreenshots: boolean
  screenshotInterval: number  // Actions between screenshots
  maxElements: number         // Max elements to extract
}
```

---

## Security Considerations

- API keys stored in environment variables, never committed
- CORS enabled for API (configurable origins)
- SQLite file in `data/` directory (gitignored)
- No authentication yet (planned for future)
