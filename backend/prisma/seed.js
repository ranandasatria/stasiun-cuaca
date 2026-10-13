import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const here = dirname(fileURLToPath(import.meta.url));

const SENSOR_TYPES = [
  { code: 'temp_air', displayName: 'Air Temperature', unit: 'C', minValid: -40, maxValid: 60, precision: 1 },
  { code: 'humidity', displayName: 'Humidity', unit: '%', minValid: 0, maxValid: 100, precision: 1 },
  { code: 'pressure', displayName: 'Pressure', unit: 'hPa', minValid: 800, maxValid: 1100, precision: 1 },
  { code: 'wind_speed', displayName: 'Wind Speed', unit: 'm/s', minValid: 0, maxValid: 100, precision: 1 },
  { code: 'wind_dir', displayName: 'Wind Direction', unit: 'deg', minValid: 0, maxValid: 359, precision: 0 },
  { code: 'rain_counter', displayName: 'Rain Counter', unit: 'tips', minValid: 0, maxValid: 1000000, precision: 0 },
  { code: 'solar_rad', displayName: 'Solar Radiation', unit: 'W/m2', minValid: 0, maxValid: 1500, precision: 1 },
];

const LOCATIONS = [
  { name: 'Stasiun Grogol', latitude: -6.16, longitude: 106.79, altitude: 8 },
  { name: 'Stasiun Bandung', latitude: -6.91, longitude: 107.61, altitude: 768 },
  { name: 'Stasiun Surabaya', latitude: -7.25, longitude: 112.75, altitude: 5 },
];

// Fixed API keys for development only (production devices get random keys).
const DEVICES = [
  { id: 'WS-GRT-001', name: 'Grogol Station', locationIndex: 0, apiKey: 'devkey-grt-001' },
  { id: 'WS-BDG-001', name: 'Bandung Station', locationIndex: 1, apiKey: 'devkey-bdg-001' },
  { id: 'WS-SBY-001', name: 'Surabaya Station', locationIndex: 2, apiKey: 'devkey-sby-001' },
];

// One value per hour of the day (index 0 = 00:00 UTC).
const TEMP_BY_HOUR = [24, 23, 23, 24, 25, 27, 29, 30, 31, 32, 33, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 24, 24, 24];
const HUM_BY_HOUR = [85, 86, 86, 85, 83, 80, 76, 72, 68, 65, 62, 60, 61, 63, 66, 70, 74, 78, 81, 83, 84, 85, 85, 85];
const PRESS_BY_HOUR = [1010, 1010, 1009, 1009, 1010, 1010, 1011, 1011, 1012, 1012, 1011, 1011, 1010, 1010, 1009, 1009, 1010, 1010, 1011, 1011, 1010, 1010, 1010, 1010];
const WSPD_BY_HOUR = [1, 1, 2, 2, 3, 3, 4, 5, 6, 6, 5, 4, 4, 5, 6, 5, 4, 3, 3, 2, 2, 1, 1, 1];
const WDIR_BY_HOUR = [200, 210, 210, 220, 220, 230, 230, 240, 240, 250, 250, 240, 230, 230, 220, 220, 210, 210, 200, 200, 190, 190, 200, 200];
const SOLAR_BY_HOUR = [0, 0, 0, 0, 0, 10, 80, 200, 380, 560, 700, 780, 760, 600, 420, 240, 90, 10, 0, 0, 0, 0, 0, 0];
const RAIN_BY_HOUR = [0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 0];

const SLOT_OFFSET = [0, 0.2, 0.4, 0.2];
const DAYS = 7;
const STEP_MS = 15 * 60 * 1000;
const MM_PER_TIP = 0.2;

function baseValue(sensorType, hour) {
  if (sensorType === 'temp_air') return TEMP_BY_HOUR[hour];
  if (sensorType === 'humidity') return HUM_BY_HOUR[hour];
  if (sensorType === 'pressure') return PRESS_BY_HOUR[hour];
  if (sensorType === 'wind_speed') return WSPD_BY_HOUR[hour];
  if (sensorType === 'wind_dir') return WDIR_BY_HOUR[hour];
  if (sensorType === 'solar_rad') return SOLAR_BY_HOUR[hour];
  return 0;
}

