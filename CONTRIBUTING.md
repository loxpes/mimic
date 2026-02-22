# Contributing to Mimic

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

```bash
git clone https://github.com/your-org/mimic.git
cd mimic
pnpm install
pnpm build
```

## TDD Workflow

This project follows Test-Driven Development. For every change:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make the test pass
3. **REFACTOR** — Clean up while keeping tests green

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes following TDD
3. Ensure `pnpm build` and `pnpm typecheck` pass
4. Open a PR with a clear description of what and why

## Project Structure

- `packages/shared/` — TypeScript interfaces shared across packages
- `packages/db/` — Database schema and client (SQLite + Drizzle ORM)
- `packages/core/` — Agent logic (observe-decide-act loop)
- `apps/api/` — Hono REST API server
- `apps/web/` — React frontend (Vite + Tailwind)
- `apps/cli/` — CLI tool

## Code Style

- TypeScript strict mode
- No `any` types unless absolutely necessary
- Prefer functional patterns
- Keep functions small and focused

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
