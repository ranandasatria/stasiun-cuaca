import { Router } from 'express';
import {
  getSensors,
  getSensorById,
  postSensor,
  patchSensor,
  deleteSensorById,
  postCalibration,
  getCalibrations,
} from './sensor.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/sensors:
 *   get:
 *     tags: [Sensors]
 *     summary: List sensors
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get('/', getSensors);

/**
 * @openapi
 * /api/v1/sensors:
 *   post:
 *     tags: [Sensors]
 *     summary: Create a physical sensor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serialNumber, typeCode]
 *             properties:
 *               serialNumber: { type: string, example: SN-TEMP-001 }
 *               typeCode: { type: string, example: temp_air }
 *     responses:
 *       201: { description: Created }
 *       409: { description: serialNumber already exists }
 *       422: { description: Validation error }
 */
router.post('/', postSensor);

/**
 * @openapi
 * /api/v1/sensors/{id}:
 *   get:
 *     tags: [Sensors]
 *     summary: Get one sensor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:id', getSensorById);

/**
 * @openapi
 * /api/v1/sensors/{id}:
 *   patch:
 *     tags: [Sensors]
 *     summary: Update sensor serial number or type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serialNumber: { type: string }
 *               typeCode: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.patch('/:id', patchSensor);

/**
 * @openapi
 * /api/v1/sensors/{id}:
 *   delete:
 *     tags: [Sensors]
 *     summary: Delete a sensor (only if it has no installation history)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 *       409: { description: Sensor has installation history }
 */
router.delete('/:id', deleteSensorById);

/**
 * @openapi
 * /api/v1/sensors/{id}/calibrations:
 *   post:
 *     tags: [Sensors]
 *     summary: Add a calibration (offset/scale) effective from a date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [effectiveFrom]
 *             properties:
 *               effectiveFrom: { type: string, format: date-time }
 *               offset: { type: number, example: 0.5 }
 *               scale: { type: number, example: 1.0 }
 *               reason: { type: string }
 *     responses:
 *       201: { description: Created }
 *       404: { description: Sensor not found }
 *       422: { description: Validation error }
 */
router.post('/:id/calibrations', postCalibration);

/**
 * @openapi
 * /api/v1/sensors/{id}/calibrations:
 *   get:
 *     tags: [Sensors]
 *     summary: List calibration history of a sensor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Sensor not found }
 */
router.get('/:id/calibrations', getCalibrations);

export default router;
