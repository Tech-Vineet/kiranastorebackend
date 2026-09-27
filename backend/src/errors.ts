import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error { constructor(public status: number, message: string) { super(message); } }
export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  if (error instanceof ZodError) { res.status(400).json({ success: false, data: null, message: error.issues[0]?.message || 'Invalid request' }); return; }
  const status = error instanceof AppError ? error.status : 500;
  res.status(status).json({ success: false, data: null, message: status === 500 ? 'Something went wrong' : error.message });
};
