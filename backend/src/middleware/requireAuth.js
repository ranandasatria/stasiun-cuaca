import jwt from 'jsonwebtoken';
import { httpError } from '../utils/httpError.js';

export function requireAuth(req, res, next) {
  const header = req.header('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw httpError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw httpError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  next();
}
