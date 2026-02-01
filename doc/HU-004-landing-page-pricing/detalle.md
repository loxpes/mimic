# HU-004: Landing Page y Pricing

## Descripción
Como visitante del sitio, quiero ver una landing page atractiva que explique qué es TestFarm y una página de precios clara para decidir si me suscribo.

## Objetivo
Crear una landing page pública que:
- Explique el producto y su propuesta de valor
- Muestre características principales
- Presente los planes de precios
- Incluya testimonios/casos de uso
- Tenga CTAs claros para registro

## Páginas a Crear

### Landing Page (/)
- Hero section con headline y CTA
- Sección "Cómo funciona" (3 pasos)
- Features principales con iconos
- Demo/video del producto
- Testimonios o logos de clientes
- FAQ
- Footer con links

### Página de Pricing (/pricing)
- Tabla comparativa de planes
- Toggle mensual/anual
- Feature list por plan
- CTA por plan
- FAQ de billing
- Garantía de devolución

### Página de Features (/features) - Opcional
- Detalle de cada característica
- Screenshots/demos
- Casos de uso

## Criterios de Aceptación

### Landing
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Carga rápida (<3s)
- [ ] SEO básico (meta tags, OG)
- [ ] Analytics integrado
- [ ] CTA visibles above the fold

### Pricing
- [ ] Precios claros y fáciles de comparar
- [ ] Toggle mensual/anual funcional
- [ ] Highlight del plan recomendado
- [ ] Link a checkout funcional

## Stack Técnico
- Mismo stack que el dashboard (React + Tailwind)
- O alternativa: páginas estáticas con Next.js/Astro para mejor SEO

## Estimación
- Diseño/wireframes: 1-2 días
- Landing page: 2-3 días
- Pricing page: 1 día
- Responsive + polish: 1 día
- **Total: 5-7 días**

## Dependencias
- Ninguna (puede hacerse en paralelo)
- Se beneficia de HU-002 para links a checkout

## Notas
- Considerar A/B testing de headlines
- Integrar Hotjar/FullStory para ver comportamiento
- Preparar versiones en múltiples idiomas
