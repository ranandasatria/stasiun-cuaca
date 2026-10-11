import { Router } from 'express';
import { postLocation, getLocations } from './location.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/locations:
 *   post:
 *     tags: [Locations]
 *     summary: Create a location
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, latitude, longitude, altitude]
 *             properties:
 *               name: { type: string }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *               altitude: { type: number }
 *     responses:
 *       201: { description: Created }
 *       401: { description: Unauthorized }
 *       422: { description: Validation error }
 */
router.post('/', postLocation);

/**
 * @openapi
 * /api/v1/locations:
 *   get:
 *     tags: [Locations]
 *     summary: List locations (offset pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       401: { description: Unauthorized }
 */
router.get('/', getLocations);

export default router;
