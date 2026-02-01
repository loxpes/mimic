# Mimic

**AI Agents That Think Like Your Users**

Stop writing test scripts. Let AI personas explore your app the way real humans would.

Mimic deploys intelligent browser agents with distinct personalities, technical skills, and behaviors. They navigate your web app autonomously, make decisions based on context, and surface UX issues, accessibility problems, and confusing flows before your users encounter them.

## Features

- **Persona-driven testing** - Create AI users with unique personalities, goals, and behaviors
- **LLM-powered decisions** - Agents powered by Claude, GPT, or Ollama
- **Automatic issue detection** - Finds UX problems, accessibility issues, and confusing flows
- **Evidence collection** - Screenshots and DOM snapshots for every finding
- **Session chains** - Multi-day persistent sessions with memory continuity
- **Integrations** - Trello, Jira (coming soon), and CI/CD pipelines

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Mimic                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│  │ Persona │ →  │   LLM   │ →  │ Browser │                 │
│  │ Config  │    │ (Brain) │    │ (Hands) │                 │
│  └─────────┘    └─────────┘    └─────────┘                 │
│       ↓              ↓              ↓                       │
│  "Who am I?"    "What should    "Execute                   │
│                  I do next?"     action"                    │
├─────────────────────────────────────────────────────────────┤
│                  Observe → Decide → Act                     │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start API server (localhost:3001)
pnpm dev:api

# Start web dashboard (localhost:5173)
pnpm dev:web
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.7
- **Backend**: Hono, SQLite + Drizzle ORM, Playwright
- **Frontend**: React 18, Vite, TanStack Query, Tailwind CSS
- **LLM**: Vercel AI SDK (Claude, GPT, Ollama)

## Project Structure

```
packages/
├── shared/     # TypeScript interfaces
├── db/         # Drizzle ORM schema + SQLite
└── core/       # Main agent logic (observe-decide-act)

apps/
├── api/        # Hono REST server
├── web/        # React SPA dashboard
└── cli/        # Command-line interface
```

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...   # For Claude
OPENAI_API_KEY=sk-...          # For GPT
PORT=3001                       # API server port
```

## Documentation

See `/doc` for user stories and technical documentation:

- `HU-000` - Infrastructure & Deployment
- `HU-001` - Authentication System
- `HU-002` - Billing System (Stripe)
- `HU-003` - Usage Limits by Tier
- `HU-004` - Landing Page & Pricing
- `HU-005` - Onboarding Flow
- `HU-006` - Jira Integration
- `HU-007` - Report Export
- `HU-008` - Custom Personas
- `HU-009` - Public API for CI/CD
- `HU-010` - Session Replay

## License

MIT
