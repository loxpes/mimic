# HU-008: Personas Personalizadas

## Descripción
Como usuario de TestFarm (Plan Pro+), quiero poder crear mis propias personas con características específicas para probar escenarios únicos de mi aplicación.

## Objetivo
Permitir a los usuarios crear y gestionar personas propias:
- Editor visual de personas
- Campos personalizables
- Importar/exportar YAML
- Compartir personas (opcional)

## Funcionalidades

### Editor de Persona
- Nombre y descripción
- Identidad (quién es)
- Perfil técnico (nivel de experiencia)
- Personalidad (cómo se comporta)
- Contexto (situación)
- Tendencias (comportamientos específicos)
- Credenciales de prueba (opcional)

### Gestión
- CRUD completo de personas propias
- Duplicar persona existente
- Importar desde YAML
- Exportar a YAML
- Vista previa de cómo actuará

### Marketplace (Futuro)
- Compartir personas públicamente
- Descubrir personas de otros usuarios
- Rating y reviews

## Criterios de Aceptación
- [ ] Crear persona desde UI
- [ ] Editar persona existente
- [ ] Eliminar persona
- [ ] Duplicar persona del sistema
- [ ] Importar YAML
- [ ] Exportar YAML
- [ ] Usar persona propia en sesión
- [ ] Validación de campos

## Modelo de Datos

```sql
-- Extender tabla personas
ALTER TABLE personas ADD COLUMN owner_id UUID REFERENCES users(id);
ALTER TABLE personas ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE personas ADD COLUMN is_system BOOLEAN DEFAULT false;
-- Las personas del sistema tienen is_system=true, owner_id=null
```

## Estimación
- Backend (CRUD + permisos): 2 días
- Frontend (editor): 3-4 días
- Import/Export: 1 día
- Testing: 1 día
- **Total: 1 semana**

## Dependencias
- HU-001: Sistema de Autenticación
- HU-002: Sistema de Billing (feature Pro+)

## Notas
- Personas del sistema son read-only
- Validar que prompts no contengan inyecciones
- Considerar templates predefinidos
