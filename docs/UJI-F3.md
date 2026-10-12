# F.3 — Handling of the 8 Required Cases

Each case below: what the soal asks, how the system handles it, and the observed result.

The logic lives in:
- `src/utils/qualityFlag.js` — range / error / future timestamp flags
- `src/utils/dedup.js` — idempotency (in-payload) + `@@unique` (DB)
- `src/utils/rain.js` — rainfall conversion with restart handling
- `src/modules/ingest/ingest.service.js` — pipeline
- `src/middleware/deviceAuth.js` — device identity

---

## 1. Payload with `ts` in the future (device clock +2h)

**Asked:** reject or accept with a flag?

**Handled:** accepted and stored, but every reading gets `flag = FUTURE_TS`. Tolerance is +15 minutes (`qualityFlag`). Non-`GOOD` rows are excluded from aggregation, so a bad clock does not corrupt charts.

**Observed:** `POST /ingest/telemetry` with `ts = now + 7200` →
```
201 { "data": { "device_id": "WS-ING-001", "accepted": 1, "duplicates": 0, "failed": [] } }
```
DB row: `sensor_type=temp_air, raw=25, flag=FUTURE_TS`.

**Why accept, not reject:** data is still real (just mis-timed). Rejecting would force the device to buffer and retry forever. Flagging keeps the data auditable and out of aggregates.

## 2. `temp_air = -999` (sensor error code)

**Asked:** detection and handling.

**Handled:** `-999` is recognised as a sensor error. Stored with `flag = SENSOR_ERROR`, `corrected = null` (nothing to calibrate), excluded from aggregation.

**Observed (T29 test):** DB row `temp_air, raw=-999, corrected=(null), flag=SENSOR_ERROR`.

**Why store it:** the error pattern is useful (how often a sensor fails). Discarding it would hide hardware faults.

## 3. `humidity = 150` (outside 0–100)

**Asked:** quality flag.

**Handled:** value is compared against the sensor type's `minValid`/`maxValid` (0–100 for humidity). Out of range → `flag = OUT_OF_RANGE`. Stored with its corrected value; excluded from aggregation.

**Observed:** out-of-range values receive `OUT_OF_RANGE`; in-range values receive `GOOD`. (Unit-testable via `qualityFlag(150, {minValid:0, maxValid:100})` → `OUT_OF_RANGE`.)

**Why store it:** range violations indicate calibration drift or a failing sensor. Keep for analysis, keep out of averages.

## 4. `rain_counter` drops 1043 → 5 (device restart)

**Asked:** how to compute rain without going negative.

**Handled:** rainfall is a **delta between consecutive readings**, not `raw × 0.2`. When the counter decreases, it is treated as a restart and the delta becomes the **new value itself**, never a negative difference:
```js
if (curr >= prev) delta = curr - prev;
else              delta = curr;          // restart
```
Then `mm = sum(deltas) × 0.2`.

**Observed (T28):**
- `[1043,1045,1048]` → 1.0 mm
- `[1043,1045,2,5]` → 1.4 mm
- `[1000,1005,3,6,1,4]` (2 restarts in one hour) → 3.0 mm

For `1043 → 5`, the step contributes `5` tips (not `5 - 1043`). Never negative.

**Known limitation (documented honestly):** rain that fell between the last pre-restart reading and the actual restart moment cannot be recovered.

## 5. Same payload sent 3× (identical `device_id` + `ts`)

**Asked:** idempotency.

**Handled:** the DB unique key `@@unique([deviceId, ts, sensorType])` + `createMany({ skipDuplicates: true })`. In-payload duplicates are also removed by `dedupReadings` before insert. Re-sends report as `duplicates`, not errors.

**Observed (T29):** first send `accepted: 2`; identical second send `accepted: 0, duplicates: 2`.

**Why:** device retries after a lost ACK must not double-count rain or temperature.

## 6. `device_id` not registered

**Asked:** status code and response.

**Handled:** two layers.
- Authentication is by API key. An unregistered/invalid key → **401**:
  ```
  401 { "code": "UNAUTHORIZED", "message": "Invalid device key", "request_id": "..." }
  ```
- A valid key but a payload whose `device_id` differs from the authenticated device → **403** (prevents spoofing):
  ```
  403 { "code": "DEVICE_MISMATCH", "message": "device_id does not match the authenticated device", "request_id": "..." }
  ```

**Observed:** case 6a → 401; case 6b → 403.

## 7. `solar_rad` missing from `readings`

**Asked:** null or ignored?

**Handled:** **ignored**. Only sensors present in the payload produce rows. No row is written for `solar_rad` at that timestamp, and no `null` row is fabricated.

**Observed:** a reading set without `solar_rad` stores only the sensors that were sent; `GET /devices/:id/readings/latest` simply omits `solar_rad`.

**Why not null:** a `null` would be ambiguous between "sensor off" and "measured zero". Omitting is honest.

## 8. Batch containing 500 records

**Asked:** limit, chunking, transaction.

**Handled:**
- **Limit:** batches larger than 500 are rejected before processing → **413**:
  ```
  413 { "code": "BATCH_TOO_LARGE", "message": "batch exceeds the 500 record limit", "request_id": "..." }
  ```
- **Chunking:** the device is expected to chunk its buffered data; the server accepts up to 500 per call. Internally each batch item is inserted with one bulk `createMany` (a single multi-row INSERT), which is far cheaper than row-by-row.
- **Transaction:** each item's insert is atomic. A failing item is reported per index; the rest still succeed.
- **Response:** **207 Multi-Status**:
  ```
  207 { "data": { "accepted": 3, "duplicates": 0, "failed": [ { "index": 1, "errors": [ { "sensorType": "solar_rad", "reason": "no sensor installed for this type at this time" } ] } ] } }
  ```

**Observed:** batch of 2 items → 207 with accepted 3 and one failed item; batch of 501 → 413.

---

## Summary table

| # | Case | Behaviour | Flag / Code |
|---|---|---|---|
| 1 | ts in future | accept + flag, excluded from aggregates | `FUTURE_TS` |
| 2 | `-999` | accept + flag, `corrected=null` | `SENSOR_ERROR` |
| 3 | out of range | accept + flag | `OUT_OF_RANGE` |
| 4 | counter reset | delta uses new value, never negative | — |
| 5 | duplicate payload | stored once | `duplicates` count |
| 6 | unknown device | reject | `401` / `403 DEVICE_MISMATCH` |
| 7 | sensor missing | ignored (no row, no null) | — |
| 8 | batch 500 | accepted; >500 rejected | `207` / `413 BATCH_TOO_LARGE` |
