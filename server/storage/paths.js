import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

export const dataDir = () => process.env.BJORQ_DATA_DIR || path.join(ROOT, 'data');
export const configPath = () => path.join(dataDir(), 'config.json');
export const profilesPath = () => path.join(dataDir(), 'profiles.json');
export const projectsDir = () => path.join(dataDir(), 'projects');
export const projectDir = (id) => path.join(projectsDir(), id);
export const projectFilePath = (id) => path.join(projectDir(id), 'project.json');
export const assetsDir = (projectId, type, assetId) =>
  path.join(projectDir(projectId), 'assets', type, assetId);
export const assetFilesDir = (projectId, type, assetId) =>
  path.join(assetsDir(projectId, type, assetId), 'files');
export const distDir = () => path.join(ROOT, 'dist');
