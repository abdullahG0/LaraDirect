import { describe, expect, it } from 'vitest';
import { canTransition, customerStatusLabel } from '@/lib/orders/lifecycle';

describe('order lifecycle', () => {
  it('allows the happy path', () => {
    expect(canTransition('pending_payment', 'paid')).toBe(true);
    expect(canTransition('paid', 'submitting')).toBe(true);
    expect(canTransition('submitting', 'submitted')).toBe(true);
    expect(canTransition('submitted', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);
  });

  it('allows admin retry of failed orders', () => {
    expect(canTransition('failed', 'submitting')).toBe(true);
  });

  it('blocks cancelling after dispatch', () => {
    expect(canTransition('shipped', 'cancelled')).toBe(false);
  });

  it('maps to friendly customer labels', () => {
    expect(customerStatusLabel('backordered')).toBe('Delayed (awaiting stock)');
    expect(customerStatusLabel('shipped')).toBe('Dispatched');
  });
});

describe('pathTo', () => {
  it('walks through intermediate states', async () => {
    const { pathTo } = await import('@/lib/orders/lifecycle');
    expect(pathTo('submitted', 'shipped')).toEqual(['confirmed', 'shipped']);
    expect(pathTo('submitted', 'delivered')).toEqual(['confirmed', 'shipped', 'delivered']);
    expect(pathTo('backordered', 'shipped')).toEqual(['confirmed', 'shipped']);
    expect(pathTo('shipped', 'shipped')).toEqual([]);
    expect(pathTo('delivered', 'cancelled')).toBeNull();
  });
});

describe('transitionOrder', () => {
  function fakeDb(status: string) {
    const state = { status, events: [] as unknown[] };
    const db = {
      from(table: string) {
        if (table === 'order_events')
          return { insert: async (row: unknown) => (state.events.push(row), { error: null }) };
        let patch: Record<string, unknown> | null = null;
        const conds: Record<string, unknown> = {};
        const q = {
          select: () => q,
          update: (p: Record<string, unknown>) => ((patch = p), q),
          eq: (k: string, v: unknown) => ((conds[k] = v), q),
          single: async () => ({ data: { status: state.status }, error: null }),
          then: (resolve: (v: unknown) => void) => {
            const ok = !conds.status || conds.status === state.status;
            if (ok && patch) state.status = patch.status as string;
            resolve({ data: ok ? [{ id: 'o1' }] : [], error: null });
          },
        };
        return q;
      },
    };
    return { db, state };
  }

  it('applies a valid transition and records an event', async () => {
    const { transitionOrder } = await import('@/lib/orders/lifecycle');
    const { db, state } = fakeDb('paid');
    await transitionOrder(db, 'o1', 'submitting');
    expect(state.status).toBe('submitting');
    expect(state.events).toHaveLength(1);
  });

  it('throws on an invalid transition', async () => {
    const { transitionOrder, InvalidTransitionError } = await import('@/lib/orders/lifecycle');
    const { db, state } = fakeDb('shipped');
    await expect(transitionOrder(db, 'o1', 'cancelled')).rejects.toBeInstanceOf(InvalidTransitionError);
    expect(state.status).toBe('shipped');
    expect(state.events).toHaveLength(0);
  });
});
