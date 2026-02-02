/**
 * Script: Actualiza la config LLM de sesiones pendientes a la config global actual
 */

import { getDb, sessions } from '@testfarm/db';
import { eq, or } from 'drizzle-orm';
import { getGlobalLLMConfig } from '../apps/api/src/lib/llm-config.js';

async function main() {
  console.log('🔧 Actualizando configuración LLM de sesiones pendientes...\n');

  const db = getDb();

  // Get global config
  const globalConfig = await getGlobalLLMConfig();
  console.log('📌 Configuración global actual:');
  console.log('  Provider:', globalConfig.provider);
  console.log('  Model:', globalConfig.model);
  console.log('');

  // Find all pending sessions
  const pendingSessions = await db.select()
    .from(sessions)
    .where(
      or(
        eq(sessions.state.status, 'pending' as any),
        eq(sessions.state.status, 'failed' as any),
        eq(sessions.state.status, 'canceled' as any)
      )
    )
    .all();

  if (pendingSessions.length === 0) {
    console.log('✓ No hay sesiones pendientes para actualizar');
    return;
  }

  console.log(`📋 Encontradas ${pendingSessions.length} sesiones para actualizar:\n`);

  for (const session of pendingSessions) {
    const currentProvider = session.llmConfig?.provider || 'unknown';
    const currentModel = session.llmConfig?.model || 'unknown';

    console.log(`  Session ${session.id.substring(0, 8)}...`);
    console.log(`    Estado: ${session.state.status}`);
    console.log(`    Config actual: ${currentProvider} / ${currentModel}`);
    console.log(`    → Cambiar a: ${globalConfig.provider} / ${globalConfig.model}`);

    // Update session with global config
    await db.update(sessions)
      .set({
        llmConfig: globalConfig as any,
      })
      .where(eq(sessions.id, session.id));

    console.log(`    ✓ Actualizada\n`);
  }

  console.log(`\n✅ ${pendingSessions.length} sesiones actualizadas correctamente`);
  console.log('\n💡 Ahora puedes ejecutar estas sesiones con la nueva configuración');
}

main().catch(console.error);
