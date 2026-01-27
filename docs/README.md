# TestFarm Documentation

AI-powered browser testing agent farm where **the LLM is the brain**. The AI decides how to interact with websites based on persona personality and assigned objectives.

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./ARCHITECTURE.md) | System architecture and component overview |
| [Features](./FEATURES.md) | Complete feature list with status |
| [Development](./DEVELOPMENT.md) | Setup, commands, and contribution guide |
| [API Reference](./API.md) | REST API endpoint documentation |

## Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](./guides/getting-started.md) | Quick start tutorial |
| [Adding Features](./guides/adding-features.md) | How to add new features |
| [Creating Personas](./guides/creating-personas.md) | YAML persona definition guide |
| [Creating Objectives](./guides/creating-objectives.md) | YAML objective definition guide |

## Architecture Deep Dives

| Document | Description |
|----------|-------------|
| [Packages](./architecture/packages.md) | Detailed package breakdown |
| [Data Flow](./architecture/data-flow.md) | How data flows through the system |
| [LLM Integration](./architecture/llm-integration.md) | Multi-provider LLM setup |

---

## Project Overview

### What is TestFarm?

TestFarm is an AI-first browser testing platform where AI agents interact with websites as real users would. Unlike traditional testing frameworks with scripted interactions, TestFarm agents:

- **Think like users**: Each agent has a unique persona with personality traits
- **Make decisions**: The LLM observes the page and decides what to do next
- **Adapt naturally**: No hardcoded paths - agents explore and react
- **Find real issues**: Discover UX problems, bugs, and accessibility issues

### Core Concept: Observe-Decide-Act Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT CORE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐                │
│   │ OBSERVE │───►│ DECIDE  │───►│  ACT    │                │
│   └────▲────┘    └─────────┘    └────┬────┘                │
│        │         (LLM thinks)        │                      │
│        └─────────────────────────────┘                      │
│                  Continuous loop                            │
└─────────────────────────────────────────────────────────────┘

1. OBSERVE: Extract structured DOM + screenshot if needed
2. DECIDE: LLM receives context (persona + objective + state) and decides
3. ACT: Playwright executes the decided action
4. REPEAT until objective completed or limit reached
```

### Monorepo Structure

```
testfarm/
├── packages/
│   ├── shared/     # @testfarm/shared - Types & interfaces
│   ├── db/         # @testfarm/db - Database layer
│   └── core/       # @testfarm/core - Agent runtime
├── apps/
│   ├── api/        # @testfarm/api - REST API server
│   ├── web/        # @testfarm/web - React dashboard
│   └── cli/        # @testfarm/cli - Command-line interface
├── config/
│   ├── personas/   # YAML persona definitions
│   └── objectives/ # YAML objective definitions
└── docs/           # This documentation
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start API server (Terminal 1)
pnpm --filter @testfarm/api start

# Start Web dashboard (Terminal 2)
pnpm --filter @testfarm/web dev

# Or use CLI
pnpm --filter @testfarm/cli start run --persona maria --objective explore --url https://example.com
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + TypeScript |
| Browser | Playwright |
| LLM | Vercel AI SDK (Anthropic, OpenAI, Ollama) |
| Database | SQLite + Drizzle ORM |
| API | Hono |
| Frontend | React + Vite + Tailwind + shadcn/ui |
| Monorepo | pnpm workspaces |

---

## Contributing

See [Development Guide](./DEVELOPMENT.md) for setup instructions and [Adding Features](./guides/adding-features.md) for contribution workflow.
