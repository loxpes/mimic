# Development Guide

Complete guide for setting up, developing, and contributing to TestFarm.

---

## Prerequisites

- **Node.js** 18+
- **pnpm** 8+ (recommended package manager)
- **Git**

Optional:
- **Ollama** (for local LLM testing)
- **VS Code** (recommended IDE)

---

## Quick Setup

```bash
# Clone repository
git clone https://github.com/your-org/testfarm.git
cd testfarm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

---

## Project Structure

```
testfarm/
├── packages/                    # Shared libraries
│   ├── shared/                  # @testfarm/shared
│   │   └── src/
│   │       └── types.ts         # TypeScript interfaces
│   │
│   ├── db/                      # @testfarm/db
│   │   └── src/
│   │       ├── schema.ts        # Drizzle schema
│   │       ├── client.ts        # DB connection
│   │       └── index.ts         # Exports
│   │
│   └── core/                    # @testfarm/core
│       └── src/
│           ├── agent.ts         # Main agent class
│           ├── llm/
│           │   ├── client.ts    # LLM client
│           │   └── schemas.ts   # Zod schemas
│           ├── browser/
│           │   └── controller.ts # Playwright wrapper
│           ├── vision/
│           │   └── extractor.ts # DOM extraction
│           └── config/
│               └── loader.ts    # YAML config loader
│
├── apps/                        # Applications
│   ├── api/                     # @testfarm/api
│   │   └── src/
│   │       ├── index.ts         # Hono server entry
│   │       └── routes/
│   │           ├── sessions.ts
│   │           ├── personas.ts
│   │           ├── objectives.ts
│   │           └── events.ts
│   │
│   ├── web/                     # @testfarm/web
│   │   └── src/
│   │       ├── main.tsx         # React entry
│   │       ├── App.tsx          # Router
│   │       ├── pages/           # Page components
│   │       ├── components/      # Shared components
│   │       └── lib/             # Utilities
│   │
│   └── cli/                     # @testfarm/cli
│       └── src/
│           └── index.ts         # CLI entry
│
├── config/                      # Runtime configuration
│   ├── personas/                # YAML persona files
│   ├── objectives/              # YAML objective files
│   └── tsconfig.base.json       # Shared TS config
│
├── data/                        # Runtime data (gitignored)
│   ├── testfarm.db              # SQLite database
│   └── screenshots/             # Captured screenshots
│
├── docs/                        # Documentation
│
├── pnpm-workspace.yaml          # Workspace config
└── package.json                 # Root package
```

---

## Available Commands

### Root Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Package-Specific Commands

```bash
# Build specific package
pnpm --filter @testfarm/core build
pnpm --filter @testfarm/db build
pnpm --filter @testfarm/api build
pnpm --filter @testfarm/web build

# Run in development mode
pnpm --filter @testfarm/api dev       # API with hot reload
pnpm --filter @testfarm/web dev       # Vite dev server

# Start production build
pnpm --filter @testfarm/api start
pnpm --filter @testfarm/web preview
```

### CLI Commands

```bash
# Run agent session
pnpm --filter @testfarm/cli start run \
  --persona maria \
  --objective explore \
  --url https://example.com

# List available personas
pnpm --filter @testfarm/cli start list-personas

# List available objectives
pnpm --filter @testfarm/cli start list-objectives

# Initialize config directory
pnpm --filter @testfarm/cli start init
```

---

## Development Workflow

### 1. Start Development Environment

```bash
# Terminal 1: Start API server
pnpm --filter @testfarm/api dev

# Terminal 2: Start web dashboard
pnpm --filter @testfarm/web dev
```

- API runs on `http://localhost:3001`
- Web runs on `http://localhost:5173` (proxies to API)

### 2. Make Changes

- Modify code in `packages/` or `apps/`
- TypeScript compilation is automatic
- Web dashboard has hot reload
- API restarts on file changes (tsx watch)

### 3. Test Your Changes

```bash
# Type check
pnpm typecheck

# Build to verify
pnpm build
```

### 4. Create Pull Request

1. Create feature branch
2. Make commits with descriptive messages
3. Ensure `pnpm build` passes
4. Open PR with description

---

## Environment Variables

Create `.env` file in root or export variables:

```bash
# LLM API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Ollama (optional, for local LLMs)
OLLAMA_BASE_URL=http://localhost:11434/v1

# API Configuration
PORT=3001
```

---

## Adding New Code

### Adding Types

1. Edit `packages/shared/src/types.ts`
2. Export from `packages/shared/src/index.ts`
3. Rebuild: `pnpm --filter @testfarm/shared build`

### Adding Database Schema

1. Edit `packages/db/src/schema.ts`
2. Rebuild: `pnpm --filter @testfarm/db build`
3. Delete `data/testfarm.db` to reset

### Adding API Endpoints

1. Create route file in `apps/api/src/routes/`
2. Register in `apps/api/src/index.ts`
3. Add types to `packages/shared`

### Adding Web Pages

1. Create page in `apps/web/src/pages/`
2. Add route in `apps/web/src/App.tsx`
3. Update navigation in `apps/web/src/components/layout/Layout.tsx`

See [Adding Features Guide](./guides/adding-features.md) for detailed instructions.

---

## Code Style

### TypeScript

- Use strict TypeScript (`strict: true`)
- Prefer interfaces over types
- Export types from `@testfarm/shared`
- Use absolute imports with `@/` alias

### React

- Functional components with hooks
- TanStack Query for server state
- React Router for navigation
- Tailwind CSS for styling

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `types.ts` or inline
- Routes: `lowercase.ts`

---

## Debugging

### API Debugging

```bash
# Enable verbose logging
DEBUG=* pnpm --filter @testfarm/api dev

# Test endpoints
curl http://localhost:3001/api/sessions
curl http://localhost:3001/api/personas
```

### LLM Debugging

```typescript
// Add token usage callback
const client = new LLMClient({
  config: llmConfig,
  onTokenUsage: (tokens) => {
    console.log(`Tokens: ${tokens.prompt} + ${tokens.completion}`)
  }
})
```

### Browser Debugging

```typescript
// Run with visible browser
const agent = createAgent({
  // ...
  browserOptions: {
    headless: false  // Show browser window
  }
})
```

---

## Common Issues

### "Cannot find module '@testfarm/...'"

```bash
# Rebuild all packages
pnpm build
```

### "Database not found"

```bash
# Database is created on first run
# Make sure data/ directory exists
mkdir -p data
```

### "LLM API error"

- Check API key is set in environment
- Verify provider is available
- Check model name is correct

### "Playwright browser not found"

```bash
# Install browsers
pnpm --filter @testfarm/core exec playwright install
```

---

## Testing

Currently no automated tests. Planned for future:

- Unit tests for core logic
- Integration tests for API
- E2E tests with Playwright

Manual testing workflow:

1. Start API and web servers
2. Create session via dashboard
3. Start session and observe behavior
4. Check findings and events

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Ensure build passes (`pnpm build`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

### Commit Message Format

```
type(scope): description

- type: feat, fix, docs, style, refactor, test, chore
- scope: core, db, api, web, cli, docs
- description: imperative mood, lowercase

Example:
feat(core): add screenshot capture on low confidence
fix(api): handle missing session gracefully
docs(readme): update installation instructions
```
