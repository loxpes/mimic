# Mimic

**AI Agents That Think Like Your Users**

Mimic deploys intelligent browser agents with distinct personalities, technical skills, and behaviors. They navigate your web app autonomously, make decisions based on context, and surface UX issues, accessibility problems, and confusing flows — before your users encounter them.

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
git clone https://github.com/your-org/mimic.git
cd mimic
pnpm install

# 2. Configure your LLM API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (or OPENAI_API_KEY)

# 3. Build and run
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
│                         Mimic                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                  │
│  │ Persona │ →  │   LLM   │ →  │ Browser │                  │
│  │ Config  │    │ (Brain) │    │ (Hands) │                  │
│  └─────────┘    └─────────┘    └─────────┘                  │
│       ↓              ↓              ↓                        │
│  "Who am I?"    "What should    "Execute                    │
│                  I do next?"     action"                     │
├─────────────────────────────────────────────────────────────┤
│                  Observe → Decide → Act                      │
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

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.7
- **Backend**: Hono, SQLite + Drizzle ORM, Playwright
- **Frontend**: React 18, Vite, TanStack Query, Tailwind CSS
- **LLM**: Vercel AI SDK (Claude, GPT, Gemini)

## Docker

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
```

### Adding a New Feature

This project follows **TDD** (Test-Driven Development):
1. Write a failing test
2. Write the minimum code to make it pass
3. Refactor while keeping tests green

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
