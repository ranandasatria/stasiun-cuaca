import prisma from '../../lib/prisma.js';
import { httpError } from '../../utils/httpError.js';
import { normalizeTelemetry } from '../../utils/normalize.js';
import { qualityFlag } from '../../utils/qualityFlag.js';
import { dedupReadings } from '../../utils/dedup.js';
import { applyCalibration } from '../../utils/calibration.js';
import { getActiveCalibration } from '../sensors/sensor.service.js';

export async function recordHeartbeat(device, { ts, fw, battery_v, rssi, uptime_s }) {
  const deviceTs = new Date(ts * 1000);
  const now = new Date();

  const [heartbeat] = await prisma.$transaction([
    prisma.deviceHeartbeat.create({
      data: {
        deviceId: device.id,
        ts: deviceTs,
        batteryV: battery_v,
        rssi,
        fwVersion: fw,
        uptimeS: uptime_s ?? null,
      },
    }),
    prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeenAt: now,
        lastBatteryV: battery_v,
        lastRssi: rssi,
        lastFwVersion: fw,
      },
    }),
  ]);

  return heartbeat;
}

async function buildRows(device, payload) {
  const normalized = normalizeTelemetry(payload);
  const ts = normalized.ts;

  const installations = await prisma.sensorInstallation.findMany({
    where: {
      deviceId: device.id,
      installedAt: { lte: ts },
      OR: [{ removedAt: null }, { removedAt: { gt: ts } }],
    },
    include: { sensor: { include: { type: true } } },
  });

  const sensorByType = {};
  for (const inst of installations) {
    sensorByType[inst.sensor.typeCode] = inst.sensor;
  }

  const rows = [];
  const failed = [];

  for (const reading of normalized.readings) {
    const sensor = sensorByType[reading.sensorType];
    if (!sensor) {
      failed.push({
        sensorType: reading.sensorType,
        reason: 'no sensor installed for this type at this time',
      });
      continue;
    }

    const flag = qualityFlag(reading.value, sensor.type, ts);

    let corrected = null;
    if (flag !== 'SENSOR_ERROR') {
      const cal = await getActiveCalibration(sensor.id, ts);
      corrected = applyCalibration(reading.value, cal.offset, cal.scale);
    }

    rows.push({
      deviceId: device.id,
      sensorId: sensor.id,
      sensorType: reading.sensorType,
      ts,
      raw: reading.value,
      corrected,
      flag,
    });
  }

  return { rows, failed };
}

async function saveRows(rows) {
  const { unique, duplicates } = dedupReadings(rows);

  let accepted = 0;
  if (unique.length > 0) {
    const result = await prisma.sensorReading.createMany({ data: unique, skipDuplicates: true });
    accepted = result.count;
  }

  return { accepted, duplicates: duplicates.length + (unique.length - accepted) };
}

export async function ingestSingle(device, payload) {
  const { rows, failed } = await buildRows(device, payload);
  const saved = await saveRows(rows);

  await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      lastBatteryV: payload.battery_v,
      lastRssi: payload.rssi,
      lastFwVersion: payload.fw,
    },
  });

  return {
    device_id: device.id,
    accepted: saved.accepted,
    duplicates: saved.duplicates,
    failed,
  };
}

export async function ingestBatch(device, payload) {
  const result = { device_id: device.id, accepted: 0, duplicates: 0, failed: [] };

  for (let i = 0; i < payload.batch.length; i++) {
    const item = payload.batch[i];

    try {
      const { rows, failed } = await buildRows(device, {
        ...item,
        device_id: device.id,
        fw: payload.fw,
      });

      const saved = await saveRows(rows);
      result.accepted += saved.accepted;
      result.duplicates += saved.duplicates;

      if (failed.length > 0) {
        result.failed.push({ index: i, errors: failed });
      }
    } catch (err) {
      result.failed.push({ index: i, errors: [{ message: err.message }] });
    }
  }

  const last = payload.batch[payload.batch.length - 1];
  await prisma.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      lastBatteryV: last?.battery_v ?? device.lastBatteryV,
      lastRssi: last?.rssi ?? device.lastRssi,
      lastFwVersion: payload.fw,
    },
  });

  return result;
}
