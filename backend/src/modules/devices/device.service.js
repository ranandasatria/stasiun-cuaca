import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js';

function toPublicDevice(device) {
  const { apiKeyHash, ...rest } = device;
  return rest;
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

  const secret = randomBytes(24).toString('hex');
  const apiKeyPrefix = secret.slice(0, 8);
  const apiKeyHash = await bcrypt.hash(secret, 10);

  const device = await prisma.device.create({
    data: {
      id,
      name,
      locationId,
      status: 'PROVISIONED',
      apiKeyPrefix,
      apiKeyHash,
    },
  });

  return { device: toPublicDevice(device), apiKey: secret };
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

export async function softDeleteDevice(id) {
  await getDevice(id);
  await prisma.device.update({ where: { id }, data: { deletedAt: new Date() } });
}
