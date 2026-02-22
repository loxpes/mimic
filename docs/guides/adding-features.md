# Guide: Adding New Features

Step-by-step guide for adding new features to TestFarm.

---

## Overview

TestFarm is a monorepo with clear separation of concerns:

```
Feature Type          → Package to Modify
─────────────────────────────────────────
Agent/LLM logic       → @testfarm/core
Database schema       → @testfarm/db
API endpoints         → @testfarm/api
Web UI                → @testfarm/web
CLI commands          → @testfarm/cli
Shared types          → @testfarm/shared
```

---

## Step 1: Identify the Package

### Core Features (`@testfarm/core`)

Use for:
- Agent behavior changes
- LLM prompt modifications
- Browser actions
- Vision/DOM extraction
- Config loading

Files:
- `packages/core/src/agent.ts` - Agent loop
- `packages/core/src/llm/client.ts` - LLM client
- `packages/core/src/browser/controller.ts` - Playwright
- `packages/core/src/vision/extractor.ts` - DOM extraction

### Database Features (`@testfarm/db`)

Use for:
- New tables
- Schema changes
- New queries

Files:
- `packages/db/src/schema.ts` - Drizzle schema
- `packages/db/src/client.ts` - DB connection

### API Features (`@testfarm/api`)

Use for:
- New endpoints
- Middleware changes
- SSE modifications

Files:
- `apps/api/src/routes/*.ts` - Route handlers
- `apps/api/src/index.ts` - Route registration

### Web Features (`@testfarm/web`)

Use for:
- New pages
- UI components
- Dashboard changes

Files:
- `apps/web/src/pages/*.tsx` - Page components
- `apps/web/src/components/*.tsx` - Shared components
- `apps/web/src/App.tsx` - Router

### Shared Types (`@testfarm/shared`)

Use for:
- TypeScript interfaces used by multiple packages
- Zod schemas for validation

Files:
- `packages/shared/src/types.ts` - All shared types

---

## Step 2: Implement the Feature

### Example: Add New Agent Action

**1. Add type in shared:**

```typescript
// packages/shared/src/types.ts

// Add to ActionType union
export type ActionType =
  | 'click'
  | 'type'
  | 'scroll'
  | 'wait'
  | 'navigate'
  | 'back'
  | 'hover'       // Existing
  | 'select'      // Existing
  | 'rightClick'  // NEW
  | 'abandon';
```

**2. Update LLM schema in core:**

```typescript
// packages/core/src/llm/schemas.ts

export const ActionSchema = z.object({
  type: z.enum([
    'click', 'type', 'scroll', 'wait',
    'navigate', 'back', 'hover', 'select',
    'rightClick',  // NEW
    'abandon'
  ]),
  // ... rest of schema
});
```

**3. Implement action in browser controller:**

```typescript
// packages/core/src/browser/controller.ts

async executeAction(action: AgentAction): Promise<ActionOutcome> {
  switch (action.type) {
    // ... existing cases

    case 'rightClick':
      await this.rightClick(action.target!.selector);
      break;
  }
}

private async rightClick(selector: string): Promise<void> {
  await this.page.click(selector, { button: 'right' });
}
```

**4. Update prompt builder:**

```typescript
// packages/core/src/llm/client.ts

// In buildSystemPrompt, add to action guidelines:
// - **rightClick**: Right-click on an element to open context menu
```

**5. Build and test:**

```bash
pnpm --filter @testfarm/shared build
pnpm --filter @testfarm/core build
pnpm build  # Full rebuild to verify
```

---

### Example: Add New API Endpoint

**1. Create route file:**

```typescript
// apps/api/src/routes/reports.ts

import { Hono } from 'hono';
import { getDb } from '@testfarm/db';
import { sessions, findings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

const app = new Hono();

// GET /api/reports/:sessionId - Generate session report
app.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const db = getDb();

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get();

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const sessionFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.sessionId, sessionId));

  const report = {
    session,
    findings: sessionFindings,
    summary: {
      totalActions: session.state.actionCount,
      findingsCount: sessionFindings.length,
      duration: session.results?.duration || 0,
    }
  };

  return c.json(report);
});

export default app;
```

**2. Register in main app:**

