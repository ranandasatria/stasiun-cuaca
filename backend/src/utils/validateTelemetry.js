export function validateTelemetry(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    errors.push({ field: 'body', message: 'must be a JSON object' });
    return errors;
  }

  if (typeof payload.device_id !== 'string' || payload.device_id.length === 0) {
    errors.push({ field: 'device_id', message: 'must be a non-empty string' });
  }

  if (typeof payload.fw !== 'string' || payload.fw.length === 0) {
    errors.push({ field: 'fw', message: 'must be a non-empty string' });
  }

  if (typeof payload.ts !== 'number' || !Number.isFinite(payload.ts)) {
    errors.push({ field: 'ts', message: 'must be a finite number (epoch seconds)' });
  }

  if (typeof payload.seq !== 'number' || !Number.isInteger(payload.seq)) {
    errors.push({ field: 'seq', message: 'must be an integer' });
  }

  if (!Array.isArray(payload.readings)) {
    errors.push({ field: 'readings', message: 'must be an array' });
  } else {
    payload.readings.forEach((reading, i) => {
      if (!reading || typeof reading !== 'object') {
        errors.push({ field: `readings[${i}]`, message: 'must be an object' });
        return;
      }
      if (typeof reading.s !== 'string' || reading.s.length === 0) {
        errors.push({ field: `readings[${i}].s`, message: 'must be a non-empty string' });
      }
      if (typeof reading.v !== 'number' || !Number.isFinite(reading.v)) {
        errors.push({ field: `readings[${i}].v`, message: 'must be a finite number' });
      }
    });
  }

  return errors;
}
