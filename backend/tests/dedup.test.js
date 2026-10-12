import { describe, it, expect } from 'vitest';
import { dedupReadings, dedupKey } from '../src/utils/dedup.js';

describe('dedupReadings', () => {
  const ts = new Date('2026-10-11T10:00:00Z');

  it('keeps one row per (deviceId, ts, sensorType)', () => {
    const rows = [
      { deviceId: 'A', ts, sensorType: 'temp_air', raw: 1 },
      { deviceId: 'A', ts, sensorType: 'temp_air', raw: 1 },
      { deviceId: 'A', ts, sensorType: 'humidity', raw: 2 },
      { deviceId: 'B', ts, sensorType: 'temp_air', raw: 3 },
    ];

    const { unique, duplicates } = dedupReadings(rows);

    expect(unique).toHaveLength(3);
    expect(duplicates).toHaveLength(1);
  });

  it('treats different timestamps as distinct', () => {
    const rows = [
      { deviceId: 'A', ts, sensorType: 'temp_air' },
      { deviceId: 'A', ts: new Date(ts.getTime() + 60000), sensorType: 'temp_air' },
    ];

    const { unique } = dedupReadings(rows);
    expect(unique).toHaveLength(2);
  });

  it('treats different devices as distinct', () => {
    const rows = [
      { deviceId: 'A', ts, sensorType: 'temp_air' },
      { deviceId: 'B', ts, sensorType: 'temp_air' },
    ];

    const { unique } = dedupReadings(rows);
    expect(unique).toHaveLength(2);
  });

  it('builds a stable key', () => {
    expect(dedupKey('A', ts, 'temp_air')).toBe(`A|${ts.getTime()}|temp_air`);
  });
});
