import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { addSavedItem, listSavedItems, removeSavedItem } from '../services/favorite.service';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const items = await listSavedItems(req.authUser!.userId);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { productId } = req.body as { productId?: string };
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }
    const item = await addSavedItem(req.authUser!.userId, productId);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    await removeSavedItem(req.authUser!.userId, req.params.productId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;