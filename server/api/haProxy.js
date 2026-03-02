import { Router } from 'express';
import { configPath } from '../storage/paths.js';
import { readJSON } from '../storage/readWrite.js';

const router = Router();

router.all('/ha/*', async (req, res) => {
  try {
    const config = await readJSON(configPath());
    const baseUrl = config?.ha?.baseUrl;
    const token = config?.ha?.token;

    if (!baseUrl || !token) {
      return res.status(400).json({ error: 'Home Assistant not configured' });
    }

    // Strip /api/ha/ prefix and forward
    const haPath = req.params[0]; // everything after /ha/
    const url = `${baseUrl.replace(/\/$/, '')}/api/${haPath}`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const fetchOptions = {
      method: req.method,
      headers,
      ...(req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? { body: JSON.stringify(req.body) }
        : {}),
    };

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    // Camera proxy: return image data as-is
    if (haPath.startsWith('camera_proxy/')) {
      const imgResponse = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } });
      if (!imgResponse.ok) {
        return res.status(imgResponse.status).json({ error: 'Camera proxy failed' });
      }
      const ct = imgResponse.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      return res.status(200).type(ct).send(buffer);
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).type(contentType).send(text);
    }
  } catch (err) {
    console.error('[HA Proxy] Error:', err.message);
    res.status(502).json({ error: 'Failed to reach Home Assistant', detail: err.message });
  }
});

export default router;
