import { Router } from 'express';
import { postInstallation, deleteInstallation, getDeviceSensors } from './sensor.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/devices/{id}/sensors:
 *   get:
 *     tags: [Sensors]
 *     summary: List sensors currently installed on a device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:id/sensors', getDeviceSensors);

/**
 * @openapi
 * /api/v1/devices/{id}/sensors:
 *   post:
 *     tags: [Sensors]
 *     summary: Install a sensor on a device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sensorId]
 *             properties:
 *               sensorId: { type: integer }
 *               installedAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Installed }
 *       404: { description: Device or sensor not found }
 *       409: { description: Sensor already installed }
 */
router.post('/:id/sensors', postInstallation);

/**
 * @openapi
 * /api/v1/devices/{id}/sensors/{sensorId}:
 *   delete:
 *     tags: [Sensors]
 *     summary: Remove a sensor from a device (closes the installation)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Removed }
 *       404: { description: No active installation }
 */
router.delete('/:id/sensors/:sensorId', deleteInstallation);

export default router;
