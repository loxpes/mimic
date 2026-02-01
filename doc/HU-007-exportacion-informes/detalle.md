# HU-007: Exportación de Informes

## Descripción
Como usuario de TestFarm (Plan Pro+), quiero poder exportar informes de mis sesiones y proyectos en formato PDF y HTML para compartir con stakeholders.

## Objetivo
Implementar generación de informes profesionales:
- Informe de sesión individual
- Informe de proyecto (agregado)
- Formatos: PDF, HTML, Markdown
- Diseño profesional y brandeable

## Tipos de Informe

### Informe de Sesión
- Resumen ejecutivo
- Persona y objetivo utilizados
- Hallazgos encontrados (con evidencia)
- Timeline de acciones
- Evaluación personal del agente
- Screenshots relevantes

### Informe de Proyecto
- Resumen ejecutivo
- Estadísticas agregadas
- Hallazgos por severidad
- Tendencias (si hay múltiples sesiones)
- Recomendaciones
- Anexo: detalle por sesión

## Criterios de Aceptación
- [ ] Exportar sesión a PDF
- [ ] Exportar sesión a HTML
- [ ] Exportar proyecto a PDF
- [ ] Exportar proyecto a HTML
- [ ] Diseño profesional
- [ ] Incluir logo TestFarm (brandeable en Enterprise)
- [ ] Incluir screenshots de hallazgos
- [ ] Índice navegable en PDF

## Stack Técnico
- **PDF**: Puppeteer (renderizar HTML a PDF) o jsPDF
- **HTML**: Template engine (Handlebars/EJS)
- **Styling**: CSS dedicado para impresión

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/sessions/:id/export?format=pdf | Exportar sesión |
| GET | /api/projects/:id/export?format=pdf | Exportar proyecto |

## Estimación
- Templates HTML: 2-3 días
- Generación PDF: 2 días
- Styling/diseño: 2 días
- Testing: 1 día
- **Total: 1 semana**

## Dependencias
- HU-002: Sistema de Billing (feature Pro+)

## Notas
- Generar en background para informes grandes
- Cache de informes generados
- Considerar límite de tamaño
