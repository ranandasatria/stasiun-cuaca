import { recordHeartbeat, ingestSingle, ingestBatch } from './ingest.service.js';
import { validateTelemetry } from '../../utils/validateTelemetry.js';
import { httpError } from '../../utils/httpError.js';

export async function postHeartbeat(req, res) {
  const { device_id, ts, fw, battery_v, rssi, uptime_s } = req.body;

  if (ts === undefined || !fw || battery_v === undefined || rssi === undefined) {
    throw httpError(422, 'VALIDATION_ERROR', 'ts, fw, battery_v, rssi are required');
  }

  if (device_id && device_id !== req.device.id) {
    throw httpError(403, 'DEVICE_MISMATCH', 'device_id does not match the authenticated device');
  }

  await recordHeartbeat(req.device, { ts, fw, battery_v, rssi, uptime_s });

  res.status(202).json({
    data: { device_id: req.device.id, accepted: true },
    request_id: req.id,
  });
}

export async function postTelemetry(req, res) {
  const errors = validateTelemetry(req.body);
  if (errors.length > 0) {
    throw httpError(422, 'VALIDATION_ERROR', 'Invalid telemetry payload', errors);
  }

  if (req.body.device_id !== req.device.id) {
    throw httpError(403, 'DEVICE_MISMATCH', 'device_id does not match the authenticated device');
  }

  const data = await ingestSingle(req.device, req.body);
  res.status(201).json({ data, request_id: req.id });
}

export async function postTelemetryBatch(req, res) {
  const { device_id, fw, batch } = req.body;

  if (device_id !== req.device.id) {
    throw httpError(403, 'DEVICE_MISMATCH', 'device_id does not match the authenticated device');
  }

  if (!fw || !Array.isArray(batch)) {
    throw httpError(422, 'VALIDATION_ERROR', 'fw and batch (array) are required');
  }

  if (batch.length > 500) {
    throw httpError(413, 'BATCH_TOO_LARGE', 'batch exceeds the 500 record limit');
  }

  const data = await ingestBatch(req.device, req.body);
  res.status(207).json({ data, request_id: req.id });
}
