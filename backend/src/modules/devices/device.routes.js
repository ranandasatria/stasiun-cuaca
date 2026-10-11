import { Router } from 'express';
import {
  postDevice,
  getDevices,
  getDeviceById,
  patchDevice,
  postRotateCredential,
  deleteDevice,
  getHealth,
} from './device.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/v1/devices:
 *   post:
 *     tags: [Devices]
 *     summary: Register a new device (returns the API key once)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, name, locationId]
 *             properties:
 *               id: { type: string, example: WS-GRT-001 }
 *               name: { type: string }
 *               locationId: { type: integer }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Device id already exists }
 *       422: { description: Validation error }
 */
router.post('/', postDevice);

/**
 * @openapi
 * /api/v1/devices:
 *   get:
 *     tags: [Devices]
 *     summary: List devices (filter + offset pagination)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PROVISIONED, ACTIVE, MAINTENANCE, DECOMMISSIONED] }
 *       - in: query
 *         name: location_id
 *         schema: { type: integer }
 *       - in: query
 *         name: q
 *         schema: { type: string }
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
router.get('/', getDevices);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Get one device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:id', getDeviceById);

/**
 * @openapi
 * /api/v1/devices/{id}/health:
 *   get:
 *     tags: [Devices]
 *     summary: Device health (online if seen within 15 minutes)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:id/health', getHealth);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   patch:
 *     tags: [Devices]
 *     summary: Update device fields, or change status (controlled transition)
 *     description: Send `status` to change lifecycle state (writes history), or `name`/`locationId` to update fields.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               locationId: { type: integer }
 *               status: { type: string, enum: [PROVISIONED, ACTIVE, MAINTENANCE, DECOMMISSIONED] }
 *               reason: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 *       422: { description: Invalid transition or validation error }
 */
router.patch('/:id', patchDevice);

/**
 * @openapi
 * /api/v1/devices/{id}/credentials/rotate:
 *   post:
 *     tags: [Devices]
 *     summary: Rotate device API key (returns the new key once)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: OK, returns new apiKey }
 *       404: { description: Not found }
 */
router.post('/:id/credentials/rotate', postRotateCredential);

/**
 * @openapi
 * /api/v1/devices/{id}:
 *   delete:
 *     tags: [Devices]
 *     summary: Soft delete a device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete('/:id', deleteDevice);

export default router;
