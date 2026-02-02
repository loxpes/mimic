# HU-010: Mejora de Findings y Soporte para 2FA

## Descripcion

Mejoras al sistema de findings para evitar duplicados, incluir pasos para reproducir el problema, y soporte para verificacion de dos factores (2FA).

## Objetivo

1. Evitar que el agente reporte el mismo problema multiples veces con descripciones similares
2. Incluir informacion completa para reproducir cada finding
3. Permitir al agente pausarse cuando necesita input del usuario (codigos 2FA, CAPTCHA, etc.)

## Funcionalidades

### Parte 1: Evitar Duplicados

- Nueva seccion en el prompt del sistema que muestra las frustrations ya reportadas
- Instrucciones explicitas para que el LLM verifique antes de reportar algo similar
- Aplicable a frustrations de la sesion actual

### Parte 2: Campos Adicionales en Findings

- `stepsToReproduce`: Lista completa de pasos desde el inicio de la sesion hasta el problema
- `expectedBehavior`: Descripcion de lo que el usuario esperaba vs lo que ocurrio
- UI actualizada para mostrar estos campos en la seccion de evidencia expandible

### Parte 3: Soporte para 2FA

- Nuevo status `waiting-for-user` en ObjectiveStatus
- Interfaz `UserInputRequest` con tipo, prompt y fieldId opcional
- El agente se pausa y emite evento SSE `user-input-required`
- Endpoint `/sessions/:id/input` para enviar el codigo
- Modal en frontend para introducir codigo de verificacion

## Criterios de Aceptacion

- [x] El prompt incluye las frustrations ya reportadas de la sesion
- [x] Las instrucciones indican verificar duplicados antes de reportar
- [x] Los findings incluyen stepsToReproduce con pasos legibles
- [x] Los findings pueden incluir expectedBehavior del LLM
- [x] La UI muestra ambos nuevos campos en la seccion de evidencia
- [x] El agente puede usar status `waiting-for-user`
- [x] El frontend muestra modal cuando recibe evento de input requerido
- [x] El usuario puede enviar codigo y el agente continua
- [x] Cancelar el modal termina la sesion con estado abandoned
- [x] Tests unitarios para funciones de formateo de pasos
- [x] Tests unitarios para construccion de seccion de duplicados

## Modelo de Datos

### Cambios en types.ts

```typescript
// ObjectiveStatus ahora incluye 'waiting-for-user'
export type ObjectiveStatus = 'pursuing' | 'blocked' | 'completed' | 'abandoned' | 'waiting-for-user';

// Nuevo tipo para solicitar input del usuario
export interface UserInputRequest {
  type: UserInputType;  // 'verification-code' | 'captcha' | 'custom'
  prompt: string;
  fieldId?: string;
}

// MemoryUpdates ahora incluye expectedBehavior
export interface MemoryUpdates {
  addDiscovery?: string;
  addFrustration?: string;
  addDecision?: string;
  expectedBehavior?: string;
}

// FindingEvidence ahora incluye stepsToReproduce
export interface FindingEvidence {
  // ... campos existentes
  stepsToReproduce?: string[];
}

// Finding ahora incluye expectedBehavior
export interface Finding {
  // ... campos existentes
  expectedBehavior?: string;
}
```

## Dependencias

- @testfarm/shared: Definiciones de tipos
- @testfarm/core: Logica del agente y LLM
- @testfarm/api: Endpoints REST y SSE
- @testfarm/web: UI del modal de 2FA

## Notas Tecnicas

- La funcion `buildDuplicatePreventionSection` es exportada y testeada independientemente
- El formato de stepsToReproduce es humanamente legible (ej: "Click on Submit button")
- El agente usa una Promise para esperar el input del usuario de forma asincrona
- El cancel del modal envia string vacio al agente, que interpreta como cancelacion
