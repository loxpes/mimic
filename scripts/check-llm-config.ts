/**
 * Script de diagnóstico: Verifica configuración LLM actual
 */

import { getDb, appSettings } from '@testfarm/db';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔍 Verificando configuración LLM...\n');

  // Check env vars
  console.log('📌 Variables de entorno:');
  console.log('  LLM_PROVIDER:', process.env.LLM_PROVIDER || '(no configurada)');
  console.log('  LLM_MODEL:', process.env.LLM_MODEL || '(no configurada)');
  console.log('  CLAUDE_CODE_OAUTH_TOKEN:', process.env.CLAUDE_CODE_OAUTH_TOKEN ? '✓ Configurada' : '✗ No configurada');
  console.log('');

  // Check DB
  const db = getDb();
  const settings = await db.select().from(appSettings).where(eq(appSettings.id, 'global')).get();

  console.log('📌 Base de datos (appSettings):');
  if (settings) {
    console.log('  ID:', settings.id);
    console.log('  llmProvider:', settings.llmProvider);
    console.log('  llmModel:', settings.llmModel);
    console.log('  encryptedAnthropicKey:', settings.encryptedAnthropicKey ? '✓ Presente' : '✗ No configurada');
    console.log('  encryptedOpenaiKey:', settings.encryptedOpenaiKey ? '✓ Presente' : '✗ No configurada');
    console.log('  encryptedGoogleKey:', settings.encryptedGoogleKey ? '✓ Presente' : '✗ No configurada');
  } else {
    console.log('  ⚠️  No hay registro en la base de datos');
  }
  console.log('');

  // Recommendation
  console.log('🎯 Configuración que se está usando:');
  const activeProvider = settings?.llmProvider || process.env.LLM_PROVIDER || 'claude-cli';
  const activeModel = settings?.llmModel || process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  console.log('  Provider:', activeProvider);
  console.log('  Model:', activeModel);
  console.log('');

  if (activeProvider !== 'claude-cli') {
    console.log('⚠️  PROBLEMA DETECTADO:');
    console.log('  El provider activo es', activeProvider, 'en vez de claude-cli');
    console.log('');
    console.log('💡 Solución:');
    console.log('  1. Ve a Settings en la web (http://tu-ip:3001/settings)');
    console.log('  2. Cambia el provider a "Claude Code CLI"');
    console.log('  3. Cambia el modelo a "claude-sonnet-4-20250514"');
    console.log('  4. Haz clic en "Guardar configuración"');
    console.log('');
    console.log('  O ejecuta este comando SQL:');
    console.log(`  UPDATE appSettings SET llmProvider='claude-cli', llmModel='claude-sonnet-4-20250514' WHERE id='global';`);
  } else {
    console.log('✅ Configuración correcta!');
  }
}

main().catch(console.error);
