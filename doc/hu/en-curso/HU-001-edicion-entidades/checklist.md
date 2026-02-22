# HU-001: Checklist

**Estado general**: 🟢 Completado

## Backend

- [x] Añadir `targetUrl` al PATCH de Projects (`apps/api/src/routes/projects.ts`)
- [x] Añadir `targetUrl` al PATCH de Session Chains (`apps/api/src/routes/session-chains.ts`)
- [x] Crear endpoint PATCH para Sessions con validación pending (`apps/api/src/routes/sessions.ts`)

## Tests Backend (TDD)

- [x] `apps/api/src/__tests__/projects-update.test.ts` - 4 tests
- [x] `apps/api/src/__tests__/session-chains-update.test.ts` - 3 tests
- [x] `apps/api/src/__tests__/sessions-update.test.ts` - 5 tests

## Frontend - API Client

- [x] Añadir `targetUrl` a `projectsApi.update` (`apps/web/src/lib/api.ts`)
- [x] Añadir `targetUrl` a `UpdateSessionChainInput` (`apps/web/src/lib/api.ts`)
- [x] Crear `UpdateSessionInput` y `sessionsApi.update` (`apps/web/src/lib/api.ts`)

## Frontend - Páginas

- [x] Projects.tsx: Dialog reutilizable crear/editar + botón Pencil
- [x] SessionChains.tsx: Formulario reutilizable crear/editar + botón Pencil
- [x] Sessions.tsx: Dialog de edición para sesiones pending + botón Pencil

## i18n

- [x] Claves `editProject`, `editProjectDesc` en 5 idiomas
- [x] Claves `editChain`, `editChainDesc` en 5 idiomas
- [x] Claves `editSession`, `editSessionDesc`, `onlyPendingEditable` en 5 idiomas

## Verificación

- [x] 103 tests pasan (`npx vitest run`)
- [x] Typecheck pasa (`pnpm --filter @testfarm/web typecheck`)
- [x] Build exitoso (`pnpm --filter @testfarm/web build`)

## Notas de progreso

| Fecha | Avance |
|-------|--------|
| 2026-02-22 | Implementación completa de backend, frontend y tests |
