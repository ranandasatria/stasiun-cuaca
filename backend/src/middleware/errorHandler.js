export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  const body = {
    code,
    message: err.message || 'Internal server error',
    request_id: req.id,
  };

  if (err.details) {
    body.details = err.details;
  }

  if (status >= 500) {
    console.error(`[${req.id}]`, err);
  }

  res.status(status).json(body);
}
