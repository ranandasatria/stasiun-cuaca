import { Router } from 'express';
import { getOverviewHandler } from './readings.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Overview of all devices (latest temp/humidity + online status)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 */
router.get('/overview', getOverviewHandler);

export default router;
