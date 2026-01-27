# Claude CLI Provider

This document describes the Claude CLI provider implementation for TestFarm, which allows using Claude Max subscription instead of paying for Anthropic API separately.

## Overview

The `claude-cli` provider executes Claude through the Claude Code CLI (`claude`) instead of making direct API calls. This is useful for users who have a Claude Max subscription and want to use it for TestFarm operations.

## Why Use Claude CLI?

- **Cost Efficiency**: Uses your existing Claude Max subscription
- **No API Key Required**: No need to set up ANTHROPIC_API_KEY
- **Real Metrics**: Provides actual token usage and cost in USD
- **Same Capabilities**: Supports structured output via JSON Schema

## Requirements

1. **Claude Code CLI installed**:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Authenticated**:
   ```bash
   claude auth login
   ```

3. **Active Claude Max subscription** (or equivalent)

## Configuration

Set `claude-cli` as the LLM provider in your session configuration:

```typescript
const llmConfig = {
  provider: 'claude-cli',
  model: 'claude-sonnet-4-20250514', // Model handled by CLI
  temperature: 0.7,
  maxTokens: 2048,
};
```

Or when creating a session via API:

```json
{
  "personaId": "...",
  "objectiveId": "...",
  "targetUrl": "https://example.com",
  "llmConfig": {
    "provider": "claude-cli"
  }
}
```

**Note**: When `llmConfig` is omitted, `claude-cli` is used as the default provider.

## Available Metrics

The Claude CLI provider returns real metrics from the CLI:

| Metric | Description |
|--------|-------------|
| `promptTokens` | Input tokens (`usage.input_tokens`) |
| `completionTokens` | Output tokens (`usage.output_tokens`) |
| `cacheTokens` | Cache creation tokens (`usage.cache_creation_input_tokens`) |
| `costUsd` | Total cost in USD (`total_cost_usd`) |

### Example Usage Metrics

```typescript
const result = await executeClaudeCliStructured({
  systemPrompt: '...',
  userPrompt: '...',
  schema: MySchema,
});

console.log(result.usage);
// {
//   promptTokens: 1234,
//   completionTokens: 567,
//   cacheTokens: 89,
//   costUsd: 0.0123
// }
```

## How It Works

1. **Stream JSON Mode**: Uses `--output-format stream-json --verbose` for rich metrics
2. **NDJSON Parsing**: Parses newline-delimited JSON to find the result line
3. **Structured Output**: Uses `--json-schema` flag for Zod schema validation
4. **Real Token Counting**: Reports actual tokens from CLI, not estimates

### CLI Flags Used

```bash
claude --print \
  --output-format stream-json \
  --verbose \
  --json-schema '{"type":"object",...}' \
  "Your prompt here"
```

## Limitations

| Limitation | Description |
|------------|-------------|
| **Max Tokens** | CLI doesn't support `--max-tokens` directly |
| **Temperature** | Cannot be passed to CLI, uses default |
| **Model Selection** | Uses the model configured in Claude CLI settings |
| **Execution Time** | Slightly slower than direct API due to CLI overhead |
| **Concurrency** | Limited by CLI process spawning |

## Switching Providers

To switch from `claude-cli` to Anthropic API:

```typescript
const llmConfig = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  apiKey: process.env.ANTHROPIC_API_KEY, // Or set ANTHROPIC_API_KEY env var
  temperature: 0.7,
  maxTokens: 2048,
};
```

## Troubleshooting

### Claude CLI not found

```
Error: Claude CLI not found. Please install it:
  npm install -g @anthropic-ai/claude-code

Then authenticate:
  claude auth login
```

**Solution**: Install and authenticate the Claude CLI.

### No result found in CLI output

**Possible causes**:
- CLI authentication expired
- Network issues
- CLI version incompatibility

**Solution**: Run `claude --version` and `claude auth status` to verify CLI is working.

### Permission denied

**Solution**: Ensure the CLI is executable and in your PATH:
```bash
which claude
claude --version
```

## API Reference

### `executeClaudeCliStructured<T>(options)`

Execute Claude CLI with structured JSON output.

**Parameters**:
- `systemPrompt: string` - System prompt
- `userPrompt: string` - User prompt
- `schema: ZodSchema` - Zod schema for output validation
- `maxTokens?: number` - (Currently unused)

**Returns**: `Promise<ClaudeCliResult<T>>`

### `executeClaudeCliText(prompt, systemPrompt?, maxTokens?)`

Execute Claude CLI for simple text completion.

**Parameters**:
- `prompt: string` - User prompt
- `systemPrompt?: string` - Optional system prompt
- `maxTokens?: number` - (Currently unused)

**Returns**: `Promise<ClaudeCliResult<string>>`

### `isClaudeCliAvailable()`

Check if Claude CLI is installed and accessible.

**Returns**: `Promise<boolean>`

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [API.md](./API.md) - API endpoints reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup guide
