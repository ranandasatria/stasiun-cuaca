import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import locationRoutes from '../modules/locations/location.routes.js';
import deviceRoutes from '../modules/devices/device.routes.js';
import ingestRoutes from '../modules/ingest/ingest.routes.js';
import sensorRoutes from '../modules/sensors/sensor.routes.js';
import sensorTypeRoutes from '../modules/sensors/sensorType.routes.js';
import installationRoutes from '../modules/sensors/installation.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/devices', deviceRoutes);
router.use('/devices', installationRoutes);
router.use('/sensor-types', sensorTypeRoutes);
router.use('/sensors', sensorRoutes);
router.use('/ingest', ingestRoutes);

export default router;
