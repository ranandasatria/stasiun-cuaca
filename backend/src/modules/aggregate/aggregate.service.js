import prisma from '../../lib/prisma.js';
import { rainMmFromCounters } from '../../utils/rain.js';

const HOUR_MS = 3600 * 1000;

function startOfHour(date) {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d;
}

async function upsertAggregate(deviceId, sensorType, bucketHour, values) {
  return prisma.readingAggregate.upsert({
    where: {
      deviceId_sensorType_bucketHour: { deviceId, sensorType, bucketHour },
    },
    create: { deviceId, sensorType, bucketHour, ...values },
    update: values,
  });
}

async function rollupNormalHour(deviceId, sensorType, from, to) {
  const rows = await prisma.sensorReading.findMany({
    where: { deviceId, sensorType, ts: { gte: from, lt: to }, flag: 'GOOD' },
    select: { corrected: true },
  });

  const values = rows.map((r) => r.corrected).filter((v) => v !== null);
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return upsertAggregate(deviceId, sensorType, from, {
    avg,
    min,
    max,
    sum,
    count: values.length,
  });
}

async function rollupRainHour(deviceId, sensorType, from, to) {
  const anchor = await prisma.sensorReading.findFirst({
    where: { deviceId, sensorType, ts: { lt: from }, flag: 'GOOD' },
    orderBy: { ts: 'desc' },
    select: { raw: true },
  });

  const rows = await prisma.sensorReading.findMany({
    where: { deviceId, sensorType, ts: { gte: from, lt: to }, flag: 'GOOD' },
    orderBy: { ts: 'asc' },
    select: { raw: true },
  });

  if (rows.length === 0) {
    return null;
  }

  const counters = anchor ? [anchor.raw, ...rows.map((r) => r.raw)] : rows.map((r) => r.raw);
  const mm = rainMmFromCounters(counters);

  return upsertAggregate(deviceId, sensorType, from, {
    avg: 0,
    min: 0,
    max: 0,
    sum: mm,
    count: rows.length,
  });
}

export async function rollupHour(deviceId, sensorType, bucketHour) {
  const from = startOfHour(bucketHour);
  const to = new Date(from.getTime() + HOUR_MS);

  if (sensorType === 'rain_counter') {
    return rollupRainHour(deviceId, sensorType, from, to);
  }

  return rollupNormalHour(deviceId, sensorType, from, to);
}

export async function rollupRange(deviceId, fromTs, toTs) {
  const start = startOfHour(fromTs);
  const end = new Date(toTs);

  const distinct = await prisma.sensorReading.findMany({
    where: { deviceId, ts: { gte: start, lt: end } },
    distinct: ['sensorType'],
    select: { sensorType: true },
  });

  let count = 0;
  for (const { sensorType } of distinct) {
    for (let h = new Date(start); h < end; h = new Date(h.getTime() + HOUR_MS)) {
      const result = await rollupHour(deviceId, sensorType, h);
      if (result) count++;
    }
  }

  return count;
}

export async function rollupRecent(hoursBack = 1) {
  const currentHour = startOfHour(new Date());
  const from = new Date(currentHour.getTime() - hoursBack * HOUR_MS);
  const to = new Date(currentHour.getTime() + HOUR_MS);

  const devices = await prisma.device.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  let total = 0;
  for (const device of devices) {
    total += await rollupRange(device.id, from, to);
  }

  return total;
}
