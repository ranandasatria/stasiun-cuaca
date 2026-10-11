import { Router } from 'express';
import { postHeartbeat, postTelemetry, postTelemetryBatch } from './ingest.controller.js';
import { deviceAuth } from '../../middleware/deviceAuth.js';
import { ingestLimiter, batchLimiter } from '../../middleware/rateLimit.js';

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
router.post('/heartbeat', deviceAuth, ingestLimiter, postHeartbeat);

/**
 * @openapi
 * /api/v1/ingest/telemetry:
 *   post:
 *     tags: [Ingestion]
 *     summary: Receive a single telemetry payload
 *     security:
 *       - deviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, fw, ts, seq, readings]
 *             properties:
 *               device_id: { type: string }
 *               fw: { type: string }
 *               ts: { type: integer, description: Unix epoch seconds UTC }
 *               seq: { type: integer }
 *               battery_v: { type: number }
 *               rssi: { type: integer }
 *               readings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     s: { type: string, example: temp_air }
 *                     v: { type: number }
 *     responses:
 *       201: { description: Accepted }
 *       401: { description: Unauthorized }
 *       403: { description: Device not active or device_id mismatch }
 *       422: { description: Validation error }
 */
router.post('/telemetry', deviceAuth, ingestLimiter, postTelemetry);

/**
 * @openapi
 * /api/v1/ingest/telemetry/batch:
 *   post:
 *     tags: [Ingestion]
 *     summary: Receive buffered telemetry (max 500 records)
 *     security:
 *       - deviceKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [device_id, fw, batch]
 *             properties:
 *               device_id: { type: string }
 *               fw: { type: string }
 *               batch:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     ts: { type: integer }
 *                     seq: { type: integer }
 *                     battery_v: { type: number }
 *                     rssi: { type: integer }
 *                     readings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           s: { type: string }
 *                           v: { type: number }
 *     responses:
 *       207: { description: Multi-status (accepted / duplicates / failed) }
 *       401: { description: Unauthorized }
 *       403: { description: Device not active or device_id mismatch }
 *       413: { description: Batch exceeds 500 records }
 */
router.post('/telemetry/batch', deviceAuth, batchLimiter, postTelemetryBatch);

export default router;
