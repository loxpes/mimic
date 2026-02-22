# Contributing to Mimic

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Git

### Getting started

```bash
# Clone the repo
git clone https://github.com/loxpes/mimic.git
cd mimic

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm --filter @testfarm/core exec playwright install chromium

# Build all packages
pnpm build

# Start development servers
pnpm dev:api    # API on localhost:4001
pnpm dev:web    # Frontend on localhost:5173
```

### Verify your setup

```bash
pnpm build        # Should compile without errors
pnpm typecheck    # Should pass with no type errors
pnpm test         # Should run all tests
```

## TDD Workflow

This project strictly follows Test-Driven Development. For **every** change:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up while keeping tests green

No code should be merged without corresponding tests.

## Commit Convention

We use conventional commits:

```
<type>(<scope>): <description>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no behavior change) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, CI, tooling changes |

### Examples

```
feat(core): add retry logic for failed browser actions
fix(api): handle missing persona in session creation
test(db): add CRUD tests for objectives table
docs: update Quick Start instructions
```

## Creating Issues

### Bug Reports

- Use the [Bug Report template](https://github.com/loxpes/mimic/issues/new?template=bug_report.md)
- Include steps to reproduce
- Include your environment (OS, Node version, LLM provider)
- Add screenshots if applicable

### Feature Requests

- Use the [Feature Request template](https://github.com/loxpes/mimic/issues/new?template=feature_request.md)
- Explain the problem before the solution
- Consider how it fits with existing architecture

## Pull Requests

### Process

1. Fork the repo and create a branch from `main`
2. Make your changes following TDD
3. Ensure all checks pass:
   ```bash
   pnpm build
   pnpm typecheck
   pnpm test
   ```
4. Open a PR with a clear description of **what** and **why**
5. Address review feedback

### Code Review

- All PRs require at least one review
- Reviewers check for: correctness, test coverage, TypeScript strictness, and consistency with existing patterns
- Keep PRs focused — one feature or fix per PR

## Project Structure

```
packages/
├── shared/     # TypeScript interfaces shared across packages
├── db/         # Database schema and client (SQLite + Drizzle ORM)
└── core/       # Agent logic (observe-decide-act loop)

apps/
├── api/        # Hono REST API server
├── web/        # React frontend (Vite + Tailwind)
└── cli/        # CLI tool
```

### Key conventions

- **Types**: Define in `packages/shared/src/types.ts`, export from index
- **API routes**: One file per resource in `apps/api/src/routes/`
- **React pages**: One file per page in `apps/web/src/pages/`
- **Tests**: Co-located with source files or in `__tests__/` directories

## Code Style

- TypeScript strict mode — no `any` unless absolutely necessary
- Prefer functional patterns
- Keep functions small and focused
- Use Zod for runtime validation at API boundaries

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
