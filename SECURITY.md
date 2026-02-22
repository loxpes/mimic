# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Mimic, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@mimic.dev**

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

| Action | Timeline |
|--------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix released | Within 30 days (for confirmed issues) |

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (current) | Yes |

## Scope

The following are in scope:

- API server (`apps/api`)
- Core agent logic (`packages/core`)
- Database layer (`packages/db`)
- Web dashboard (`apps/web`)
- Docker configuration

The following are out of scope:

- Third-party LLM provider APIs (Anthropic, OpenAI, Google)
- Websites being tested by Mimic agents

## Disclosure Policy

We follow responsible disclosure. Once a fix is released, we will:

1. Credit the reporter (unless anonymity is requested)
2. Publish a security advisory on GitHub
3. Release a patched version
