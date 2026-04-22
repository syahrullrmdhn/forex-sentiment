import { Router } from 'express';
import { getUserById, signToken, validateCredentials } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { identifier, password } = req.body || {};
  const user = await validateCredentials(identifier, password);

  if (!user) {
    return res.status(401).json({ message: 'Invalid username/email or password.' });
  }

  return res.json({
    token: signToken(user),
    user,
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await getUserById(req.user.id);

  return res.json({
    user: user || req.user,
  });
});

export default router;
