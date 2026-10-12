import { describe, it, expect } from 'vitest';
import { qualityFlag } from '../src/utils/qualityFlag.js';

describe('qualityFlag', () => {
  const range = { minValid: -40, maxValid: 60 };

  it('flags the sensor error code', () => {
    expect(qualityFlag(-999, range)).toBe('SENSOR_ERROR');
  });

  it('flags values below the minimum', () => {
    expect(qualityFlag(-100, range)).toBe('OUT_OF_RANGE');
  });

  it('flags values above the maximum', () => {
    expect(qualityFlag(100, range)).toBe('OUT_OF_RANGE');
    expect(qualityFlag(150, { minValid: 0, maxValid: 100 })).toBe('OUT_OF_RANGE');
  });

  it('flags a future timestamp beyond tolerance', () => {
    const now = new Date('2026-10-11T10:00:00Z');
    const future = new Date('2026-10-11T12:00:00Z');
    expect(qualityFlag(25, range, future, now)).toBe('FUTURE_TS');
  });

  it('accepts a timestamp within tolerance', () => {
    const now = new Date('2026-10-11T10:00:00Z');
    const soon = new Date('2026-10-11T10:05:00Z');
    expect(qualityFlag(25, range, soon, now)).toBe('GOOD');
  });

  it('accepts a good value', () => {
    expect(qualityFlag(27.4, range)).toBe('GOOD');
  });

  it('gives sensor error precedence over range', () => {
    expect(qualityFlag(-999, { minValid: -1000, maxValid: 1000 })).toBe('SENSOR_ERROR');
  });
});
