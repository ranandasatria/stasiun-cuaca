import { Router } from 'express';
import { getReadingsHandler, getSummaryHandler } from './readings.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/readings:
 *   get:
 *     tags: [Readings]
 *     summary: Time-series query (raw / 1m / 1h / 1d)
 *     description: Long ranges are auto-aggregated. Max 1000 points per response.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: sensor_type
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: interval
 *         schema: { type: string, enum: [raw, 1m, 1h, 1d] }
 *       - in: query
 *         name: agg
 *         schema: { type: string, enum: [avg, min, max, sum] }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 *       422: { description: Validation error }
 */
router.get('/', getReadingsHandler);

/**
 * @openapi
 * /api/v1/readings/summary:
 *   get:
 *     tags: [Readings]
 *     summary: Daily summary per sensor (min/max/avg/sum)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: device_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 */
router.get('/summary', getSummaryHandler);

export default router;