async function main() {
  const locationIds = [];
  for (const loc of LOCATIONS) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    const row = existing
      ? await prisma.location.update({ where: { id: existing.id }, data: loc })
      : await prisma.location.create({ data: loc });
    locationIds.push(row.id);
  }

  for (const type of SENSOR_TYPES) {
    await prisma.sensorType.upsert({ where: { code: type.code }, create: type, update: type });
  }

  const deviceKeys = {};

  for (const dev of DEVICES) {
    const apiKeyHash = await bcrypt.hash(dev.apiKey, 10);
    deviceKeys[dev.id] = dev.apiKey;

    const device = await prisma.device.upsert({
      where: { id: dev.id },
      create: {
        id: dev.id,
        name: dev.name,
        locationId: locationIds[dev.locationIndex],
        status: 'ACTIVE',
        apiKeyPrefix: dev.apiKey.slice(0, 8),
        apiKeyHash,
      },
      update: {
        name: dev.name,
        locationId: locationIds[dev.locationIndex],
        status: 'ACTIVE',
        apiKeyPrefix: dev.apiKey.slice(0, 8),
        apiKeyHash,
        deletedAt: null,
      },
    });

    const sensorId = {};
    for (const type of SENSOR_TYPES) {
      const serialNumber = `SN-${dev.id}-${type.code}`;
      const sensor = await prisma.sensor.upsert({
        where: { serialNumber },
        create: { serialNumber, typeCode: type.code },
        update: { typeCode: type.code },
      });
      sensorId[type.code] = sensor.id;

      const active = await prisma.sensorInstallation.findFirst({
        where: { sensorId: sensor.id, deviceId: device.id, removedAt: null },
      });
      if (!active) {
        await prisma.sensorInstallation.create({
          data: { sensorId: sensor.id, deviceId: device.id, installedAt: new Date(Date.now() - DAYS * 86400000) },
        });
      }
    }

    await prisma.sensorReading.deleteMany({ where: { deviceId: device.id } });
    await prisma.readingAggregate.deleteMany({ where: { deviceId: device.id } });
    await prisma.deviceHeartbeat.deleteMany({ where: { deviceId: device.id } });

    const end = new Date();
    end.setUTCSeconds(0, 0);
    end.setUTCMinutes(Math.floor(end.getUTCMinutes() / 15) * 15);
    const start = new Date(end.getTime() - DAYS * 86400000);

    const readings = [];
    const agg = {};
    let rainCounter = 1000;

    for (let t = new Date(start); t <= end; t = new Date(t.getTime() + STEP_MS)) {
      const hour = t.getUTCHours();
      const slot = Math.floor(t.getUTCMinutes() / 15);
      if (slot === 0) rainCounter += RAIN_BY_HOUR[hour];

      const bucket = new Date(t);
      bucket.setUTCMinutes(0, 0, 0);

      for (const type of SENSOR_TYPES) {
        const value =
          type.code === 'rain_counter' ? rainCounter : baseValue(type.code, hour) + SLOT_OFFSET[slot];

        readings.push({
          deviceId: device.id,
          sensorId: sensorId[type.code],
          sensorType: type.code,
          ts: new Date(t),
          raw: value,
          corrected: value,
          flag: 'GOOD',
        });

        const key = `${type.code}|${bucket.getTime()}`;
        if (type.code === 'rain_counter') {
          const g = agg[key] ?? { sensorType: 'rain_counter', bucket, sum: 0, count: 0 };
          g.sum += RAIN_BY_HOUR[hour] * MM_PER_TIP;
          g.count += 1;
          agg[key] = g;
        } else {
          const g = agg[key] ?? { sensorType: type.code, bucket, values: [] };
          g.values.push(value);
          agg[key] = g;
        }
      }
    }

    const aggregates = Object.values(agg).map((g) => {
      if (g.sensorType === 'rain_counter') {
        return { deviceId: device.id, sensorType: 'rain_counter', bucketHour: g.bucket, avg: 0, min: 0, max: 0, sum: g.sum, count: g.count };
      }
      const sum = g.values.reduce((a, b) => a + b, 0);
      return {
        deviceId: device.id,
        sensorType: g.sensorType,
        bucketHour: g.bucket,
        avg: sum / g.values.length,
        min: Math.min(...g.values),
        max: Math.max(...g.values),
        sum,
        count: g.values.length,
      };
    });

    for (let i = 0; i < readings.length; i += 1000) {
      await prisma.sensorReading.createMany({ data: readings.slice(i, i + 1000), skipDuplicates: true });
    }
    await prisma.readingAggregate.createMany({ data: aggregates });

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date(), lastBatteryV: 3.9, lastRssi: -70, lastFwVersion: '1.4.2' },
    });

    console.log(`  ${dev.id}: ${readings.length} readings, ${aggregates.length} aggregates`);
  }

  const outPath = resolve(here, '../../simulator/devices.dev.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(deviceKeys, null, 2));
  console.log('Seed done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
