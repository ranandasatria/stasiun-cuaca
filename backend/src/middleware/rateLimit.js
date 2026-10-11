import { rateLimit } from 'express-rate-limit';

function makeLimiter({ limit, windowMs }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.device?.id ?? 'unknown',
    handler: (req, res) => {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this device',
        request_id: req.id,
      });
    },
  });
}

export const ingestLimiter = makeLimiter({ limit: 60, windowMs: 60000 });
export const batchLimiter = makeLimiter({ limit: 10, windowMs: 60000 });
