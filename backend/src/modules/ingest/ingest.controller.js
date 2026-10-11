import { recordHeartbeat } from './ingest.service.js';
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
