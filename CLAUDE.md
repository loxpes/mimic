# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TestFarm is an AI-powered browser testing agent farm. The LLM serves as the "brain" that decides how to interact with websites using an **Observe-Decide-Act** loop:
- **OBSERVE**: Extract structured DOM + optional screenshots
- **DECIDE**: LLM analyzes context (persona + objective + page state)
- **ACT**: Playwright executes the LLM's decision

## Build & Development Commands

```bash
pnpm install              # Install all dependencies
pnpm build                # Build all packages (tsc compilation)
pnpm typecheck            # Type check all packages (tsc --noEmit)

# Development servers
pnpm dev:api              # API server on localhost:3001 (hot reload)
pnpm dev:web              # Web dashboard on localhost:5173 (Vite)

# Database
pnpm db:generate          # Drizzle schema generation
pnpm db:migrate           # Run migrations
pnpm db:studio            # Drizzle Studio UI

# Package-specific builds
pnpm --filter @testfarm/core build
pnpm --filter @testfarm/api build
pnpm --filter @testfarm/web build
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
packages/
├── shared/     # @testfarm/shared - All TypeScript interfaces
├── db/         # @testfarm/db - Drizzle ORM schema + SQLite
└── core/       # @testfarm/core - Main agent logic
    ├── agent.ts           # Observe-decide-act loop
    ├── llm/               # Multi-provider LLM client (Vercel AI SDK)
    ├── browser/           # Playwright wrapper
    ├── vision/            # DOM extraction & token optimization
    └── findings/          # Issue detection & deduplication

apps/
├── api/        # @testfarm/api - Hono REST server
├── web/        # @testfarm/web - React SPA (Vite + TanStack Query + shadcn/ui)
└── cli/        # @testfarm/cli - Commander.js CLI
```

### Key Patterns

1. **Multi-Provider LLM Client**: Vercel AI SDK abstracts Anthropic, OpenAI, Ollama, and custom providers. Claude CLI provider uses subprocess for token counting.

2. **Token-Efficient DOM Extraction**: Vision system extracts actionable elements with IDs ("e15"), maps to page regions, and summarizes text to save tokens.

3. **Real-time SSE**: API streams session events (action, finding, heartbeat) to frontend with 30-second heartbeat.

4. **Configuration as Code**: Personas and objectives defined in YAML files under `config/personas/` and `config/objectives/`.

5. **Database Schema**: `personas → sessions ← objectives` with related `events` and `findings` tables.

### Technology Stack

- **Runtime**: Node.js 20+, TypeScript 5.7 (strict mode)
- **Backend**: Hono 4.6, SQLite + Drizzle ORM, Playwright 1.49
- **Frontend**: React 18.3, Vite 6.0, TanStack Query 5.60, Tailwind CSS 3.4
- **LLM**: Vercel AI SDK 4.0, Zod for output validation

## Development Workflow

### Adding Types
1. Define in `packages/shared/src/types.ts`
2. Export from `packages/shared/src/index.ts`
3. Rebuild: `pnpm --filter @testfarm/shared build`

### Adding API Endpoint
1. Create route in `apps/api/src/routes/feature.ts`
2. Register in `apps/api/src/index.ts`: `app.route('/api/feature', featureRoute)`

### Adding React Page
1. Create `apps/web/src/pages/Feature.tsx`
2. Add route in `apps/web/src/App.tsx`
3. Update navigation in `apps/web/src/components/layout/Layout.tsx`

### Adding Database Table
1. Update `packages/db/src/schema.ts`
2. Delete `data/testfarm.db` to reset (or run migrations)
3. Rebuild: `pnpm --filter @testfarm/db build`

### Adding Agent Action
1. Update `ActionType` in `@testfarm/shared`
2. Update Zod schema in `@testfarm/core/src/llm/schemas.ts`
3. Implement in `@testfarm/core/src/browser/controller.ts`

## Troubleshooting

**"Cannot find module '@testfarm/...'"**: Run `pnpm build` to rebuild all packages.

**"Playwright browser not found"**: Run `pnpm --filter @testfarm/core exec playwright install`

**Database issues**: Delete `data/testfarm.db` and restart to recreate.

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...   # For Anthropic provider
OPENAI_API_KEY=sk-...          # For OpenAI provider
OLLAMA_BASE_URL=http://localhost:11434/v1
PORT=3001                       # API server port
```

Default LLM provider is `claude-cli` (Claude Code CLI).
