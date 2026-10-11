import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import locationRoutes from '../modules/locations/location.routes.js';
import deviceRoutes from '../modules/devices/device.routes.js';
import ingestRoutes from '../modules/ingest/ingest.routes.js';
import sensorRoutes from '../modules/sensors/sensor.routes.js';
import sensorTypeRoutes from '../modules/sensors/sensorType.routes.js';
import installationRoutes from '../modules/sensors/installation.routes.js';
import readingsRoutes from '../modules/readings/readings.routes.js';
import deviceReadingsRoutes from '../modules/readings/deviceReadings.routes.js';
import dashboardRoutes from '../modules/readings/dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/devices', deviceRoutes);
router.use('/devices', installationRoutes);
router.use('/devices', deviceReadingsRoutes);
router.use('/sensor-types', sensorTypeRoutes);
router.use('/sensors', sensorRoutes);
router.use('/readings', readingsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ingest', ingestRoutes);

export default router;
