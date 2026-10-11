import { Router } from 'express';
import { getSensorTypes, postSensorType } from './sensor.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/sensor-types:
 *   get:
 *     tags: [Sensors]
 *     summary: List sensor types (master data)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get('/', getSensorTypes);

/**
 * @openapi
 * /api/v1/sensor-types:
 *   post:
 *     tags: [Sensors]
 *     summary: Create a sensor type
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, displayName, unit, minValid, maxValid, precision]
 *             properties:
 *               code: { type: string, example: temp_air }
 *               displayName: { type: string }
 *               unit: { type: string, example: "C" }
 *               minValid: { type: number }
 *               maxValid: { type: number }
 *               precision: { type: integer }
 *     responses:
 *       201: { description: Created }
 *       409: { description: code already exists }
 *       422: { description: Validation error }
 */
router.post('/', postSensorType);

export default router;
