import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { httpError } from '../utils/httpError.js';

export async function deviceAuth(req, res, next) {
  const key = req.header('x-device-key');

  if (!key) {
    throw httpError(401, 'UNAUTHORIZED', 'Missing X-Device-Key header');
  }

  const prefix = key.slice(0, 8);
  const device = await prisma.device.findFirst({
    where: { apiKeyPrefix: prefix, deletedAt: null },
  });

  if (!device) {
    throw httpError(401, 'UNAUTHORIZED', 'Invalid device key');
  }

  const ok = await bcrypt.compare(key, device.apiKeyHash);
  if (!ok) {
    throw httpError(401, 'UNAUTHORIZED', 'Invalid device key');
  }

  if (device.status !== 'ACTIVE') {
    throw httpError(403, 'DEVICE_NOT_ACTIVE', `Device status is ${device.status}, must be ACTIVE to send data`);
  }

  req.device = device;
  next();
}
