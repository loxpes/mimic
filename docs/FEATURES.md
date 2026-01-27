# TestFarm Features

Complete feature list with implementation status and roadmap.

---

## Feature Status Legend

| Status | Meaning |
|--------|---------|
| ✅ | Implemented and working |
| 🔄 | In progress |
| 📋 | Planned |
| 💡 | Under consideration |

---

## Core Features

### AI Agent System ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Observe-Decide-Act Loop | ✅ | `@testfarm/core` | Core agent architecture that observes page, asks LLM for decision, and executes action |
| Agent Memory | ✅ | `@testfarm/core` | Persistent memory for discoveries, frustrations, and decisions |
| Action History | ✅ | `@testfarm/core` | Tracks all actions with outcomes and timestamps |
| Progress Tracking | ✅ | `@testfarm/core` | Real-time progress estimation toward objective |
| Finding Detection | ✅ | `@testfarm/core` | Automatically detects UX issues, bugs, accessibility problems |
| Session Metrics | ✅ | `@testfarm/core` | Token usage, duration, success rate tracking |

### LLM Integration ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Multi-Provider Support | ✅ | `@testfarm/core` | Anthropic, OpenAI, Ollama, Custom endpoints |
| Structured Output | ✅ | `@testfarm/core` | Zod schema validation for LLM responses |
| Dynamic Prompts | ✅ | `@testfarm/core` | Context-aware prompt building with persona + objective |
| Token Tracking | ✅ | `@testfarm/core` | Real-time token usage monitoring |
| Temperature Control | ✅ | `@testfarm/core` | Configurable creativity/consistency |

**Supported Providers:**

| Provider | Models | Cost |
|----------|--------|------|
| Anthropic | claude-3-5-sonnet, claude-3-opus | $$ |
| OpenAI | gpt-4o, gpt-4o-mini | $ |
| Ollama | llama3.1, mistral (local) | Free |
| Custom | Any OpenAI-compatible API | Varies |

### Browser Automation ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Multi-Browser | ✅ | `@testfarm/core` | Chromium, Firefox, WebKit support |
| Page Navigation | ✅ | `@testfarm/core` | URL navigation, back, forward |
| Click Actions | ✅ | `@testfarm/core` | Click on elements by selector |
| Text Input | ✅ | `@testfarm/core` | Type text into inputs |
| Scrolling | ✅ | `@testfarm/core` | Scroll up/down on page |
| Screenshots | ✅ | `@testfarm/core` | Capture page screenshots |
| Wait Actions | ✅ | `@testfarm/core` | Configurable wait/delay |
| Select/Dropdown | ✅ | `@testfarm/core` | Select options from dropdowns |

### Vision System ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| DOM Extraction | ✅ | `@testfarm/core` | Structured page element extraction |
| Actionable Elements | ✅ | `@testfarm/core` | Identifies clickable/editable elements |
| Region Detection | ✅ | `@testfarm/core` | Maps elements to page regions (header, nav, main, etc.) |
| Text Summarization | ✅ | `@testfarm/core` | Summarizes text content with word counts |
| Token Estimation | ✅ | `@testfarm/core` | Calculates tokens needed for context |
| Element State | ✅ | `@testfarm/core` | Tracks visibility, enabled state |

### Persona System ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| YAML Definitions | ✅ | `@testfarm/core` | Human-readable persona configurations |
| Identity Profiles | ✅ | `@testfarm/core` | Background, age, experience descriptions |
| Tech Profiles | ✅ | `@testfarm/core` | Technical skill levels and preferences |
| Personality Traits | ✅ | `@testfarm/core` | Behavioral characteristics |
| Tendencies | ✅ | `@testfarm/core` | Predictable behavior patterns |
| Archetypes | ✅ | `@testfarm/core` | Categorization for quick selection |

