import {
  listSensorTypes,
  createSensorType,
  listSensors,
  getSensor,
  createSensor,
  updateSensor,
  deleteSensor,
  attachSensor,
  detachSensor,
} from './sensor.service.js';
import { httpError } from '../../utils/httpError.js';

export async function getSensorTypes(req, res) {
  const data = await listSensorTypes();
  res.json({ data, request_id: req.id });
}

export async function postSensorType(req, res) {
  const { code, displayName, unit, minValid, maxValid, precision } = req.body;

  if (!code || !displayName || !unit || minValid === undefined || maxValid === undefined || precision === undefined) {
    throw httpError(422, 'VALIDATION_ERROR', 'code, displayName, unit, minValid, maxValid, precision are required');
  }

  const data = await createSensorType({ code, displayName, unit, minValid, maxValid, precision });
  res.status(201).json({ data, request_id: req.id });
}

export async function getSensors(req, res) {
  const data = await listSensors();
  res.json({ data, request_id: req.id });
}

export async function getSensorById(req, res) {
  const data = await getSensor(Number(req.params.id));
  res.json({ data, request_id: req.id });
}

export async function postSensor(req, res) {
  const { serialNumber, typeCode } = req.body;

  if (!serialNumber || !typeCode) {
    throw httpError(422, 'VALIDATION_ERROR', 'serialNumber and typeCode are required');
  }

  const data = await createSensor({ serialNumber, typeCode });
  res.status(201).json({ data, request_id: req.id });
}

export async function patchSensor(req, res) {
  const data = await updateSensor(Number(req.params.id), req.body);
  res.json({ data, request_id: req.id });
}

export async function deleteSensorById(req, res) {
  await deleteSensor(Number(req.params.id));
  res.status(204).send();
}

export async function postInstallation(req, res) {
  const { sensorId, installedAt } = req.body;

  if (sensorId === undefined) {
    throw httpError(422, 'VALIDATION_ERROR', 'sensorId is required');
  }

  const data = await attachSensor(req.params.id, Number(sensorId), installedAt);
  res.status(201).json({ data, request_id: req.id });
}

export async function deleteInstallation(req, res) {
  const data = await detachSensor(req.params.id, Number(req.params.sensorId));
  res.json({ data, request_id: req.id });
}
