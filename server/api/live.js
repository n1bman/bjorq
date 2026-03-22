import { Router } from 'express';
import { haLiveHub } from '../ha/liveHub.js';
import { getAuthStatusFromRequest } from '../security/auth.js';
import { getServiceAccessPolicy } from '../security/accessPolicy.js';

const router = Router();

router.get('/live/snapshot', async (_req, res) => {
  res.json(haLiveHub.getSnapshot());
});

router.get('/live/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unregister = haLiveHub.registerClient(res);
  const keepAlive = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unregister();
  });
});

router.post('/live/service', async (req, res) => {
  try {
    const { domain, service, data } = req.body || {};
    if (!domain || !service) {
      return res.status(400).json({ error: 'domain and service are required' });
    }
    const access = getServiceAccessPolicy(domain);
    if (access.requiresAdmin) {
      const auth = await getAuthStatusFromRequest(req);
      if (!auth.unlocked) {
        return res.status(401).json({ error: access.reason, auth });
      }
    }
    const result = await haLiveHub.callService(domain, service, data || {});
    res.json({ ok: true, result });
  } catch (err) {
    res.status(err.statusCode || 502).json({ error: err.message });
  }
});

router.get('/live/camera/:entityId', async (req, res) => {
  try {
    const response = await haLiveHub.fetchCamera(req.params.entityId);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(200).type(contentType).send(buffer);
  } catch (err) {
    res.status(err.statusCode || 502).json({ error: err.message });
  }
});

export default router;
