import { createLocation, listLocations } from './location.service.js';
import { httpError } from '../../utils/httpError.js';

export async function postLocation(req, res) {
  const { name, latitude, longitude, altitude } = req.body;

  if (!name || latitude === undefined || longitude === undefined || altitude === undefined) {
    throw httpError(422, 'VALIDATION_ERROR', 'name, latitude, longitude, altitude are required');
  }

  const location = await createLocation({ name, latitude, longitude, altitude });
  res.status(201).json({ data: location, request_id: req.id });
}

export async function getLocations(req, res) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const { data, total } = await listLocations({ page, limit });
  res.json({ data, meta: { page, limit, total }, request_id: req.id });
}
