# Checklist HU-010: Mejora de Findings y Soporte para 2FA

## Estado General: 🟢 Completado

---

## Parte 1: Evitar Duplicados

- [x] Crear funcion `buildDuplicatePreventionSection` en client.ts
- [x] Integrar seccion en el prompt del sistema
- [x] Listar frustrations existentes de la sesion
- [x] Incluir instrucciones para verificar antes de reportar
- [x] Test unitario para la funcion

## Parte 2: Campos Adicionales en Findings

### Backend
- [x] Añadir `expectedBehavior` a MemoryUpdates en types.ts
- [x] Añadir `expectedBehavior` a Finding en types.ts
- [x] Añadir `stepsToReproduce` a FindingEvidence en types.ts
- [x] Actualizar schema Zod en schemas.ts
- [x] Implementar `buildStepsToReproduce` en agent.ts
- [x] Implementar `formatActionAsStep` en agent.ts
- [x] Pasar `expectedBehavior` del decision a createFinding
- [x] Test unitario para formateo de pasos

### Frontend
- [x] Actualizar tipo evidence en SessionDetail.tsx
- [x] Mostrar stepsToReproduce como lista ordenada
- [x] Mostrar expectedBehavior si existe
- [x] Añadir iconos apropiados

## Parte 3: Soporte para 2FA

### Types
- [x] Añadir 'waiting-for-user' a ObjectiveStatus
- [x] Crear tipo UserInputType
- [x] Crear interfaz UserInputRequest
- [x] Añadir userInputRequest a AgentDecision

### Agent
- [x] Añadir onWaitingForUser a AgentEvents
- [x] Añadir pendingUserInput al estado del agente
- [x] Implementar metodo provideUserInput
- [x] Implementar metodo isWaitingForUserInput
- [x] Implementar metodo getPendingUserInputRequest
- [x] Manejar waiting-for-user en el main loop
- [x] Resolver Promise al recibir input del usuario
- [x] Cancelar input pendiente en stop()

### Prompt y Schema
- [x] Añadir 'waiting-for-user' al schema ObjectiveStatus
- [x] Crear schema UserInputRequest
- [x] Añadir userInputRequest al schema AgentDecision
- [x] Actualizar instrucciones de autenticacion en prompt
- [x] Añadir seccion de 2FA con ejemplo JSON

### API
- [x] Añadir handler onWaitingForUser en sessions.ts
- [x] Añadir 'user-input-required' al tipo de evento SSE
- [x] Crear endpoint POST /sessions/:id/input
- [x] Crear endpoint GET /sessions/:id/input-status

### Frontend
- [x] Añadir provideInput a sessionsApi
- [x] Añadir getInputStatus a sessionsApi
- [x] Añadir estado userInputRequest
- [x] Manejar evento SSE user-input-required
- [x] Implementar handleSubmitUserInput
- [x] Crear modal de verificacion 2FA
- [x] Manejar cancelacion del modal

---

## Notas de Progreso

| Fecha | Avance |
|-------|--------|
| 2026-02-02 | Implementacion completa de las 3 partes |
| 2026-02-02 | Tests pasando, build exitoso |
