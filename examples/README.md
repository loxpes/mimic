# Mimic Examples

This directory contains example personas and objectives that you can use as reference when setting up Mimic testing sessions.

## Concepts

- **Personas** define the simulated user's personality, tech level, and behavior patterns. The AI agent adopts this persona when interacting with your website, making decisions the way that type of user would.
- **Objectives** define what the agent should test: the goal, success criteria, maximum steps, and what issues to look for during the session.

## Usage

The **web dashboard** (`pnpm dev:web`) is the primary way to create and manage personas and objectives. The YAML files here are provided as reference examples to illustrate the structure and fields available.

## Directory Structure

```
examples/
├── personas/
│   ├── curious-user.yaml         # Tech-savvy explorer
│   └── confused-elderly.yaml     # Older user with low tech literacy
└── objectives/
    ├── checkout-flow.yaml        # E-commerce checkout test
    └── signup-flow.yaml          # User registration test
```

## Creating Your Own

Use these examples as templates. Combine any persona with any objective to simulate different user segments interacting with your application. For instance, pairing the "Confused Elderly User" persona with the "Checkout Flow" objective will surface usability issues that affect less technical users during purchase.
