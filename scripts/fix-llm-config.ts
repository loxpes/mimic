/**
 * Script de corrección: Configura Claude CLI como provider
 */

import { getDb, appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔧 Configurando Claude CLI como provider...\n');

  const db = getDb();

  // Check if settings exist
  const existing = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).get();

  const updates = {
    llmProvider: 'claude-cli' as const,
    llmModel: 'claude-sonnet-4-20250514',
    updatedAt: new Date(),
  };

  if (existing) {
    // Update existing
    await db.update(appSettings)
      .set(updates)
      .where(eq(appSettings.id, 'global'));
    console.log('✅ Configuración actualizada en la base de datos');
  } else {
    // Create new
    await db.insert(appSettings).values({
      id: 'global',
      ...updates,
      encryptedAnthropicKey: null,
      encryptedOpenaiKey: null,
      encryptedGoogleKey: null,
      ollamaBaseUrl: 'http://localhost:11434/v1',
    });
    console.log('✅ Configuración creada en la base de datos');
  }

  // Verify
  const updated = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).get();
  console.log('\n📌 Configuración actual:');
  console.log('  Provider:', updated?.llmProvider);
  console.log('  Model:', updated?.llmModel);
  console.log('\n✅ Listo! La próxima sesión usará Claude CLI');
}

main().catch(console.error);
