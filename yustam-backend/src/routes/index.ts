import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import chatRoutes from './chat.routes';
import favoritesRoutes from './favorites.routes';
import homeRoutes from './home.routes';
import notificationsRoutes from './notifications.routes';
import planRoutes from './plan.routes';
import productRoutes from './product.routes';
import supportRoutes from './support.routes';
import vendorRoutes from './vendor.routes';
import verificationRoutes from './verification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/home', homeRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/chats', chatRoutes);
router.use('/favorites', favoritesRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/plans', planRoutes);
router.use('/vendor', vendorRoutes);
router.use('/verification', verificationRoutes);
router.use('/support', supportRoutes);
router.use('/admin', adminRoutes);

export default router;
