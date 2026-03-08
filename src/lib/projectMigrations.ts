/**
 * Project schema migrations.
 * Each entry transforms a project from version N → N+1.
 */

import type { BuildProject } from '../store/types';
import { BUILD_PROJECT_SCHEMA_VERSION } from '../store/types';

type MigrationFn = (data: any) => any;

/**
 * Registry: key = source version, value = fn that returns data at version key+1.
 * Add new migrations here as the schema evolves.
 */
const migrations: Record<number, MigrationFn> = {
  // Example for future:
  // 1: (data) => { data.meta.schemaVersion = 2; /* transform */ return data; },
};

/**
 * Migrate a raw project object to the latest schema version.
 * Returns the migrated data and a list of applied migration steps.
 */
export function migrateProject(data: any): { project: BuildProject; steps: string[] } {
  const steps: string[] = [];
  let version: number = data?.meta?.schemaVersion ?? 0;

  // Legacy: no meta wrapper at all (pre-versioning export)
  if (!data.meta) {
    data = {
      meta: {
        schemaVersion: 1,
        id: data.id || 'imported-' + Date.now(),
        name: data.name || 'Importerat projekt',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        appVersion: 'unknown',
      },
      layout: data.layout,
      devices: data.devices,
      homeGeometry: data.homeGeometry,
      props: data.props,
      terrain: data.terrain ?? { enabled: false, grassColor: '#4a7c3f', grassRadius: 20, trees: [] },
      activityLog: data.activityLog ?? [],
    };
    version = 1;
    steps.push('Wrapped legacy data → v1');
  }

  while (version < BUILD_PROJECT_SCHEMA_VERSION) {
    const fn = migrations[version];
    if (!fn) {
      console.warn(`[Migration] No migration for v${version} → v${version + 1}`);
      break;
    }
    data = fn(data);
    version = data.meta.schemaVersion;
    steps.push(`v${version - 1} → v${version}`);
  }

  return { project: data as BuildProject, steps };
}

/**
 * Validate that a parsed JSON object looks like a BuildProject.
 * Returns errors (fatal) and warnings (non-fatal defaults applied).
 */
export function validateProjectSchema(data: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data is not an object');
    return { valid: false, errors, warnings };
  }

  // Allow both wrapped (meta.layout) and flat (layout at root)
  const hasLayout = data.layout || data.meta?.layout;
  if (!hasLayout && !data.layout) {
    errors.push('Missing layout data');
  }

  if (!data.meta && !data.layout) {
    errors.push('No recognizable project structure');
  }

  // Warnings for optional fields
  if (!data.devices && !data.meta) warnings.push('No devices — will import with empty device list');
  if (!data.terrain) warnings.push('No terrain settings — defaults will be used');
  if (!data.props) warnings.push('No props — will import with empty props');

  return { valid: errors.length === 0, errors, warnings };
}
