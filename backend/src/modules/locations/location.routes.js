import { Router } from 'express';
import { postLocation, getLocations } from './location.controller.js';

const router = Router();

/**
 * @openapi
 * /api/v1/locations:
 *   post:
 *     tags: [Locations]
 *     summary: Create a location
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
 *       422: { description: Validation error }
 */
router.post('/', postLocation);

/**
 * @openapi
 * /api/v1/locations:
 *   get:
 *     tags: [Locations]
 *     summary: List locations (offset pagination)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 */
router.get('/', getLocations);

export default router;
