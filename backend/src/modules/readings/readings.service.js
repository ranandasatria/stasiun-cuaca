import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js';

const MAX_POINTS = 1000;
const INTERVAL_ORDER = ['raw', '1m', '1h', '1d'];
const INTERVAL_MS = { raw: 60000, '1m': 60000, '1h': 3600000, '1d': 86400000 };
const AGG_SQL = { avg: 'AVG', min: 'MIN', max: 'MAX', sum: 'SUM' };
const AGG_COL = { avg: 'AVG(avg)', min: 'MIN(min)', max: 'MAX(max)', sum: 'SUM(sum)' };

function startOfDay(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function chooseInterval(rangeMs, requested) {
  let idx = INTERVAL_ORDER.indexOf(requested);
  if (idx < 0) idx = 0;
  while (idx < INTERVAL_ORDER.length - 1 && rangeMs / INTERVAL_MS[INTERVAL_ORDER[idx]] > MAX_POINTS) {
    idx += 1;
  }
  return INTERVAL_ORDER[idx];
}

export async function getLatest(deviceId) {
  const device = await prisma.device.findFirst({ where: { id: deviceId, deletedAt: null } });
  if (!device) {
    throw httpError(404, 'DEVICE_NOT_FOUND', 'Device not found');
  }

  const readings = await prisma.sensorReading.findMany({
    where: { deviceId },
    distinct: ['sensorType'],
    orderBy: [{ sensorType: 'asc' }, { ts: 'desc' }],
    select: { sensorType: true, ts: true, raw: true, corrected: true, flag: true },
  });

  const types = await prisma.sensorType.findMany();
  const typeMap = Object.fromEntries(types.map((t) => [t.code, t]));

  const values = readings.map((r) => ({
    sensorType: r.sensorType,
    displayName: typeMap[r.sensorType]?.displayName ?? r.sensorType,
    unit: typeMap[r.sensorType]?.unit ?? null,
    ts: r.ts,
    value: r.corrected ?? r.raw,
    raw: r.raw,
    flag: r.flag,
  }));

  return {
    deviceId,
    status: device.status,
    lastSeenAt: device.lastSeenAt,
    values,
  };
}

async function getRawPoints(deviceId, sensorType, fromDate, toDate, interval) {
  if (interval === 'raw') {
    const rows = await prisma.sensorReading.findMany({
      where: { deviceId, sensorType, ts: { gte: fromDate, lt: toDate }, flag: 'GOOD' },
      orderBy: { ts: 'asc' },
      select: { ts: true, corrected: true },
      take: MAX_POINTS,
    });
    return rows.map((r) => ({ ts: r.ts, value: r.corrected }));
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT date_trunc('minute', ts) AS bucket, AVG(corrected)::float8 AS value
     FROM sensor_readings
     WHERE device_id = $1 AND sensor_type = $2 AND ts >= $3 AND ts < $4 AND flag = 'GOOD'
     GROUP BY bucket ORDER BY bucket ASC LIMIT ${MAX_POINTS}`,
    deviceId,
    sensorType,
    fromDate,
    toDate,
  );
  return rows.map((r) => ({ ts: r.bucket, value: r.value }));
}

async function getAggregatePoints(deviceId, sensorType, fromDate, toDate, interval, agg) {
  if (interval === '1h') {
    const rows = await prisma.readingAggregate.findMany({
      where: { deviceId, sensorType, bucketHour: { gte: fromDate, lt: toDate } },
      orderBy: { bucketHour: 'asc' },
      take: MAX_POINTS,
    });
    return rows.map((r) => ({ ts: r.bucketHour, value: r[agg] }));
  }

  const aggCol = AGG_COL[agg] || AGG_COL.avg;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT date_trunc('day', bucket_hour) AS bucket, ${aggCol}::float8 AS value
     FROM reading_aggregates
     WHERE device_id = $1 AND sensor_type = $2 AND bucket_hour >= $3 AND bucket_hour < $4
     GROUP BY bucket ORDER BY bucket ASC LIMIT ${MAX_POINTS}`,
    deviceId,
    sensorType,
    fromDate,
    toDate,
  );
  return rows.map((r) => ({ ts: r.bucket, value: r.value }));
}

export async function getReadings({ deviceId, sensorType, from, to, interval = 'raw', agg = 'avg' }) {
  if (!deviceId || !sensorType || !from || !to) {
    throw httpError(422, 'VALIDATION_ERROR', 'device_id, sensor_type, from and to are required');
  }
  if (!AGG_SQL[agg]) {
    throw httpError(422, 'VALIDATION_ERROR', `agg must be one of: ${Object.keys(AGG_SQL).join(', ')}`);
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw httpError(422, 'VALIDATION_ERROR', 'from and to must be valid dates');
  }
  if (fromDate >= toDate) {
    throw httpError(422, 'VALIDATION_ERROR', 'from must be earlier than to');
  }

  const rangeMs = toDate.getTime() - fromDate.getTime();
  const effectiveInterval = chooseInterval(rangeMs, interval);

  const points = ['raw', '1m'].includes(effectiveInterval)
    ? await getRawPoints(deviceId, sensorType, fromDate, toDate, effectiveInterval)
    : await getAggregatePoints(deviceId, sensorType, fromDate, toDate, effectiveInterval, agg);

  return {
    device_id: deviceId,
    sensor_type: sensorType,
    from: fromDate,
    to: toDate,
    interval: effectiveInterval,
    requested_interval: interval,
    agg,
    count: points.length,
    next_cursor: points.length > 0 ? points[points.length - 1].ts : null,
    points,
  };
}

export async function getSummary({ deviceId, date }) {
  if (!deviceId) {
    throw httpError(422, 'VALIDATION_ERROR', 'device_id is required');
  }

  const dayStart = startOfDay(date ? new Date(date) : new Date());
  const dayEnd = new Date(dayStart.getTime() + 86400000);

  const rows = await prisma.readingAggregate.findMany({
    where: { deviceId, bucketHour: { gte: dayStart, lt: dayEnd } },
    orderBy: { bucketHour: 'asc' },
  });

  const byType = {};
  for (const r of rows) {
    const g = byType[r.sensorType] ?? { avgs: [], mins: [], maxs: [], sum: 0, count: 0 };
    g.avgs.push(r.avg);
    g.mins.push(r.min);
    g.maxs.push(r.max);
    g.sum += r.sum;
    g.count += r.count;
    byType[r.sensorType] = g;
  }

  const sensors = Object.entries(byType).map(([sensorType, g]) => ({
    sensorType,
    avg: g.avgs.reduce((a, b) => a + b, 0) / g.avgs.length,
    min: Math.min(...g.mins),
    max: Math.max(...g.maxs),
    sum: g.sum,
    count: g.count,
  }));

  return { deviceId, date: dayStart.toISOString().slice(0, 10), sensors };
}

export async function getOverview() {
  const devices = await prisma.device.findMany({
    where: { deletedAt: null },
    include: { location: true },
    orderBy: { id: 'asc' },
  });

  const latest = await prisma.sensorReading.findMany({
    where: { sensorType: { in: ['temp_air', 'humidity'] } },
    distinct: ['deviceId', 'sensorType'],
    orderBy: [{ deviceId: 'asc' }, { sensorType: 'asc' }, { ts: 'desc' }],
    select: { deviceId: true, sensorType: true, corrected: true, ts: true },
  });

  const latestMap = {};
  for (const r of latest) {
    latestMap[`${r.deviceId}|${r.sensorType}`] = r;
  }

  const now = Date.now();
  const result = devices.map((d) => {
    const minutesSinceLastSeen = d.lastSeenAt
      ? Math.floor((now - new Date(d.lastSeenAt).getTime()) / 60000)
      : null;

    return {
      id: d.id,
      name: d.name,
      status: d.status,
      online: minutesSinceLastSeen !== null && minutesSinceLastSeen <= 15,
      minutesSinceLastSeen,
      lastSeenAt: d.lastSeenAt,
      location: d.location ? { id: d.location.id, name: d.location.name } : null,
      temp_air: latestMap[`${d.id}|temp_air`]?.corrected ?? null,
      humidity: latestMap[`${d.id}|humidity`]?.corrected ?? null,
    };
  });

  return { devices: result, total: result.length };
}
