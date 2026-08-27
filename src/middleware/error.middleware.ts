import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled Exception');

  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'An internal server error occurred'
      : err.message || 'An unexpected error occurred';

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
