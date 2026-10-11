export function dedupKey(deviceId, ts, sensorType) {
  return `${deviceId}|${ts.getTime()}|${sensorType}`;
}

export function dedupReadings(rows) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];

  for (const row of rows) {
    const key = dedupKey(row.deviceId, row.ts, row.sensorType);
    if (seen.has(key)) {
      duplicates.push(row);
    } else {
      seen.add(key);
      unique.push(row);
    }
  }

  return { unique, duplicates };
}
