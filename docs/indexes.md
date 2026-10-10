# Index Notes (Part C)

Each index below exists for one query. The query is named so the reason is easy to check.

## sensor_readings

This table grows the fastest, about 184 million rows per year, so it gets three indexes.

- UNIQUE (device_id, ts, sensor_type): stops double saving. When the device sends the same report three times (for example after a failed ACK), the POST /ingest/telemetry endpoint keeps one row and drops the repeats.

- INDEX (device_id, ts DESC): serves the detail page charts. The temperature and humidity line chart (24 hours, 7 days) calls GET /api/v1/readings with a device id and a time range. This index takes all rows of that one device inside that range, newest first. The latest-value panel and the health check use it too.

- INDEX (sensor_id, ts DESC): serves background checks on one physical sensor unit. It answers two questions that the test itself asks. First, essay question 6 in part 5: how to detect a stuck sensor that keeps sending the same value for 6 hours. That check reads one sensor over a 6 hour window and counts how many different values appear. Second, design question 1 in part B: a temperature sensor moves from device A to device B on June 1st, and the old data must stay linked to device A. That proof reads every reading of that one sensor unit across both devices. No button in the UI calls this directly. It runs in jobs and audits.

Column order rule: the equality column goes first and the time column goes after, because an index is read from left to right.

## reading_aggregates

- UNIQUE (device_id, sensor_type, bucket_hour): keeps exactly one summary row per device, sensor type, and hour. The rollup job writes here, and the 7 day and 30 day charts read here through GET /api/v1/readings with interval 1h or 1d. No second index is added because chart ranges reuse this same one.

## devices

- INDEX (last_seen_at): serves the overview page. GET /api/v1/dashboard/overview asks which devices have been quiet for more than 15 minutes, and this index answers it without scanning the whole table.