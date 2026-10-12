import { describe, it, expect } from 'vitest';
import { rainMmFromCounters, MM_PER_TIP } from '../src/utils/rain.js';

describe('rainMmFromCounters', () => {
  it('returns 0 for empty or single reading', () => {
    expect(rainMmFromCounters([])).toBe(0);
    expect(rainMmFromCounters([5])).toBe(0);
  });

  it('converts normal increases (1 tip = 0.2 mm)', () => {
    expect(rainMmFromCounters([1043, 1045, 1048])).toBe(1.0);
  });

  it('handles one restart without going negative', () => {
    expect(rainMmFromCounters([1043, 1045, 2, 5])).toBe(1.4);
  });

  it('handles two restarts in one hour', () => {
    expect(rainMmFromCounters([1000, 1005, 3, 6, 1, 4])).toBe(3.0);
  });

  it('treats a drop to zero as a restart with zero new tips', () => {
    expect(rainMmFromCounters([1000, 0])).toBe(0);
    expect(rainMmFromCounters([1000, 0, 3])).toBe(0.6);
  });

  it('never returns a negative amount', () => {
    expect(rainMmFromCounters([1043, 5])).toBeGreaterThanOrEqual(0);
  });

  it('exposes the tip size', () => {
    expect(MM_PER_TIP).toBe(0.2);
  });
});
