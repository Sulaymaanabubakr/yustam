import { Router } from 'express';
import { getHomeFeed } from '../services/home.service';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const data = await getHomeFeed();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;