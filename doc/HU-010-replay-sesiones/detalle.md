# HU-010: Replay de Sesiones

## Descripción
Como usuario de TestFarm, quiero poder ver una reproducción visual de una sesión completada para entender mejor el comportamiento del agente y el contexto de los hallazgos.

## Objetivo
Implementar un reproductor de sesiones que muestre:
- Timeline visual de acciones
- Screenshots en cada paso
- Estado del DOM en cada momento
- Razonamiento del agente
- Hallazgos en su contexto

## Funcionalidades

### Reproductor
- Controles: play, pause, velocidad
- Barra de progreso con eventos marcados
- Vista de screenshot actual
- Panel de razonamiento del agente
- Panel de acción ejecutada
- Indicadores de hallazgos

### Navegación
- Click en evento para saltar
- Filtrar por tipo de evento
- Buscar por texto
- Zoom en screenshot

### Exportación
- Exportar como video (futuro)
- Exportar como GIF (futuro)
- Compartir link de momento específico

## Criterios de Aceptación
- [ ] Ver replay de sesión completada
- [ ] Controles de reproducción funcionan
- [ ] Screenshots se cargan correctamente
- [ ] Se muestra razonamiento por paso
- [ ] Se marcan los hallazgos en timeline
- [ ] Navegación fluida entre eventos
- [ ] Funciona en móvil (responsive)

## Componentes UI

```
+------------------------------------------+
|  [<<] [<] [Play/Pause] [>] [>>] [1x ▼]  |
+------------------------------------------+
|  [====●============]  3/15 acciones      |
+------------------------------------------+
|                    |                     |
|    Screenshot      |   Razonamiento      |
|    del momento     |   del agente        |
|                    |                     |
|                    |   Acción: click     |
|                    |   Target: #submit   |
|                    |                     |
+------------------------------------------+
|  Timeline de eventos                      |
|  [●][●][!][●][●][!][●][●][●][●]          |
+------------------------------------------+
```

## Almacenamiento
- Screenshots ya se guardan en eventos
- DOM snapshots se guardan en eventos
- No requiere cambios en backend significativos

## Estimación
- Diseño del reproductor: 1 día
- Componente reproductor: 3-4 días
- Controles y navegación: 2 días
- Optimización de carga: 1 día
- Testing: 1 día
- **Total: 1-2 semanas**

## Dependencias
- Screenshots deben estar disponibles
- Eventos deben tener contexto completo

## Notas
- Lazy loading de screenshots
- Preload de siguiente screenshot
- Considerar compresión de screenshots
- Cache en cliente para navegación rápida
