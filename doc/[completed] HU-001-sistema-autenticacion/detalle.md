# HU-001: Sistema de Autenticacion con Supabase

## Descripcion
Como usuario de TestFarm, quiero poder registrarme e iniciar sesion de forma segura para que mis proyectos, sesiones y configuraciones esten protegidos y asociados a mi cuenta.

## Objetivo
Implementar un sistema de autenticacion completo usando **Supabase Auth** que permita:
- Registro de nuevos usuarios con email/password
- Login con credenciales
- Login social (Google, GitHub)
- Recuperacion de contrasena
- Gestion de sesiones (JWT tokens)

## Stack Tecnico: Supabase Auth

**Razon de la eleccion:**
- Gratuito hasta 50K MAU
- RLS (Row-Level Security) nativo para multi-tenancy
- Social login incluido (Google, GitHub)
- Misma base de datos para auth y datos de la app

**Implicaciones:**
- Migracion de SQLite a PostgreSQL (Supabase)
- Datos existentes se eliminaran (clean slate para MVP)

## Criterios de Aceptacion

### Registro
- [ ] El usuario puede registrarse con email y contrasena
- [ ] Se valida formato de email y fortaleza de contrasena
- [ ] Se envia email de verificacion
- [ ] No se permiten emails duplicados

### Login
- [ ] El usuario puede iniciar sesion con credenciales validas
- [ ] Mensaje de error generico para credenciales invalidas (seguridad)
- [ ] Opcion "Recordarme" para sesiones persistentes
- [ ] Bloqueo temporal tras multiples intentos fallidos (rate limiting)

### Login Social
- [ ] Integracion con Google OAuth
- [ ] Integracion con GitHub OAuth
- [ ] Vinculacion automatica si el email ya existe

### Sesiones
- [ ] JWT tokens con expiracion configurable
- [ ] Refresh tokens para renovacion automatica
- [ ] Logout que invalida tokens

### UI
- [ ] Pagina de login con formulario limpio
- [ ] Pagina de registro
- [ ] Pagina de recuperacion de contrasena
- [ ] Indicador de usuario logueado en el header
- [ ] Menu de usuario con opciones de perfil y logout

### Multi-tenancy
- [ ] Cada usuario solo ve sus propios datos
- [ ] RLS policies en todas las tablas
- [ ] userId en tablas principales (projects, personas, objectives)

## Modelo de Datos

### Cambios en Schema (PostgreSQL)

```sql
-- Tablas con userId directo (referencia a auth.users)
ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE personas ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE objectives ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE finding_groups ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE app_settings ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- RLS Policy ejemplo
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);
```

### Tablas con herencia via FK
- sessions (via projectId -> projects.userId)
- sessionChains (via projectId)
- events (via sessionId)
- findings (via sessionId)
- sessionReports (via sessionId)
- integrations (via projectId)
- scheduledTasks (via chainId)

## Endpoints API

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | /api/auth/register | Registro de usuario |
| POST | /api/auth/login | Login con email/password |
| POST | /api/auth/logout | Cerrar sesion |
| POST | /api/auth/refresh | Renovar token |
| POST | /api/auth/forgot-password | Solicitar reset |
| GET | /api/auth/me | Obtener usuario actual |

## Variables de Entorno

**Backend (.env):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...
```

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Archivos a Crear/Modificar

### Nuevos archivos
- `apps/api/src/middleware/auth.ts` - Verificar JWT, extraer usuario
- `apps/api/src/middleware/rateLimit.ts` - Rate limiting
- `apps/api/src/routes/auth.ts` - Endpoints de auth
- `apps/web/src/lib/supabase.ts` - Cliente Supabase
- `apps/web/src/contexts/AuthContext.tsx` - Estado de auth
- `apps/web/src/components/auth/ProtectedRoute.tsx`
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/pages/Register.tsx`
- `apps/web/src/pages/ForgotPassword.tsx`
- `apps/web/src/pages/ResetPassword.tsx`
- `apps/web/src/pages/AuthCallback.tsx`

### Archivos a modificar
- `packages/db/package.json` - Cambiar better-sqlite3 por postgres
- `packages/db/src/client.ts` - Cliente PostgreSQL con Drizzle
- `packages/db/src/schema.ts` - Anadir userId a tablas
- `apps/api/src/index.ts` - Registrar auth routes y middleware
- `apps/api/src/routes/*.ts` - Filtrar por userId
- `apps/web/src/App.tsx` - Rutas protegidas
- `apps/web/src/main.tsx` - AuthProvider
- `apps/web/src/components/layout/Layout.tsx` - Menu usuario
- `apps/web/src/lib/api.ts` - Header Authorization

## Dependencias

**Backend:**
```bash
pnpm add @supabase/supabase-js hono-rate-limiter postgres
pnpm remove better-sqlite3
```

**Frontend:**
```bash
pnpm add @supabase/supabase-js @supabase/auth-ui-react @supabase/auth-ui-shared
```

## Riesgos
- Seguridad: XSS, CSRF, inyeccion SQL (mitigado por RLS y parametrizacion)
- Migracion: Perdida de datos existentes (aceptable para MVP)
- Dependencia: Vendor lock-in con Supabase (mitigable, es open source)

## Notas Adicionales
- Multi-tenancy implementado desde el inicio via RLS
- Rate limiting en endpoints de auth
- Datos existentes se eliminan en la migracion (clean slate)