```typescript
// apps/api/src/index.ts

import reports from './routes/reports.js';

// Add with other routes
app.route('/api/reports', reports);
```

**3. Build and test:**

```bash
pnpm --filter @testfarm/api build

# Test endpoint
curl http://localhost:4001/api/reports/session_abc123
```

---

### Example: Add New Web Page

**1. Create page component:**

```typescript
// apps/web/src/pages/Reports.tsx

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Reports() {
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions').then(r => r.json())
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {sessions.filter(s => s.state.status === 'completed').map(session => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle>{session.targetUrl}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Actions: {session.state.actionCount}</p>
              <p>Findings: {session.results?.findings || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**2. Add route:**

```typescript
// apps/web/src/App.tsx

import { Reports } from './pages/Reports';

// Add in Routes
<Route path="/reports" element={<Reports />} />
```

**3. Update navigation:**

```typescript
// apps/web/src/components/layout/Layout.tsx

import { FileText } from 'lucide-react';

// Add to navigation array
{ name: 'Reports', href: '/reports', icon: FileText },
```

**4. Build and test:**

```bash
pnpm --filter @testfarm/web build

# Or dev mode
pnpm --filter @testfarm/web dev
# Navigate to http://localhost:5173/reports
```

---

### Example: Add Database Table

**1. Update schema:**

```typescript
// packages/db/src/schema.ts

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Add new table
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  format: text('format').notNull(), // 'pdf' | 'json' | 'html'
  content: text('content'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
```

**2. Export from index:**

```typescript
// packages/db/src/index.ts

export * from './schema.js';
```

**3. Reset database (dev only):**

```bash
# Delete existing database to apply schema
rm data/testfarm.db

# Rebuild
pnpm --filter @testfarm/db build
```

---

## Step 3: Update Documentation

### Update FEATURES.md

Add your feature to the appropriate section:

```markdown
### New Feature Category ✅

| Feature | Status | Package | Description |
|---------|--------|---------|-------------|
| My New Feature | ✅ | `@testfarm/core` | Description of what it does |
```

### Update API.md (if adding endpoints)

Document the new endpoint with request/response examples.

### Update ARCHITECTURE.md (if architectural changes)

Update diagrams and component descriptions.

---

## Step 4: Verify

### Run Full Build

```bash
pnpm build
```

All packages should compile without errors.

### Type Check

```bash
pnpm typecheck
```

No TypeScript errors.

### Manual Testing

1. Start API: `pnpm --filter @testfarm/api start`
2. Start Web: `pnpm --filter @testfarm/web dev`
3. Test the feature manually

---

## Checklist

Before submitting your feature:

- [ ] Types defined in `@testfarm/shared` (if needed)
- [ ] Implementation complete and working
- [ ] `pnpm build` passes
- [ ] `pnpm typecheck` passes
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] Code follows project style

---

## Common Patterns

### Adding API Types

```typescript
// packages/shared/src/types.ts

export interface NewFeatureInput {
  field1: string;
  field2: number;
}

export interface NewFeatureOutput {
  id: string;
  result: string;
}
```

### Adding React Query Hooks

```typescript
// apps/web/src/lib/api.ts

export const newFeatureApi = {
  list: () => request<NewFeature[]>('/new-feature'),
  get: (id: string) => request<NewFeature>(`/new-feature/${id}`),
  create: (data: NewFeatureInput) =>
    request<NewFeature>('/new-feature', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
```

### Adding shadcn/ui Components

If you need new UI components, follow shadcn/ui patterns:

```typescript
// apps/web/src/components/ui/new-component.tsx

import * as React from 'react';
import { cn } from '@/lib/utils';

interface NewComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary';
}

const NewComponent = React.forwardRef<HTMLDivElement, NewComponentProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'base-styles',
        variant === 'secondary' && 'secondary-styles',
        className
      )}
      {...props}
    />
  )
);
NewComponent.displayName = 'NewComponent';

export { NewComponent };
```

---

## Need Help?

- Check existing code for patterns
- Read [Architecture](../ARCHITECTURE.md) for system overview
- Look at [API Reference](../API.md) for endpoint patterns
- Review [Development Guide](../DEVELOPMENT.md) for setup
