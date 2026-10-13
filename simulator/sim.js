import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL || 'http://localhost:3001/api/v1';
const fast = process.argv.includes('--fast');
const once = process.argv.includes('--once');
const scenarioArg = process.argv.find((a) => a.startsWith('--scenario='));
const scenario = scenarioArg ? scenarioArg.split('=')[1] : 'normal';
const INTERVAL_MS = fast ? 5000 : 60000;

let keys;
try {
  keys = JSON.parse(readFileSync(resolve(here, 'devices.dev.json'), 'utf8'));
} catch {
  console.error('devices.dev.json not found. Run the seeder first: cd backend && npx prisma db seed');
  process.exit(1);
}

const deviceIds = Object.keys(keys);

// One value per hour of the day (index 0 = 00:00 UTC).
const TEMP_BY_HOUR = [24, 23, 23, 24, 25, 27, 29, 30, 31, 32, 33, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 24, 24, 24];
const HUM_BY_HOUR = [85, 86, 86, 85, 83, 80, 76, 72, 68, 65, 62, 60, 61, 63, 66, 70, 74, 78, 81, 83, 84, 85, 85, 85];
const SOLAR_BY_HOUR = [0, 0, 0, 0, 0, 10, 80, 200, 380, 560, 700, 780, 760, 600, 420, 240, 90, 10, 0, 0, 0, 0, 0, 0];

const state = {};
for (const id of deviceIds) {
  state[id] = { seq: 0, rain: 1000 };
}

function buildItem(id, ts) {
  const s = state[id];
  const hour = new Date(ts * 1000).getUTCHours();

  s.seq += 1;
  s.rain += 1;

  return {
    ts,
    seq: s.seq,
    battery_v: 3.9,
    rssi: -70,
    readings: [
      { s: 'temp_air', v: TEMP_BY_HOUR[hour] },
      { s: 'humidity', v: HUM_BY_HOUR[hour] },
      { s: 'pressure', v: 1010 },
      { s: 'wind_speed', v: 3 },
      { s: 'wind_dir', v: 200 },
      { s: 'rain_counter', v: s.rain },
      { s: 'solar_rad', v: SOLAR_BY_HOUR[hour] },
    ],
  };
}

async function send(path, id, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'X-Device-Key': keys[id], 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function runNormal(now) {
  for (const id of deviceIds) {
    const item = buildItem(id, now);
    const r = await send('/ingest/telemetry', id, { device_id: id, fw: '1.4.2', ...item });
    console.log(`[normal] ${id} -> ${r.status}`, JSON.stringify(r.body?.data));
  }
}

async function runBatch(now) {
  for (const id of deviceIds) {
    const items = [];
    for (let i = 6; i >= 1; i -= 1) {
      items.push(buildItem(id, now - i * 60));
    }
    const r = await send('/ingest/telemetry/batch', id, { device_id: id, fw: '1.4.2', batch: items });
    console.log(`[batch] ${id} (${items.length} buffered) -> ${r.status}`, JSON.stringify(r.body?.data));
  }
}

async function runDuplicate(now) {
  for (const id of deviceIds) {
    const item = buildItem(id, now);
    for (let k = 1; k <= 3; k += 1) {
      const r = await send('/ingest/telemetry', id, { device_id: id, fw: '1.4.2', ...item });
      console.log(`[duplicate#${k}] ${id} -> ${r.status}`, JSON.stringify(r.body?.data));
    }
  }
}

async function tick() {
  const now = Math.floor(Date.now() / 1000);
  if (scenario === 'batch') return runBatch(now);
  if (scenario === 'duplicate') return runDuplicate(now);
  return runNormal(now);
}

async function main() {
  console.log(`Simulator: ${deviceIds.length} devices | scenario=${scenario} | interval=${INTERVAL_MS}ms | api=${API}`);
  await tick();
  if (once) return;
  setInterval(() => {
    tick().catch((err) => console.error('tick failed:', err.message));
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
