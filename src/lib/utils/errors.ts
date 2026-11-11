import { NextResponse } from 'next/server';
import { ZodError, type ZodType, type ZodTypeDef } from 'zod';

/** Consistent API error shape (spec §13). */
export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Parses a JSON body with a Zod schema, throwing HttpError(400) with the first issue. */
export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, 'BAD_JSON', 'Request body must be JSON');
  }
  return parseWith(schema, json);
}

export function parseWith<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) {
    const issue = r.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new HttpError(400, 'VALIDATION', `${where}${issue?.message ?? 'Invalid input'}`);
  }
  return r.data;
}

/** Wraps a route handler so thrown HttpErrors/ZodErrors become the standard error shape. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return apiError(err.code, err.message, err.status);
      if (err instanceof ZodError)
        return apiError('VALIDATION', err.issues[0]?.message ?? 'Invalid input', 400);
      console.error(err);
      return apiError('INTERNAL', 'Something went wrong. Please try again.', 500);
    }
  };
}
