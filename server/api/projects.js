import { Router } from 'express';
import crypto from 'crypto';
import { projectsDir, projectFilePath } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';
import { requireAdmin } from '../security/auth.js';
import { safeProjectDir, safeProjectId, safeProjectPath } from '../storage/safePaths.js';

const router = Router();

router.get('/projects', async (_req, res) => {
  try {
    const ids = await listDirs(projectsDir());
    const projects = [];
    for (const id of ids) {
      const data = await readJSON(projectFilePath(id));
      if (data) projects.push({ id, ...data });
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/projects', requireAdmin, async (req, res) => {
  try {
    const id = safeProjectId(req.body.id || crypto.randomUUID().slice(0, 8));
    const data = { ...req.body, id };
    await ensureDir(safeProjectDir(id));
    await writeJSON(safeProjectPath(id, 'project.json'), data);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    const data = await readJSON(safeProjectPath(projectId, 'project.json'));
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ id: projectId, ...data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.put('/projects/:id', requireAdmin, async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    await ensureDir(safeProjectDir(projectId));
    await writeJSON(safeProjectPath(projectId, 'project.json'), req.body);
    res.json(req.body);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/projects/:id/scenes', async (req, res) => {
  try {
    const project = await readJSON(safeProjectPath(safeProjectId(req.params.id), 'project.json'));
    res.json(project?.scenes || []);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/projects/:id', requireAdmin, async (req, res) => {
  try {
    const dir = safeProjectDir(req.params.id);
    const fs = await import('fs/promises');
    await fs.rm(dir, { recursive: true, force: true });
    res.json({ deleted: safeProjectId(req.params.id) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.put('/projects/:id/scenes/:sceneId', requireAdmin, async (req, res) => {
  try {
    const projectId = safeProjectId(req.params.id);
    const sceneId = safeProjectId(req.params.sceneId);
    const project = (await readJSON(safeProjectPath(projectId, 'project.json'))) || {};
    if (!project.scenes) project.scenes = {};
    project.scenes[sceneId] = req.body;
    await writeJSON(safeProjectPath(projectId, 'project.json'), project);
    res.json(req.body);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

export default router;
