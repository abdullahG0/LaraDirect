import { NextResponse } from 'next/server';
import { getDistributor } from '@/lib/distributor';

export function GET() {
  return NextResponse.json({ ok: true, distributor: getDistributor().name });
}
