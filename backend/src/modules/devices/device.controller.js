import {
  registerDevice,
  listDevices,
  getDevice,
  updateDevice,
  changeStatus,
  rotateCredential,
  softDeleteDevice,
  getDeviceHealth,
} from './device.service.js';
import { httpError } from '../../utils/httpError.js';

export async function postDevice(req, res) {
  const { id, name, locationId } = req.body;

  if (!id || !name || locationId === undefined) {
    throw httpError(422, 'VALIDATION_ERROR', 'id, name, locationId are required');
  }

  const result = await registerDevice({ id, name, locationId });
  res.status(201).json({ data: result, request_id: req.id });
}

export async function getDevices(req, res) {
  const { status, location_id, q } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const result = await listDevices({ status, locationId: location_id, q, page, limit });

  res.json({
    data: result.data,
    meta: { page: result.page, limit: result.limit, total: result.total },
    request_id: req.id,
  });
}

export async function getDeviceById(req, res) {
  const device = await getDevice(req.params.id);
  res.json({ data: device, request_id: req.id });
}

export async function patchDevice(req, res) {
  const { status, reason, name, locationId } = req.body;

  if (status !== undefined) {
    const device = await changeStatus(req.params.id, status, reason);
    return res.json({ data: device, request_id: req.id });
  }

  const device = await updateDevice(req.params.id, { name, locationId });
  res.json({ data: device, request_id: req.id });
}

export async function postRotateCredential(req, res) {
  const result = await rotateCredential(req.params.id);
  res.json({ data: result, request_id: req.id });
}

export async function deleteDevice(req, res) {
  await softDeleteDevice(req.params.id);
  res.status(204).send();
}

export async function getHealth(req, res) {
  const health = await getDeviceHealth(req.params.id);
  res.json({ data: health, request_id: req.id });
}