### Objective System ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Goal Definition | ✅ | `@testfarm/core` | Natural language goal descriptions |
| Constraints | ✅ | `@testfarm/core` | Boundaries and restrictions |
| Success Criteria | ✅ | `@testfarm/core` | Measurable completion conditions |
| Autonomy Levels | ✅ | `@testfarm/core` | exploration, goal-directed, restricted, semi-guided |
| Guided Steps | ✅ | `@testfarm/core` | Optional step-by-step guidance |

---

## Infrastructure Features

### Database ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| SQLite Storage | ✅ | `@testfarm/db` | Local file-based database |
| Drizzle ORM | ✅ | `@testfarm/db` | Type-safe database queries |
| Session Storage | ✅ | `@testfarm/db` | Store session configurations and results |
| Event Logging | ✅ | `@testfarm/db` | Record all agent actions |
| Finding Storage | ✅ | `@testfarm/db` | Persist discovered issues |

### REST API ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Hono Framework | ✅ | `@testfarm/api` | Lightweight REST server |
| Session CRUD | ✅ | `@testfarm/api` | Create, read, update sessions |
| Persona Endpoints | ✅ | `@testfarm/api` | List and get personas |
| Objective Endpoints | ✅ | `@testfarm/api` | List and get objectives |
| SSE Streaming | ✅ | `@testfarm/api` | Real-time session updates |
| CORS Support | ✅ | `@testfarm/api` | Cross-origin requests |

### Web Dashboard ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| React SPA | ✅ | `@testfarm/web` | Single-page application |
| Dashboard View | ✅ | `@testfarm/web` | Overview with stats and recent sessions |
| Session List | ✅ | `@testfarm/web` | Browse and filter sessions |
| Session Detail | ✅ | `@testfarm/web` | Timeline of actions and findings |
| Real-time Updates | ✅ | `@testfarm/web` | Live progress via SSE |
| Persona View | ✅ | `@testfarm/web` | Browse persona definitions |
| Objective View | ✅ | `@testfarm/web` | Browse objective definitions |
| Features Page | ✅ | `@testfarm/web` | Product features showcase |

### CLI ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| Run Command | ✅ | `@testfarm/cli` | Start agent sessions |
| List Commands | ✅ | `@testfarm/cli` | List personas and objectives |
| Init Command | ✅ | `@testfarm/cli` | Initialize configuration |
| Progress Display | ✅ | `@testfarm/cli` | Visual progress indicators |

---

## Planned Features

### High Priority 📋

| Feature | Target | Package | Description |
|---------|--------|---------|-------------|
| Persona CRUD UI | Next | `@testfarm/web` | Create/edit personas from dashboard |
| Objective CRUD UI | Next | `@testfarm/web` | Create/edit objectives from dashboard |
| Session Replay | Soon | `@testfarm/web` | Video-like playback of sessions |
| Export Reports | Soon | `@testfarm/api` | Export findings as PDF/JSON |

### Medium Priority 📋

| Feature | Target | Package | Description |
|---------|--------|---------|-------------|
| PostgreSQL Support | Future | `@testfarm/db` | Production database option |
| Docker Setup | Future | Root | Containerized deployment |
| Authentication | Future | `@testfarm/api` | User accounts and API keys |
| Team Workspaces | Future | All | Multi-user collaboration |

### Low Priority 💡

| Feature | Target | Package | Description |
|---------|--------|---------|-------------|
| Scheduled Sessions | Future | `@testfarm/api` | Cron-based session execution |
| Webhooks | Future | `@testfarm/api` | Notify external services |
| Custom Actions | Future | `@testfarm/core` | Plugin system for new actions |
| A/B Testing | Future | `@testfarm/core` | Compare different configurations |

---

## Feature Requests

To request a new feature:

1. Check if it's already planned in this document
2. Open an issue in the repository with:
   - Feature description
   - Use case / problem it solves
   - Suggested implementation approach
3. Features will be evaluated and added to the roadmap

---

## Changelog

### v0.1.0 (Current)

- Initial release with core features
- AI Agent with observe-decide-act loop
- Multi-provider LLM support
- Playwright browser automation
- REST API with SSE streaming
- React dashboard with real-time updates
- CLI for headless execution
