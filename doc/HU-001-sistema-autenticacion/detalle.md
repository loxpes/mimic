# HU-001: Sistema de Autenticación

## Descripción
Como usuario de TestFarm, quiero poder registrarme e iniciar sesión de forma segura para que mis proyectos, sesiones y configuraciones estén protegidos y asociados a mi cuenta.

## Objetivo
Implementar un sistema de autenticación completo que permita:
- Registro de nuevos usuarios
- Login con email/password
- Login social (Google, GitHub)
- Recuperación de contraseña
- Gestión de sesiones (tokens)

## Criterios de Aceptación

### Registro
- [ ] El usuario puede registrarse con email y contraseña
- [ ] Se valida formato de email y fortaleza de contraseña
- [ ] Se envía email de verificación
- [ ] No se permiten emails duplicados

### Login
- [ ] El usuario puede iniciar sesión con credenciales válidas
- [ ] Mensaje de error genérico para credenciales inválidas (seguridad)
- [ ] Opción "Recordarme" para sesiones persistentes
- [ ] Bloqueo temporal tras múltiples intentos fallidos

### Login Social
- [ ] Integración con Google OAuth
- [ ] Integración con GitHub OAuth
- [ ] Vinculación automática si el email ya existe

### Sesiones
- [ ] JWT tokens con expiración configurable
- [ ] Refresh tokens para renovación automática
- [ ] Logout que invalida tokens
- [ ] Cierre de sesión en todos los dispositivos (opcional)

### UI
- [ ] Página de login con formulario limpio
- [ ] Página de registro
- [ ] Página de recuperación de contraseña
- [ ] Indicador de usuario logueado en el header
- [ ] Menú de usuario con opciones de perfil y logout

## Stack Técnico Recomendado

### Opción A: Clerk (Recomendado para MVP)
- Pros: Rápido de implementar, UI pre-construida, social login incluido
- Cons: Coste mensual, dependencia externa
- Coste: ~$25/mes para 5K MAU

### Opción B: Auth0
- Pros: Muy robusto, enterprise-ready
- Cons: Más complejo, costoso a escala
- Coste: ~$23/mes para 7K MAU

### Opción C: Supabase Auth
- Pros: Open source, integrado con Postgres, gratuito hasta 50K MAU
- Cons: Más manual la implementación
- Coste: Gratuito (plan free)

### Opción D: Custom (JWT + bcrypt)
- Pros: Control total, sin dependencias
- Cons: Más tiempo, responsabilidad de seguridad
- Coste: Solo desarrollo

## Modelo de Datos

```sql
-- Tabla de usuarios (si es custom)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de proveedores OAuth
CREATE TABLE user_providers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR(50) NOT NULL, -- 'google', 'github'
  provider_user_id VARCHAR(255) NOT NULL,
  UNIQUE(provider, provider_user_id)
);
```

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registro de usuario |
| POST | /api/auth/login | Login con email/password |
| POST | /api/auth/logout | Cerrar sesión |
| POST | /api/auth/refresh | Renovar token |
| POST | /api/auth/forgot-password | Solicitar reset |
| POST | /api/auth/reset-password | Cambiar contraseña |
| GET | /api/auth/me | Obtener usuario actual |
| GET | /api/auth/google | Iniciar OAuth Google |
| GET | /api/auth/github | Iniciar OAuth GitHub |

## Estimación
- Con Clerk/Auth0: 2-3 días
- Custom: 1-2 semanas

## Dependencias
- Ninguna (es la base para el resto de HUs)

## Riesgos
- Seguridad: XSS, CSRF, inyección SQL
- Privacidad: Cumplimiento GDPR si hay usuarios EU
- Escalabilidad: Rate limiting necesario

## Notas Adicionales
- Considerar multi-tenancy desde el inicio
- Guardar audit log de acciones de auth
- Implementar 2FA como feature premium futura
