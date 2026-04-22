import { Router } from 'express';
import { getAllPairSentiments, getOverview, getPairs } from '../data/marketStore.js';
import { getApiStats } from '../services/eodhdService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/pairs', (_req, res) => {
  return res.json({ pairs: getPairs() });
});

router.get('/sentiment', (_req, res) => {
  return res.json({ data: getAllPairSentiments() });
});

router.get('/eodhd/stats', async (_req, res) => {
  try {
    const stats = await getApiStats();
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch EODHD stats.' });
  }
});

router.get('/dashboard/:pair/overview', (req, res) => {
  const pair = decodeURIComponent(req.params.pair || '');
  const overview = getOverview(pair);

  if (!overview) {
    return res.status(404).json({ message: 'Currency pair not found.' });
  }

  return res.json(overview);
});

export default router;
