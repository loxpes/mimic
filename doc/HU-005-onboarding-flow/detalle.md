# HU-005: Onboarding Flow

## Descripción
Como nuevo usuario de TestFarm, quiero un proceso de onboarding guiado que me ayude a entender el producto y crear mi primera sesión de pruebas exitosamente.

## Objetivo
Crear un flujo de onboarding que:
- Guíe al usuario paso a paso
- Muestre el valor del producto rápidamente
- Reduzca el tiempo hasta el primer "aha moment"
- Mejore la retención de usuarios nuevos

## Flujo Propuesto

### Paso 1: Bienvenida
- Saludo personalizado con nombre
- Breve explicación de qué es TestFarm
- Botón "Empezar"

### Paso 2: Configurar Proyecto
- Input para URL del sitio a probar
- Input para nombre del proyecto
- Creación automática del proyecto

### Paso 3: Seleccionar Persona
- Mostrar 3-4 personas recomendadas
- Breve descripción de cada una
- Selección de una persona

### Paso 4: Seleccionar Objetivo
- Mostrar objetivos populares
- Explicación de qué hace cada uno
- Selección de un objetivo

### Paso 5: Crear Primera Sesión
- Resumen de la configuración
- Botón "Crear Sesión"
- Opción de iniciar automáticamente

### Paso 6: Ver Resultados
- Redirect a la sesión creada
- Tooltips explicando la interfaz
- Celebración cuando termine

## Criterios de Aceptación
- [ ] El onboarding se muestra solo a usuarios nuevos
- [ ] Se puede saltar el onboarding
- [ ] Se guarda el progreso si se abandona
- [ ] El usuario termina con una sesión creada
- [ ] Métricas de completado del onboarding

## Estimación
- Diseño del flujo: 1 día
- Implementación UI: 3-4 días
- Lógica de estado: 1 día
- Testing: 1 día
- **Total: 6-7 días**

## Dependencias
- HU-001: Sistema de Autenticación

## Notas
- A/B test diferentes flujos
- Medir drop-off en cada paso
- Email de seguimiento si no completa
