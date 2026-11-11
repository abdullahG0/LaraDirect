import { NextResponse } from 'next/server';
import { quoteBasket } from '@/lib/basket/quote';
import { handle, parseBody } from '@/lib/utils/errors';
import { basketQuoteSchema } from '@/lib/validation/checkout';

// POST /api/basket: re-prices the browser's basket from the database (step 4.1).
export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, basketQuoteSchema);
  return NextResponse.json(await quoteBasket(body));
});
