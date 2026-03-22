import { Router } from 'express';
import { profilesPath, projectsDir, projectFilePath } from '../storage/paths.js';
import { readJSON, listDirs } from '../storage/readWrite.js';
import { getAuthStatus, getConfigWithSecurity, maskSecurity } from '../security/auth.js';

const router = Router();

router.get('/bootstrap', async (req, res) => {
  try {
    const rawConfig = await getConfigWithSecurity();
    const config = maskSecurity(rawConfig);
    const profiles = (await readJSON(profilesPath())) || {};

    const ids = await listDirs(projectsDir());
    const projects = [];
    for (const id of ids) {
      const data = await readJSON(projectFilePath(id));
      if (data) projects.push({ id, ...data });
    }

    const activeProjectId = rawConfig.ui?.defaultProjectId || (ids[0] ?? 'home');

    res.json({
      config,
      profiles,
      projects,
      activeProjectId,
      auth: getAuthStatus(req, rawConfig),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
