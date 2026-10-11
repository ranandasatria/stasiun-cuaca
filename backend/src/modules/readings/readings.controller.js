import { getReadings, getSummary, getLatest, getOverview } from './readings.service.js';

export async function getReadingsHandler(req, res) {
  const { device_id, sensor_type, from, to, interval, agg } = req.query;

  const data = await getReadings({
    deviceId: device_id,
    sensorType: sensor_type,
    from,
    to,
    interval,
    agg,
  });

  res.json({ data, request_id: req.id });
}

export async function getSummaryHandler(req, res) {
  const { device_id, date } = req.query;
  const data = await getSummary({ deviceId: device_id, date });
  res.json({ data, request_id: req.id });
}

export async function getLatestHandler(req, res) {
  const data = await getLatest(req.params.id);
  res.json({ data, request_id: req.id });
}

export async function getOverviewHandler(req, res) {
  const data = await getOverview();
  res.json({ data, request_id: req.id });
}
