import { Router } from 'express';
import { getLatestHandler } from './readings.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/devices/{id}/readings/latest:
 *   get:
 *     tags: [Readings]
 *     summary: Latest value of every sensor on a device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Device not found }
 */
router.get('/:id/readings/latest', getLatestHandler);

export default router;
