# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-02-22

### Added
- Observe-Decide-Act agent loop with multi-provider LLM support (Anthropic, OpenAI, Google)
- Persona-driven testing with configurable profiles and objectives
- Hybrid vision system: DOM extraction with optional screenshot analysis
- Token-efficient DOM processing with element ID mapping and text summarization
- Web dashboard (React SPA) for managing sessions, personas, objectives, and findings
- Session chains for multi-step testing workflows with context continuation
- Continue session functionality to resume agent sessions from last action
- Findings system with issue detection, deduplication, and evidence capture
- Trello integration for exporting findings
- Projects management for organizing test sessions
- Local URL detection with tunnel instructions for remote testing
- Real-time SSE streaming of session events to frontend
- Reports generation from session findings
- Settings management per user with LLM provider configuration
- Claude CLI provider with structured output support and retry logic
- Loop detection and state change verification for agent resilience
- 2FA support in agent interactions
- Visual analysis script for interactive elements with Claude CLI
- YAML-based persona and objective presets

### Infrastructure
- Docker support with Dockerfile and non-root user execution
- GitHub Actions CI pipeline for deployment to Coolify
- SQLite database with Drizzle ORM (auto-initialization)
- pnpm workspace monorepo structure
- Playwright browser automation with system Chromium support
- Static frontend serving from API server (SPA mode)
