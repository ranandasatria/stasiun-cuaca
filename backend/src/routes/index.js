import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import locationRoutes from '../modules/locations/location.routes.js';
import deviceRoutes from '../modules/devices/device.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/devices', deviceRoutes);

export default router;
