const SENSOR_ERROR_VALUE = -999;
const FUTURE_TOLERANCE_MS = 15 * 60 * 1000;

export function qualityFlag(value, { minValid, maxValid } = {}, ts = null, now = new Date()) {
  if (value === SENSOR_ERROR_VALUE) {
    return 'SENSOR_ERROR';
  }

  if (ts && ts.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    return 'FUTURE_TS';
  }

  if (minValid !== undefined && value < minValid) {
    return 'OUT_OF_RANGE';
  }

  if (maxValid !== undefined && value > maxValid) {
    return 'OUT_OF_RANGE';
  }

  return 'GOOD';
}
