import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js';

export async function listSensorTypes() {
  return prisma.sensorType.findMany({ orderBy: { code: 'asc' } });
}

export async function createSensorType({ code, displayName, unit, minValid, maxValid, precision }) {
  const existing = await prisma.sensorType.findUnique({ where: { code } });
  if (existing) {
    throw httpError(409, 'SENSOR_TYPE_EXISTS', 'Sensor type code already exists');
  }
  return prisma.sensorType.create({
    data: { code, displayName, unit, minValid, maxValid, precision },
  });
}

export async function listSensors() {
  return prisma.sensor.findMany({
    include: { type: true },
    orderBy: { id: 'asc' },
  });
}

export async function getSensor(id) {
  const sensor = await prisma.sensor.findUnique({ where: { id }, include: { type: true } });
  if (!sensor) {
    throw httpError(404, 'SENSOR_NOT_FOUND', 'Sensor not found');
  }
  return sensor;
}

export async function createSensor({ serialNumber, typeCode }) {
  const type = await prisma.sensorType.findUnique({ where: { code: typeCode } });
  if (!type) {
    throw httpError(422, 'SENSOR_TYPE_NOT_FOUND', 'typeCode does not exist');
  }
  const existing = await prisma.sensor.findUnique({ where: { serialNumber } });
  if (existing) {
    throw httpError(409, 'SENSOR_EXISTS', 'serialNumber already exists');
  }
  return prisma.sensor.create({ data: { serialNumber, typeCode } });
}

export async function updateSensor(id, { serialNumber, typeCode }) {
  await getSensor(id);

  const data = {};
  if (serialNumber !== undefined) data.serialNumber = serialNumber;
  if (typeCode !== undefined) {
    const type = await prisma.sensorType.findUnique({ where: { code: typeCode } });
    if (!type) throw httpError(422, 'SENSOR_TYPE_NOT_FOUND', 'typeCode does not exist');
    data.typeCode = typeCode;
  }

  return prisma.sensor.update({ where: { id }, data });
}

export async function deleteSensor(id) {
  await getSensor(id);

  const installations = await prisma.sensorInstallation.count({ where: { sensorId: id } });
  if (installations > 0) {
    throw httpError(409, 'SENSOR_HAS_HISTORY', 'Sensor has installation history; cannot delete');
  }

  await prisma.sensor.delete({ where: { id } });
}

export async function attachSensor(deviceId, sensorId, installedAt) {
  const device = await prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
  if (!device) {
    throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
  if (!sensor) {
    throw httpError(404, 'SENSOR_NOT_FOUND', 'Sensor not found');
  }

  const active = await prisma.sensorInstallation.findFirst({
    where: { sensorId, removedAt: null },
  });
  if (active) {
    throw httpError(409, 'SENSOR_ALREADY_INSTALLED', 'Sensor is already installed on a device');
  }

  return prisma.sensorInstallation.create({
    data: {
      sensorId,
      deviceId,
      installedAt: installedAt ? new Date(installedAt) : new Date(),
    },
  });
}

export async function detachSensor(deviceId, sensorId, removedAt) {
  const active = await prisma.sensorInstallation.findFirst({
    where: { sensorId, deviceId, removedAt: null },
  });
  if (!active) {
    throw httpError(404, 'INSTALLATION_NOT_FOUND', 'No active installation for this sensor on this device');
  }

  return prisma.sensorInstallation.update({
    where: { id: active.id },
    data: { removedAt: removedAt ? new Date(removedAt) : new Date() },
  });
}
