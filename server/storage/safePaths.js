import path from 'path';
import { projectsDir, projectDir } from './paths.js';

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILENAME = /^[a-zA-Z0-9_.-]+$/;

function normalizeRoot(rootPath) {
  return path.resolve(rootPath);
}

export function assertSafeSegment(value, label = 'path segment') {
  if (typeof value !== 'string' || !SAFE_SEGMENT.test(value)) {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
  return value;
}

export function assertSafeFilename(value, label = 'filename') {
  if (typeof value !== 'string' || !SAFE_FILENAME.test(value) || path.basename(value) !== value) {
    const err = new Error(`Invalid ${label}`);
    err.statusCode = 400;
    throw err;
  }
  return value;
}

export function resolveInside(rootPath, ...segments) {
  const root = normalizeRoot(rootPath);
  const resolved = path.resolve(root, ...segments);
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    const err = new Error('Path escapes allowed root');
    err.statusCode = 400;
    throw err;
  }
  return resolved;
}

export function safeProjectId(projectId) {
  return assertSafeSegment(projectId, 'project id');
}

export function safeProjectDir(projectId) {
  return resolveInside(projectsDir(), safeProjectId(projectId));
}

export function safeProjectPath(projectId, ...segments) {
  return resolveInside(projectDir(safeProjectId(projectId)), ...segments);
}
