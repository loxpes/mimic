# HU-001: Checklist de Seguimiento

## Estado: 🟡 En progreso

---

## Fase 1: Setup Supabase
- [x] Crear cuenta/proyecto en supabase.com
- [ ] Configurar proveedor Google OAuth
- [x] Configurar proveedor GitHub OAuth
- [ ] Configurar email templates (verificacion, reset)
- [x] Obtener credenciales (URL, ANON_KEY, SERVICE_ROLE_KEY, DATABASE_URL)
- [x] Anadir variables de entorno a .env.example

## Fase 2: Migracion Base de Datos
- [x] Instalar dependencias PostgreSQL (postgres, drizzle-orm/pg)
- [x] Eliminar better-sqlite3
- [x] Actualizar packages/db/src/client.ts para PostgreSQL
- [x] Anadir userId a schema en tablas principales
- [x] Crear archivo SQL con politicas RLS (supabase-rls.sql)
- [x] Aplicar politicas RLS en Supabase (42 politicas en 12 tablas)
- [x] Verificar conexion a Supabase PostgreSQL
- [ ] Eliminar data/testfarm.db (SQLite antiguo)

## Fase 3: Backend Auth
- [x] Instalar @supabase/supabase-js
- [x] Crear apps/api/src/middleware/auth.ts
- [ ] Crear apps/api/src/middleware/rateLimit.ts (opcional)
- [x] Crear apps/api/src/routes/auth.ts
- [x] Registrar rutas de auth en index.ts
- [x] Aplicar authMiddleware a rutas existentes
- [x] Actualizar rutas para filtrar por userId (projects, personas, objectives)
- [x] Migrar sintaxis SQLite (.get, .all) a PostgreSQL en rutas restantes:
  - [x] llm-config.ts
  - [x] findings.ts
  - [x] trello.ts
  - [x] reports.ts
  - [x] session-chains.ts
  - [x] sessions.ts
  - [x] events.ts
  - [x] settings.ts
  - [x] scheduler.ts
  - [x] sync.ts (deshabilitado en modo multi-tenant)
- [ ] Tests de middleware auth

## Fase 4: Frontend Auth
- [x] Instalar @supabase/supabase-js
- [x] Crear apps/web/src/lib/supabase.ts
- [x] Crear apps/web/src/contexts/AuthContext.tsx
- [x] Crear apps/web/src/components/auth/ProtectedRoute.tsx
- [x] Crear pagina Login.tsx
- [x] Crear pagina Register.tsx
- [x] Crear pagina ForgotPassword.tsx
- [x] Crear pagina ResetPassword.tsx
- [x] Crear pagina AuthCallback.tsx
- [x] Actualizar App.tsx con rutas publicas/protegidas
- [x] Actualizar main.tsx con AuthProvider
- [x] Actualizar Layout.tsx con menu usuario
- [x] Actualizar api.ts con header Authorization
- [x] Crear componente dropdown-menu.tsx
- [ ] Tests de AuthContext

## Fase 5: Integracion y Testing
- [ ] Probar flujo completo de registro
- [ ] Probar flujo completo de login
- [ ] Probar login con Google
- [ ] Probar login con GitHub
- [ ] Probar recuperacion de contrasena
- [ ] Probar que usuario A no ve datos de usuario B
- [ ] Probar persistencia de sesion
- [ ] Probar logout

## Fase 6: Documentacion
- [ ] Actualizar CLAUDE.md con nuevos endpoints
- [ ] Documentar variables de entorno necesarias
- [ ] Actualizar README con instrucciones de setup

---

## Notas de Progreso

| Fecha | Avance | Notas |
|-------|--------|-------|
| 2026-02-03 | 60% | Implementacion base de auth con Supabase completada. Schema PostgreSQL con userId, middleware auth, rutas de auth, frontend auth (login/register/password reset). Pendiente: migrar sintaxis .get/.all a PostgreSQL en APIs restantes, configurar proyecto Supabase real, aplicar RLS, testing. |
| 2026-02-03 | 80% | Migracion SQLite a PostgreSQL completada en todas las rutas API. YAML sync deshabilitado en modo multi-tenant. Build exitoso de todos los paquetes. Pendiente: aplicar RLS, testing E2E. |
| 2026-02-03 | 90% | Schema creado en Supabase con drizzle push. 42 politicas RLS aplicadas en 12 tablas. GitHub OAuth configurado. Pendiente: testing E2E. |

## Bloqueos

| Fecha | Descripcion | Estado |
|-------|-------------|--------|
| 2026-02-03 | Multiples archivos API usan sintaxis SQLite (.get, .all) que no existe en PostgreSQL Drizzle | ✅ Resuelto |

## Archivos Creados

### Backend (apps/api)
- `src/middleware/auth.ts` - Middleware de autenticacion JWT
- `src/routes/auth.ts` - Endpoints de autenticacion

### Frontend (apps/web)
- `src/lib/supabase.ts` - Cliente Supabase
- `src/contexts/AuthContext.tsx` - Estado de autenticacion
- `src/components/auth/ProtectedRoute.tsx` - Componente de ruta protegida
- `src/components/ui/dropdown-menu.tsx` - Menu desplegable
- `src/pages/Login.tsx` - Pagina de login
- `src/pages/Register.tsx` - Pagina de registro
- `src/pages/ForgotPassword.tsx` - Pagina de olvide contrasena
- `src/pages/ResetPassword.tsx` - Pagina de resetear contrasena
- `src/pages/AuthCallback.tsx` - Callback para OAuth
- `src/vite-env.d.ts` - Tipos para variables de entorno Vite

### Database (packages/db)
- `drizzle.config.ts` - Configuracion Drizzle para PostgreSQL
- `supabase-rls.sql` - Politicas RLS para Supabase

### Root
- `.env.example` - Plantilla de variables de entorno
- `apps/web/.env.example` - Plantilla para frontend
