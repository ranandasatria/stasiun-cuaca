import { Router } from 'express';
import locationRoutes from '../modules/locations/location.routes.js';

const router = Router();

router.use('/locations', locationRoutes);

export default router;
