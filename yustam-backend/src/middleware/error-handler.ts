import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(new HttpError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err instanceof HttpError ? err : new HttpError(500, 'Internal Server Error');
  if (!(err instanceof HttpError)) {
    console.error(err);
  }

  res.status(error.statusCode).json({
    message: error.message,
    details: error.details,
  });
};