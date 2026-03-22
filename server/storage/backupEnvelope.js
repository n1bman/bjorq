import { safeProjectId } from './safePaths.js';

export const BACKUP_SCHEMA_VERSION = 1;

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function ensurePlainObject(value, label) {
  if (!isPlainObject(value)) {
    const err = new Error(`${label} must be an object`);
    err.statusCode = 400;
    throw err;
  }
  return value;
}

export function normalizeBackupEnvelope(payload) {
  const root = ensurePlainObject(payload, 'Backup payload');
  const meta = isPlainObject(root._meta) ? root._meta : {};
  const config = isPlainObject(root.config) ? root.config : {};
  const profiles = isPlainObject(root.profiles) ? root.profiles : {};

  if (!Array.isArray(root.projects)) {
    const err = new Error('Backup payload must contain a projects array');
    err.statusCode = 400;
    throw err;
  }

  const seenIds = new Set();
  const projects = root.projects.map((project, index) => {
    const normalizedProject = ensurePlainObject(project, `projects[${index}]`);
    const projectId = safeProjectId(normalizedProject.id || 'home');
    if (seenIds.has(projectId)) {
      const err = new Error(`Duplicate project id in backup: ${projectId}`);
      err.statusCode = 400;
      throw err;
    }
    seenIds.add(projectId);
    return { ...normalizedProject, id: projectId };
  });

  let activeProjectId = typeof root.activeProjectId === 'string' && root.activeProjectId.trim()
    ? safeProjectId(root.activeProjectId)
    : projects[0]?.id || 'home';

  if (projects.length > 0 && !projects.some((project) => project.id === activeProjectId)) {
    activeProjectId = projects[0].id;
  }

  return {
    _meta: {
      schemaVersion: meta.schemaVersion || BACKUP_SCHEMA_VERSION,
      version: typeof meta.version === 'string' ? meta.version : 'unknown',
      createdAt: typeof meta.createdAt === 'string' ? meta.createdAt : new Date().toISOString(),
    },
    config: {
      ui: isPlainObject(config.ui) ? config.ui : {},
      network: isPlainObject(config.network) ? config.network : {},
      ha: isPlainObject(config.ha)
        ? { baseUrl: typeof config.ha.baseUrl === 'string' ? config.ha.baseUrl : '', token: '' }
        : { baseUrl: '', token: '' },
    },
    profiles,
    projects,
    activeProjectId,
  };
}
