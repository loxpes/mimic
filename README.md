# Mimic

[![CI](https://github.com/loxpes/mimic/actions/workflows/ci.yml/badge.svg)](https://github.com/loxpes/mimic/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

**AI Agents That Think Like Your Users**

Mimic deploys intelligent browser agents with distinct personalities, technical skills, and behaviors. They navigate your web app autonomously, make decisions based on context, and surface UX issues, accessibility problems, and confusing flows — before your users encounter them.

<!-- TODO: Add GIF/screenshot of the dashboard here -->
<!-- ![Mimic Dashboard](docs/assets/dashboard-screenshot.png) -->

## Why Mimic?

| | Manual QA | Traditional E2E | Mimic |
|---|---|---|---|
| **Setup time** | None | Hours writing scripts | Minutes configuring personas |
| **Finds unexpected issues** | Sometimes | Never (only tests what you write) | Yes (AI explores freely) |
| **Adapts to UI changes** | Yes | Breaks constantly | Yes (AI understands context) |
| **Tests like real users** | Depends on tester | No (rigid scripts) | Yes (persona-driven behavior) |
| **Scales** | Expensive | Yes | Yes |

Mimic doesn't replace your test suite — it complements it by finding the issues that scripted tests can't.

## Features

- **Persona-driven testing** — Create AI users with unique personalities, goals, and behaviors
- **LLM-powered decisions** — Agents powered by Claude, GPT, or Gemini
- **Automatic issue detection** — Finds UX problems, accessibility issues, and confusing flows
- **Evidence collection** — Screenshots and DOM snapshots for every finding
- **Session chains** — Multi-day persistent sessions with memory continuity
- **Web dashboard** — Monitor sessions, review findings, and manage personas in real-time
- **Integrations** — Export findings to Trello (more coming soon)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/loxpes/mimic.git
cd mimic
pnpm install

# 2. Install Playwright browsers
pnpm --filter @testfarm/core exec playwright install chromium

# 3. Configure your LLM API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (or OPENAI_API_KEY, or GOOGLE_API_KEY)

# 4. Build and run
pnpm build
pnpm dev:api    # API + dashboard on http://localhost:4001
```

That's it. The SQLite database is created automatically on first run.

For development with hot reload on both API and frontend:

```bash
pnpm dev:api    # API server on localhost:4001
pnpm dev:web    # Frontend dev server on localhost:5173 (in another terminal)
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Mimic                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│  │ Persona │ →  │   LLM   │ →  │ Browser │                 │
│  │ Config  │    │ (Brain) │    │ (Hands) │                 │
│  └─────────┘    └─────────┘    └─────────┘                 │
│       ↓              ↓              ↓                       │
│  "Who am I?"    "What should    "Execute                    │
│                  I do next?"     action"                    │
├─────────────────────────────────────────────────────────────┤
│                  Observe → Decide → Act                     │
└─────────────────────────────────────────────────────────────┘
```

The agent loop:
1. **Observe** — Extract actionable elements from the DOM + optional screenshots
2. **Decide** — LLM analyzes context (persona + objective + page state)
3. **Act** — Playwright executes the chosen action

## Project Structure

```
packages/
├── shared/     # TypeScript interfaces
├── db/         # Drizzle ORM schema + SQLite
└── core/       # Agent logic (observe-decide-act loop)

apps/
├── api/        # Hono REST server + serves frontend
├── web/        # React SPA dashboard (Vite + TanStack Query + Tailwind)
└── cli/        # Command-line interface
```

## Configuration

### Environment Variables

```bash
# LLM Provider (at least one required)
ANTHROPIC_API_KEY=sk-ant-...     # For Claude
OPENAI_API_KEY=sk-...            # For GPT
GOOGLE_API_KEY=AIza...           # For Gemini

# Optional
LLM_PROVIDER=anthropic           # Default provider (anthropic|openai|google)
LLM_MODEL=claude-sonnet-4-20250514  # Default model
PORT=4001                        # API server port
```

You can also change the LLM provider and model from the **Settings** page in the web dashboard.

## Docker

### Using Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your API keys
docker compose up -d
```

### Using Docker directly

```bash
docker build -t mimic .
docker run -p 4001:4001 \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -v mimic-data:/app/data \
  mimic
```

Open `http://localhost:4001` to access the dashboard.

## Development

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev:api          # API server with hot reload
pnpm dev:web          # Frontend dev server
pnpm typecheck        # Type check all packages
pnpm test             # Run tests
```

### Adding a New Feature

This project follows **TDD** (Test-Driven Development):
1. Write a failing test
2. Write the minimum code to make it pass
3. Refactor while keeping tests green

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Before contributing, please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
