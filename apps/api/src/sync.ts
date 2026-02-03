/**
 * YAML to Database Sync - Auto-sync personas and objectives from YAML files
 *
 * NOTE: This sync is DISABLED in multi-tenant mode (when SUPABASE_URL is set).
 * In multi-tenant mode, personas and objectives require a userId.
 * Users should create personas/objectives via the UI instead.
 */

// Check if we're in multi-tenant mode
function isMultiTenantMode(): boolean {
  return !!process.env.SUPABASE_URL;
}

// ============================================================================
// Sync Functions (disabled in multi-tenant mode)
// ============================================================================

export async function syncPersonas(_personasDir?: string): Promise<number> {
  // Skip in multi-tenant mode (requires userId)
  if (isMultiTenantMode()) {
    console.log('[Sync] Skipping persona sync - multi-tenant mode enabled');
    return 0;
  }

  // YAML sync is disabled in multi-tenant mode
  // In single-tenant mode (no Supabase), this code would need to be re-enabled
  // with proper userId handling
  console.log('[Sync] YAML persona sync is deprecated - use UI to create personas');
  return 0;
}

export async function syncObjectives(_objectivesDir?: string): Promise<number> {
  // Skip in multi-tenant mode (requires userId)
  if (isMultiTenantMode()) {
    console.log('[Sync] Skipping objective sync - multi-tenant mode enabled');
    return 0;
  }

  // YAML sync is disabled in multi-tenant mode
  // In single-tenant mode (no Supabase), this code would need to be re-enabled
  // with proper userId handling
  console.log('[Sync] YAML objective sync is deprecated - use UI to create objectives');
  return 0;
}

// ============================================================================
// Main Sync Function
// ============================================================================

export async function syncYamlToDatabase(): Promise<{ personas: number; objectives: number }> {
  if (isMultiTenantMode()) {
    console.log('[Sync] YAML sync disabled in multi-tenant mode');
    return { personas: 0, objectives: 0 };
  }

  console.log('Syncing YAML files to database...');

  const personaCount = await syncPersonas();
  const objectiveCount = await syncObjectives();

  console.log(`Synced ${personaCount} personas and ${objectiveCount} objectives`);

  return { personas: personaCount, objectives: objectiveCount };
}
