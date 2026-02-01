# HU-003: Límites por Tier

## Descripción
Como propietario de TestFarm, quiero que los usuarios tengan límites de uso según su plan de suscripción para asegurar la sostenibilidad del negocio.

## Objetivo
Implementar un sistema de límites que:
- Controle el número de sesiones por mes
- Controle el número de proyectos
- Controle el número de usuarios (para Team)
- Bloquee acciones cuando se alcance el límite
- Muestre advertencias al acercarse al límite

## Límites por Plan

| Feature | Free | Pro | Team | Enterprise |
|---------|------|-----|------|------------|
| Sesiones/mes | 10 | 100 | 500 | Ilimitado |
| Proyectos | 1 | Ilimitado | Ilimitado | Ilimitado |
| Usuarios | 1 | 1 | 5 | Ilimitado |
| Cadenas de sesión | No | Sí | Sí | Sí |
| Integraciones | No | Trello | Todas | Todas + Custom |
| Soporte | Community | Email | Prioritario | Dedicado |

## Criterios de Aceptación

### Middleware de Límites
- [ ] Verificar sesiones disponibles antes de crear
- [ ] Verificar proyectos disponibles antes de crear
- [ ] Devolver error 402/403 si límite alcanzado
- [ ] Incluir info de límite en respuesta de error

### Contadores de Uso
- [ ] Contador de sesiones por mes
- [ ] Reset automático el día 1 de cada mes
- [ ] Contador de proyectos activos
- [ ] Contador de usuarios en organización

### UI de Límites
- [ ] Badge de uso en dashboard (X/100 sesiones)
- [ ] Barra de progreso de uso
- [ ] Warning al 80% del límite
- [ ] Modal de upgrade al alcanzar límite
- [ ] Tooltip en botones deshabilitados

### Feature Flags
- [ ] Ocultar features no disponibles en el plan
- [ ] Mostrar badge "Pro" en features premium
- [ ] CTA de upgrade en features bloqueadas

## Implementación

### Middleware
```typescript
// middleware/checkLimits.ts
export async function checkSessionLimit(userId: string) {
  const subscription = await getSubscription(userId);
  const plan = await getPlan(subscription.planId);
  const usage = await getCurrentUsage(userId);

  if (usage.sessionsUsed >= plan.sessionLimit) {
    throw new LimitExceededError({
      type: 'sessions',
      limit: plan.sessionLimit,
      used: usage.sessionsUsed,
      upgradeUrl: '/pricing'
    });
  }
}
```

### Hooks Frontend
```typescript
// hooks/usePlanLimits.ts
export function usePlanLimits() {
  const { data: subscription } = useSubscription();
  const { data: usage } = useUsage();

  return {
    canCreateSession: usage.sessions < subscription.plan.sessionLimit,
    canCreateProject: usage.projects < subscription.plan.projectLimit,
    sessionsRemaining: subscription.plan.sessionLimit - usage.sessions,
    isNearLimit: usage.sessions / subscription.plan.sessionLimit > 0.8,
  };
}
```

## Endpoints a Modificar

| Endpoint | Cambio |
|----------|--------|
| POST /api/sessions | Añadir checkSessionLimit |
| POST /api/sessions/batch | Añadir checkSessionLimit (múltiples) |
| POST /api/projects | Añadir checkProjectLimit |
| POST /api/session-chains | Añadir checkFeatureAccess |

## Estimación
- Backend (middleware + contadores): 2-3 días
- Frontend (UI de límites): 2 días
- Testing: 1 día
- **Total: 5-6 días**

## Dependencias
- HU-001: Sistema de Autenticación
- HU-002: Sistema de Billing (para saber el plan)

## Notas
- Considerar grace period al final del mes
- Notificar por email al alcanzar 80% y 100%
- Logs de intentos de exceder límites (analytics)
