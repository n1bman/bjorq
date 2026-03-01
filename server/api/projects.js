import { Router } from 'express';
import { projectsDir, projectDir, projectFilePath } from '../storage/paths.js';
import { readJSON, writeJSON, ensureDir, listDirs } from '../storage/readWrite.js';
import crypto from 'crypto';

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

router.post('/projects', async (req, res) => {
  try {
    const id = req.body.id || crypto.randomUUID().slice(0, 8);
    const data = { ...req.body, id };
    await ensureDir(projectDir(id));
    await writeJSON(projectFilePath(id), data);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const data = await readJSON(projectFilePath(req.params.id));
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', async (req, res) => {
  try {
    await ensureDir(projectDir(req.params.id));
    await writeJSON(projectFilePath(req.params.id), req.body);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scenes
router.get('/projects/:id/scenes', async (req, res) => {
  try {
    const project = await readJSON(projectFilePath(req.params.id));
    res.json(project?.scenes || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id/scenes/:sceneId', async (req, res) => {
  try {
    const project = (await readJSON(projectFilePath(req.params.id))) || {};
    if (!project.scenes) project.scenes = {};
    project.scenes[req.params.sceneId] = req.body;
    await writeJSON(projectFilePath(req.params.id), project);
    res.json(req.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
