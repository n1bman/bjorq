import { Router } from 'express';
import { configPath, profilesPath, projectsDir, projectFilePath } from '../storage/paths.js';
import { readJSON, listDirs } from '../storage/readWrite.js';

const router = Router();

// GET /api/bootstrap — returns everything the frontend needs in one call
router.get('/bootstrap', async (_req, res) => {
  try {
    const rawConfig = (await readJSON(configPath())) || {};
    // Mask token, but keep wsUrl and ui settings
    const config = {
      ...rawConfig,
      ha: { baseUrl: rawConfig.ha?.baseUrl || '', token: rawConfig.ha?.token ? '***' : '' },
    };

    const profiles = (await readJSON(profilesPath())) || {};

    // Load all projects
    const ids = await listDirs(projectsDir());
    const projects = [];
    for (const id of ids) {
      const data = await readJSON(projectFilePath(id));
      if (data) projects.push({ id, ...data });
    }

    const activeProjectId = rawConfig.ui?.defaultProjectId || (ids[0] ?? 'home');

    res.json({ config, profiles, projects, activeProjectId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
