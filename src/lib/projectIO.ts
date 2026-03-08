/**
 * Build Project export / import utilities.
 */

import type { BuildProject, TerrainSettings } from '../store/types';
import { BUILD_PROJECT_SCHEMA_VERSION } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import { migrateProject, validateProjectSchema } from './projectMigrations';

// ── App version (injected by Vite) ──
const APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION ?? '0.6.0';

// ── Default terrain for fills ──
const defaultTerrain: TerrainSettings = {
  enabled: false,
  grassColor: '#4a7c3f',
  grassRadius: 20,
  trees: [],
};

/**
 * Extract current build project data from the store and return a portable BuildProject.
 */
export function extractBuildProject(name?: string): BuildProject {
  const s = useAppStore.getState();

  // Strip vacuumDebug (transient) and fileData (large) from export
  const devices = {
    markers: s.devices.markers,
    deviceStates: s.devices.deviceStates,
  };

  const homeGeo = { ...s.homeGeometry };
  if (homeGeo.imported?.fileData) {
    homeGeo.imported = { ...homeGeo.imported, fileData: undefined };
  }

  return {
    meta: {
      schemaVersion: BUILD_PROJECT_SCHEMA_VERSION,
      id: 'home', // current single-project id
      name: name || 'Mitt hem',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
    layout: s.layout,
    devices,
    homeGeometry: homeGeo,
    props: s.props,
    terrain: s.terrain ?? defaultTerrain,
    activityLog: s.activityLog,
  };
}

/**
 * Export the current build project as a downloadable JSON file.
 */
export function exportBuildProject(name?: string): void {
  const project = extractBuildProject(name);
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (project.meta.name || 'projekt').replace(/[^a-zA-Z0-9åäöÅÄÖ_-]/g, '_');
  a.download = `bjorq-projekt-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import a build project from a parsed JSON object.
 * Returns stats for the confirmation UI.
 */
export function importBuildProject(
  data: any,
  mode: 'replace' | 'new' = 'replace'
): { success: boolean; error?: string; warnings: string[]; stats: ProjectStats } {
  // Validate
  const { valid, errors, warnings } = validateProjectSchema(data);
  if (!valid) {
    return {
      success: false,
      error: errors.join('; '),
      warnings,
      stats: emptyStats(),
    };
  }

  // Migrate
  const { project, steps } = migrateProject(data);
  if (steps.length > 0) {
    console.log('[ProjectIO] Applied migrations:', steps);
    warnings.push(`Migrerade från äldre format (${steps.join(', ')})`);
  }

  // Calculate stats
  const stats = calculateStats(project);

  // Apply to store
  const stateUpdate: Record<string, unknown> = {
    layout: project.layout,
    devices: { ...project.devices, vacuumDebug: {} },
    homeGeometry: project.homeGeometry,
    props: project.props ?? { catalog: [], items: [] },
    terrain: project.terrain ?? defaultTerrain,
    activityLog: project.activityLog ?? [],
  };

  useAppStore.setState(stateUpdate as any);

  return { success: true, warnings, stats };
}

// ── Stats ──

export interface ProjectStats {
  floors: number;
  rooms: number;
  walls: number;
  openings: number;
  devices: number;
  props: number;
  stairs: number;
}

function emptyStats(): ProjectStats {
  return { floors: 0, rooms: 0, walls: 0, openings: 0, devices: 0, props: 0, stairs: 0 };
}

export function calculateStats(project: BuildProject): ProjectStats {
  const floors = project.layout?.floors ?? [];
  return {
    floors: floors.length,
    rooms: floors.reduce((sum, f) => sum + (f.rooms?.length ?? 0), 0),
    walls: floors.reduce((sum, f) => sum + (f.walls?.length ?? 0), 0),
    openings: floors.reduce((sum, f) => sum + f.walls.reduce((ws, w) => ws + (w.openings?.length ?? 0), 0), 0),
    devices: project.devices?.markers?.length ?? 0,
    props: project.props?.items?.length ?? 0,
    stairs: floors.reduce((sum, f) => sum + (f.stairs?.length ?? 0), 0),
  };
}

/**
 * Read a File object as parsed JSON.
 */
export function readProjectFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        resolve(JSON.parse(ev.target?.result as string));
      } catch {
        reject(new Error('Kunde inte läsa filen som JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Filläsningsfel'));
    reader.readAsText(file);
  });
}
