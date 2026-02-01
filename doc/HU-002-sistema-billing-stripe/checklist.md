# HU-002: Checklist de Seguimiento

## Estado: 🔴 No iniciado

## Fase 1: Configuración Stripe
- [ ] Crear cuenta de Stripe
- [ ] Configurar Test Mode
- [ ] Crear productos (Pro, Team)
- [ ] Crear precios (mensual, anual)
- [ ] Configurar webhook endpoint
- [ ] Obtener API keys

## Fase 2: Backend - Modelos
- [ ] Crear tabla `plans`
- [ ] Crear tabla `subscriptions`
- [ ] Crear tabla `usage_records`
- [ ] Seed de planes iniciales
- [ ] Instalar stripe SDK

## Fase 3: Backend - Endpoints
- [ ] GET /api/billing/plans
- [ ] GET /api/billing/subscription
- [ ] POST /api/billing/checkout
- [ ] POST /api/billing/portal
- [ ] POST /api/billing/webhook
- [ ] GET /api/billing/invoices
- [ ] GET /api/billing/usage

## Fase 4: Backend - Webhooks
- [ ] Verificar firma de Stripe
- [ ] Manejar checkout.session.completed
- [ ] Manejar subscription.updated
- [ ] Manejar subscription.deleted
- [ ] Manejar invoice.payment_failed

## Fase 5: Frontend
- [ ] Página de Pricing (/pricing)
- [ ] Sección de Billing en Settings
- [ ] Componente de plan actual
- [ ] Componente de uso
- [ ] Lista de facturas
- [ ] Integración con Stripe Checkout

## Fase 6: Testing
- [ ] Test de checkout completo
- [ ] Test de cambio de plan
- [ ] Test de cancelación
- [ ] Test de webhook (Stripe CLI)
- [ ] Test de límites por plan

## Notas de Progreso

| Fecha | Avance | Notas |
|-------|--------|-------|
| - | - | - |
