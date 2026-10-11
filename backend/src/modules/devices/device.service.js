import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js';

const VALID_STATUSES = ['PROVISIONED', 'ACTIVE', 'MAINTENANCE', 'DECOMMISSIONED'];

const TRANSITIONS = {
  PROVISIONED: ['ACTIVE', 'DECOMMISSIONED'],
  ACTIVE: ['MAINTENANCE', 'DECOMMISSIONED'],
  MAINTENANCE: ['ACTIVE', 'DECOMMISSIONED'],
  DECOMMISSIONED: [],
};

function toPublicDevice(device) {
  const { apiKeyHash, ...rest } = device;
  return rest;
}

async function generateApiKey() {
  const secret = randomBytes(24).toString('hex');
  return {
    secret,
    prefix: secret.slice(0, 8),
    hash: await bcrypt.hash(secret, 10),
  };
}

export async function registerDevice({ id, name, locationId }) {
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  if (!location) {
    throw httpError(422, 'LOCATION_NOT_FOUND', 'locationId does not exist');
  }

  const existing = await prisma.device.findUnique({ where: { id } });
  if (existing) {
    throw httpError(409, 'DEVICE_EXISTS', 'Device id already exists');
  }

  const key = await generateApiKey();

  const device = await prisma.device.create({
    data: {
      id,
      name,
      locationId,
      status: 'PROVISIONED',
      apiKeyPrefix: key.prefix,
      apiKeyHash: key.hash,
    },
  });

  return { device: toPublicDevice(device), apiKey: key.secret };
}

export async function listDevices({ status, locationId, q, page = 1, limit = 20 }) {
  const where = { deletedAt: null };
  if (status) where.status = status;
  if (locationId) where.locationId = Number(locationId);
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.device.findMany({ where, skip, take: limit, orderBy: { id: 'asc' } }),
    prisma.device.count({ where }),
  ]);

  return { data: data.map(toPublicDevice), total, page, limit };
}

export async function getDevice(id) {
  const device = await prisma.device.findFirst({ where: { id, deletedAt: null } });
  if (!device) {
    throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }
  return toPublicDevice(device);
}

export async function updateDevice(id, { name, locationId }) {
  await getDevice(id);

  const data = {};
  if (name !== undefined) data.name = name;
  if (locationId !== undefined) {
    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) {
      throw httpError(422, 'LOCATION_NOT_FOUND', 'locationId does not exist');
    }
    data.locationId = locationId;
  }

  const device = await prisma.device.update({ where: { id }, data });
  return toPublicDevice(device);
}

export async function changeStatus(id, toStatus, reason) {
  const device = await getDevice(id);

  if (!VALID_STATUSES.includes(toStatus)) {
    throw httpError(422, 'VALIDATION_ERROR', `status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const fromStatus = device.status;
  const allowed = TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw httpError(422, 'INVALID_TRANSITION', `Cannot change status from ${fromStatus} to ${toStatus}`);
  }

  const [updated] = await prisma.$transaction([
    prisma.device.update({ where: { id }, data: { status: toStatus } }),
    prisma.deviceStatusHistory.create({
      data: { deviceId: id, fromStatus, toStatus, reason },
    }),
  ]);

  return toPublicDevice(updated);
}

export async function rotateCredential(id) {
  await getDevice(id);

  const key = await generateApiKey();
  const device = await prisma.device.update({
    where: { id },
    data: { apiKeyPrefix: key.prefix, apiKeyHash: key.hash },
  });

  return { device: toPublicDevice(device), apiKey: key.secret };
}

export async function softDeleteDevice(id) {
  await getDevice(id);
  await prisma.device.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getDeviceHealth(id) {
  const device = await prisma.device.findFirst({ where: { id, deletedAt: null } });
  if (!device) {
    throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  const now = Date.now();
  const lastSeenMs = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : null;
  const minutesSinceLastSeen = lastSeenMs === null ? null : Math.floor((now - lastSeenMs) / 60000);
  const online = minutesSinceLastSeen !== null && minutesSinceLastSeen <= 15;

  return {
    deviceId: device.id,
    status: device.status,
    online,
    lastSeenAt: device.lastSeenAt,
    minutesSinceLastSeen,
    lastBatteryV: device.lastBatteryV,
    lastRssi: device.lastRssi,
    lastFwVersion: device.lastFwVersion,
  };
}
