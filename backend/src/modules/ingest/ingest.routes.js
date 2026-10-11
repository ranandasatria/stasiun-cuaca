import { Router } from 'express';
import { postHeartbeat } from './ingest.controller.js';
import { deviceAuth } from '../../middleware/deviceAuth.js';

const router = Router();

/**
 * @openapi
 * /api/v1/ingest/heartbeat:
 *   post:
 *     tags: [Ingestion]
 *     summary: Device heartbeat (status only, no sensor data)
 *     security:
 *       - deviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, ts, fw, battery_v, rssi]
 *             properties:
 *               device_id: { type: string }
 *               ts: { type: integer, description: Unix epoch seconds UTC }
 *               fw: { type: string }
 *               battery_v: { type: number }
 *               rssi: { type: integer }
 *               uptime_s: { type: integer }
 *     responses:
 *       202: { description: Accepted }
 *       401: { description: Unauthorized }
 *       403: { description: Device not active }
 */
router.post('/heartbeat', deviceAuth, postHeartbeat);

export default router;
