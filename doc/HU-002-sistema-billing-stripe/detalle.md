# HU-002: Sistema de Billing con Stripe

## Descripción
Como usuario de TestFarm, quiero poder suscribirme a un plan de pago para desbloquear características premium y aumentar mis límites de uso.

## Objetivo
Implementar un sistema de facturación completo con Stripe que permita:
- Suscripciones mensuales/anuales
- Múltiples tiers de precios
- Gestión de método de pago
- Historial de facturas
- Cancelación y cambio de plan

## Criterios de Aceptación

### Planes de Suscripción
- [ ] Tier Free: Sin coste, límites básicos
- [ ] Tier Pro ($29/mes): Límites ampliados, features premium
- [ ] Tier Team ($99/mes): Multi-usuario, integraciones
- [ ] Tier Enterprise: Contacto para precio personalizado
- [ ] Descuento por pago anual (20%)

### Checkout
- [ ] Integración con Stripe Checkout
- [ ] Soporte para tarjetas de crédito/débito
- [ ] Soporte para SEPA (Europa)
- [ ] Cupones de descuento
- [ ] Trial de 14 días para Pro

### Gestión de Suscripción
- [ ] Ver plan actual y fecha de renovación
- [ ] Cambiar de plan (upgrade/downgrade)
- [ ] Cancelar suscripción
- [ ] Reactivar suscripción cancelada
- [ ] Actualizar método de pago

### Facturación
- [ ] Historial de facturas descargable
- [ ] Emails de confirmación de pago
- [ ] Emails de fallo de pago
- [ ] Emails previos a renovación

### Webhooks
- [ ] Procesar `checkout.session.completed`
- [ ] Procesar `customer.subscription.updated`
- [ ] Procesar `customer.subscription.deleted`
- [ ] Procesar `invoice.payment_failed`

## Modelo de Datos

```sql
-- Planes disponibles
CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY, -- 'free', 'pro', 'team'
  name VARCHAR(100) NOT NULL,
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),
  session_limit INT,
  project_limit INT,
  user_limit INT DEFAULT 1,
  features JSONB -- lista de features incluidas
);

-- Suscripciones de usuarios
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id VARCHAR(50) REFERENCES plans(id),
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),
  status VARCHAR(50), -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Historial de uso mensual
CREATE TABLE usage_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  period_start DATE,
  period_end DATE,
  sessions_used INT DEFAULT 0,
  sessions_limit INT
);
```

## Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/billing/plans | Listar planes disponibles |
| GET | /api/billing/subscription | Ver suscripción actual |
| POST | /api/billing/checkout | Crear sesión de checkout |
| POST | /api/billing/portal | Crear portal de cliente |
| POST | /api/billing/webhook | Recibir eventos de Stripe |
| GET | /api/billing/invoices | Listar facturas |
| GET | /api/billing/usage | Ver uso del período actual |

## Configuración Stripe

### Productos a crear en Stripe:
1. **TestFarm Pro** - $29/mes, $278/año
2. **TestFarm Team** - $99/mes, $950/año

### Webhooks a configurar:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## UI

### Página de Pricing
- Comparativa de planes en tabla/cards
- CTA para cada plan
- Toggle mensual/anual
- FAQ de billing

### Página de Billing (Settings)
- Plan actual con badge
- Uso del período (X/100 sesiones)
- Botón para cambiar plan
- Botón para gestionar pago (portal)
- Lista de facturas recientes

## Estimación
- Configuración Stripe: 1 día
- Backend (endpoints + webhooks): 3-4 días
- Frontend (pricing + billing): 2-3 días
- Testing E2E: 1-2 días
- **Total: 1-2 semanas**

## Dependencias
- HU-001: Sistema de Autenticación (requerido)

## Riesgos
- Seguridad de webhooks (verificar firma)
- Manejo de errores de pago
- Sincronización de estado entre Stripe y DB local
- Cumplimiento PCI-DSS (Stripe lo maneja, no almacenar datos de tarjeta)

## Notas Adicionales
- Usar Stripe Test Mode durante desarrollo
- Considerar Stripe Tax para impuestos automáticos
- Stripe Billing Portal reduce trabajo de UI significativamente
