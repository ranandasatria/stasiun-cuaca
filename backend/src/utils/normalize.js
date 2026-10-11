export function normalizeTelemetry(payload) {
  return {
    deviceId: payload.device_id,
    fw: payload.fw,
    ts: new Date(payload.ts * 1000),
    seq: payload.seq,
    batteryV: payload.battery_v,
    rssi: payload.rssi,
    readings: payload.readings.map((reading) => ({
      sensorType: String(reading.s).toLowerCase(),
      value: reading.v,
    })),
  };
}
