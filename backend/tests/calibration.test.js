import { describe, it, expect } from 'vitest';
import { applyCalibration } from '../src/utils/calibration.js';

describe('applyCalibration', () => {
  it('applies (raw + offset) * scale', () => {
    expect(applyCalibration(27.4, 0.5, 1.0)).toBeCloseTo(27.9);
    expect(applyCalibration(10, 0, 2)).toBe(20);
    expect(applyCalibration(10, -2, 2)).toBe(16);
  });

  it('is the identity when offset 0 and scale 1', () => {
    expect(applyCalibration(27.4, 0, 1)).toBe(27.4);
  });

  it('defaults to identity with no arguments', () => {
    expect(applyCalibration(27.4)).toBe(27.4);
  });
});
