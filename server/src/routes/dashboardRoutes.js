import { Router } from 'express';
import { getAllPairSentiments, getOverview, getPairs } from '../data/marketStore.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/pairs', (_req, res) => {
  return res.json({ pairs: getPairs() });
});

router.get('/sentiment', (_req, res) => {
  return res.json({ data: getAllPairSentiments() });
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
