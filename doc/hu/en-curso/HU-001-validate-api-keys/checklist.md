# Checklist HU-001 — Validación de API Keys

## Estado general: 🟢 Completado

## Tareas técnicas

### Backend
- [x] Test: `POST /api/settings/validate-key` con key válida (Anthropic)
- [x] Test: `POST /api/settings/validate-key` con key inválida (Anthropic)
- [x] Test: `POST /api/settings/validate-key` con proveedor OpenAI
- [x] Test: `POST /api/settings/validate-key` con proveedor Google
- [x] Test: `POST /api/settings/validate-key` con proveedor `claude-cli`
- [x] Test: `POST /api/settings/validate-key` sin provider devuelve 400
- [x] Test: error inesperado del validador devuelve `valid: false`
- [x] Implementar `validateApiKey` en `packages/core/src/llm/validator.ts`
- [x] Implementar endpoint `POST /api/settings/validate-key` en `apps/api/src/routes/settings.ts`

### Frontend
- [x] Añadir botón/indicador de validación en pantalla Settings
- [x] Mostrar estado: sin comprobar / válida / inválida
- [x] Llamar al endpoint al pulsar el botón de validar

## Notas de progreso

| Fecha | Avance |
|-------|--------|
| 2026-03-16 | HU creada, rama `feature/validate-api-keys` creada |
| 2026-03-16 | Backend completo: 8 tests pasando, endpoint implementado |
| 2026-03-16 | Frontend completo: botón Validate con estados idle/loading/valid/invalid |
