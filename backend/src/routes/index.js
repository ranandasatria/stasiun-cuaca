import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import locationRoutes from '../modules/locations/location.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);

export default router;
