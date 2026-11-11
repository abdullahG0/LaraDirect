import { NextResponse } from 'next/server';
import { listAdminOrders } from '@/lib/admin/orders';
import { withAdmin } from '@/lib/auth/admin';

// GET /api/admin/orders: admin order list (filters run client-side in the DataTable).
export const GET = withAdmin('viewer', async (_req, { db }) => NextResponse.json(await listAdminOrders(db)));
