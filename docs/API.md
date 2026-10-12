# API Documentation

Base URL: `http://localhost:3001/api/v1`

Interactive docs (Swagger UI): `http://localhost:3001/api-docs`

## Authentication

Two separate mechanisms:

| Caller | Mechanism | Header |
|---|---|---|
| Dashboard / admin | JWT (from login) | `Authorization: Bearer <token>` |
| Device firmware | API key (from device register) | `X-Device-Key: <apiKey>` |

## Response envelope

Success (single object):
```json
{ "data": { }, "request_id": "uuid" }
```

Success (list):
```json
{ "data": [ ], "meta": { "page": 1, "limit": 20, "total": 1 }, "request_id": "uuid" }
```

Error (standard, consistent everywhere):
```json
{ "code": "MACHINE_READABLE_CODE", "message": "human readable", "request_id": "uuid", "details": [] }
```

`details` is optional and used for per-field validation errors.

## HTTP status codes used

`200`, `201`, `202`, `204`, `207`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`.

---

## 1. Auth

### POST /auth/register
```json
// request
{ "username": "nanda", "password": "secret123" }
// 201
{ "data": { "id": 1, "username": "nanda", "role": "admin" }, "request_id": "..." }
```

### POST /auth/login
```json
// request
{ "username": "nanda", "password": "secret123" }
// 200
{ "data": { "token": "eyJ...", "user": { "id": 1, "username": "nanda", "role": "admin" } }, "request_id": "..." }
```

## 2. Locations

### POST /locations
```json
// request
{ "name": "Stasiun Grogol", "latitude": -6.16, "longitude": 106.79, "altitude": 8 }
// 201
{ "data": { "id": 1, "name": "Stasiun Grogol", "latitude": -6.16, "longitude": 106.79, "altitude": 8 }, "request_id": "..." }
```

### GET /locations?page=1&limit=20
```json
{ "data": [ { "id": 1, "name": "Stasiun Grogol", "latitude": -6.16, "longitude": 106.79, "altitude": 8 } ], "meta": { "page": 1, "limit": 20, "total": 1 }, "request_id": "..." }
```

## 3. Devices

### POST /devices
The API key is returned **once**; only its hash is stored.
```json
// request
{ "id": "WS-GRT-001", "name": "Stasiun Grogol 1", "locationId": 1 }
// 201
{
  "data": {
    "device": { "id": "WS-GRT-001", "name": "Stasiun Grogol 1", "locationId": 1, "status": "PROVISIONED", "apiKeyPrefix": "257b90d2", "lastSeenAt": null, "deletedAt": null },
    "apiKey": "257b90d2104189f17ec72bbf660366729b583596e1100efc"
  },
  "request_id": "..."
}
```

### GET /devices?status=ACTIVE&location_id=1&q=grogol&page=1&limit=20
```json
{ "data": [ { "id": "WS-GRT-001", "name": "Stasiun Grogol 1", "status": "ACTIVE", "apiKeyPrefix": "257b90d2", "lastSeenAt": "2026-10-11T11:23:59.422Z" } ], "meta": { "page": 1, "limit": 20, "total": 1 }, "request_id": "..." }
```

### GET /devices/{id} — detail (same shape as one list item).

### PATCH /devices/{id}
Update fields, or change status (controlled transition; writes history).
```json
// update fields
{ "name": "Renamed", "locationId": 2 }
// change status
{ "status": "ACTIVE", "reason": "go live" }
// 422 on illegal transition
{ "code": "INVALID_TRANSITION", "message": "Cannot change status from ACTIVE to PROVISIONED", "request_id": "..." }
```

### DELETE /devices/{id} — soft delete. `204`. Device disappears from lists but history is kept.

### POST /devices/{id}/credentials/rotate
```json
{ "data": { "device": { "id": "WS-GRT-001", "apiKeyPrefix": "28fbbdd9" }, "apiKey": "28fbbdd9b69c55cb482dab19e2c19d92452272e841f388c2" }, "request_id": "..." }
```

### GET /devices/{id}/health
```json
{ "data": { "deviceId": "WS-HB-001", "status": "ACTIVE", "online": true, "lastSeenAt": "2026-10-11T08:55:53.462Z", "minutesSinceLastSeen": 0, "lastBatteryV": 3.9, "lastRssi": -70, "lastFwVersion": "1.4.2" }, "request_id": "..." }
```

## 4. Sensor types (master data)

### POST /sensor-types
```json
// request
{ "code": "temp_air", "displayName": "Air Temperature", "unit": "C", "minValid": -40, "maxValid": 60, "precision": 1 }
// 201
{ "data": { "code": "temp_air", "displayName": "Air Temperature", "unit": "C", "minValid": -40, "maxValid": 60, "precision": 1 }, "request_id": "..." }
```

### GET /sensor-types — list all types.

## 5. Sensors

### POST /sensors
```json
// request
{ "serialNumber": "SN-TEMP-001", "typeCode": "temp_air" }
// 201
{ "data": { "id": 1, "serialNumber": "SN-TEMP-001", "typeCode": "temp_air" }, "request_id": "..." }
```

### GET /sensors — list (with type included).
### GET /sensors/{id} — detail.
### PATCH /sensors/{id} — update `serialNumber` / `typeCode`.
### DELETE /sensors/{id} — `204`; `409` if it has installation history.

## 6. Sensor installation (device <-> sensor)

### POST /devices/{id}/sensors
```json
// request
{ "sensorId": 1, "installedAt": "2026-10-11T09:00:00.000Z" }
// 201
{ "data": { "id": 1, "sensorId": 1, "deviceId": "WS-HB-001", "installedAt": "2026-10-11T09:00:00.000Z", "removedAt": null }, "request_id": "..." }
```

### DELETE /devices/{id}/sensors/{sensorId}
Closes the installation (sets `removedAt`); a new install creates a new row. This is what keeps pre-move data linked to the old device.
```json
{ "data": { "id": 1, "sensorId": 1, "deviceId": "WS-HB-001", "installedAt": "...", "removedAt": "2026-10-11T09:04:03.416Z" }, "request_id": "..." }
```

## 7. Calibration

### POST /sensors/{id}/calibrations
Append-only; old calibrations are never changed.
```json
// request
{ "effectiveFrom": "2026-10-11T09:12:21.141Z", "offset": 0.5, "scale": 1.0, "reason": "field check" }
// 201
{ "data": { "id": 1, "sensorId": 1, "effectiveFrom": "2026-10-11T09:12:21.141Z", "offset": 0.5, "scale": 1, "reason": "field check" }, "request_id": "..." }
```

### GET /sensors/{id}/calibrations — full history.

## 8. Ingestion (called by devices)

### POST /ingest/heartbeat
```json
// request
{ "device_id": "WS-HB-001", "ts": 1757308920, "fw": "1.4.2", "battery_v": 3.90, "rssi": -70, "uptime_s": 864321 }
// 202
{ "data": { "device_id": "WS-HB-001", "accepted": true }, "request_id": "..." }
```

### POST /ingest/telemetry
```json
// request (F.1, must be accepted as-is)
{
  "device_id": "WS-GRT-001", "fw": "1.4.2", "ts": 1757308800, "seq": 10432, "battery_v": 3.92, "rssi": -71,
  "readings": [
    { "s": "temp_air", "v": 27.4 }, { "s": "humidity", "v": 82.1 },
    { "s": "pressure", "v": 1008.3 }, { "s": "wind_speed", "v": 3.2 },
    { "s": "wind_dir", "v": 217 }, { "s": "rain_counter", "v": 1043 },
    { "s": "solar_rad", "v": 512.7 }
  ]
}
// 201 success
{ "data": { "device_id": "WS-GRT-001", "accepted": 7, "duplicates": 0, "failed": [] }, "request_id": "..." }
// 201 idempotent (same payload again)
{ "data": { "device_id": "WS-GRT-001", "accepted": 0, "duplicates": 7, "failed": [] }, "request_id": "..." }
// 422 failed validation
{ "code": "VALIDATION_ERROR", "message": "Invalid telemetry payload", "request_id": "...", "details": [ { "field": "ts", "message": "must be a finite number (epoch seconds)" } ] }
```

### POST /ingest/telemetry/batch
```json
// request
{ "device_id": "WS-GRT-001", "fw": "1.4.2", "batch": [ { "ts": 1757308800, "seq": 10432, "battery_v": 3.92, "rssi": -71, "readings": [ { "s": "temp_air", "v": 27.4 } ] }, { "ts": 1757308860, "seq": 10433, "battery_v": 3.91, "rssi": -73, "readings": [ { "s": "temp_air", "v": 27.6 } ] } ] }
// 207 partial success
{ "data": { "device_id": "WS-GRT-001", "accepted": 3, "duplicates": 0, "failed": [ { "index": 1, "errors": [ { "sensorType": "solar_rad", "reason": "no sensor installed for this type at this time" } ] } ] }, "request_id": "..." }
// 413 too large
{ "code": "BATCH_TOO_LARGE", "message": "batch exceeds the 500 record limit", "request_id": "..." }
```

## 9. Readings (dashboard)

### GET /devices/{id}/readings/latest
```json
{ "data": { "deviceId": "WS-AGG-001", "status": "ACTIVE", "lastSeenAt": "...", "values": [ { "sensorType": "temp_air", "displayName": "Air Temperature", "unit": "C", "ts": "2026-10-11T10:00:30.000Z", "value": 40, "raw": 40, "flag": "GOOD" } ] }, "request_id": "..." }
```

### GET /readings?device_id=...&sensor_type=...&from=...&to=...&interval=raw|1m|1h|1d&agg=avg|min|max|sum
```json
{ "data": { "device_id": "WS-AGG-001", "sensor_type": "temp_air", "from": "...", "to": "...", "interval": "1h", "requested_interval": "raw", "agg": "avg", "count": 1, "next_cursor": "2026-10-11T10:00:00.000Z", "points": [ { "ts": "2026-10-11T10:00:00.000Z", "value": 30 } ] }, "request_id": "..." }
```

### GET /readings/summary?device_id=...&date=YYYY-MM-DD
```json
{ "data": { "deviceId": "WS-AGG-001", "date": "2026-10-11", "sensors": [ { "sensorType": "temp_air", "avg": 30, "min": 20, "max": 40, "sum": 90, "count": 3 }, { "sensorType": "rain_counter", "avg": 0, "min": 0, "max": 0, "sum": 1.2, "count": 3 } ] }, "request_id": "..." }
```

### GET /dashboard/overview
```json
{ "data": { "devices": [ { "id": "WS-AGG-001", "name": "Agg 1", "status": "ACTIVE", "online": true, "minutesSinceLastSeen": 0, "location": { "id": 1, "name": "Stasiun Grogol" }, "temp_air": 40, "humidity": null } ], "total": 1 }, "request_id": "..." }
```

## 10. Rate limiting

Ingestion endpoints are limited per `device_id`:
- single telemetry / heartbeat: **60 requests / minute**
- batch: **10 requests / minute**

Exceeded:
```json
// 429, header Retry-After: 60
{ "code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests from this device", "request_id": "..." }
```
