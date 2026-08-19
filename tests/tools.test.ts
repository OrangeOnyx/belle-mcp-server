import { describe, it, expect, vi } from 'vitest';
import { RateLimiter } from '../src/lib/rate-limit.js';
import { listPropertiesInput } from '../src/tools/list-properties.js';
import { getRentRollInput } from '../src/tools/get-rent-roll.js';
import { draftMaintenanceResponseInput } from '../src/tools/draft-maintenance-response.js';
import { getLeaseInput } from '../src/tools/get-lease.js';

describe('RateLimiter', () => {
  it('allows up to N calls per minute', () => {
    const rl = new RateLimiter(3);
    expect(rl.check().allowed).toBe(true);
    expect(rl.check().allowed).toBe(true);
    expect(rl.check().allowed).toBe(true);
    expect(rl.check().allowed).toBe(false);
  });

  it('reports a retryAfterMs value under 60_000', () => {
    const rl = new RateLimiter(1);
    rl.check();
    const r = rl.check();
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeLessThanOrEqual(60_000);
  });
});

describe('input schemas', () => {
  it('list_properties accepts empty input and defaults limit', () => {
    const v = listPropertiesInput.parse({});
    expect(v.limit).toBe(20);
  });

  it('list_properties rejects invalid property_type', () => {
    expect(() => listPropertiesInput.parse({ property_type: 'castle' })).toThrow();
  });

  it('get_rent_roll requires property_id', () => {
    expect(() => getRentRollInput.parse({})).toThrow();
    const v = getRentRollInput.parse({ property_id: '11111111-1111-1111-1111-111111111111' });
    expect(v.property_id).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('draft_maintenance_response enforces min message length', () => {
    expect(() =>
      draftMaintenanceResponseInput.parse({
        ticket_id: '11111111-1111-1111-1111-111111111111',
        proposed_message: 'short',
      }),
    ).toThrow();
  });

  it('get_lease requires at least one id', () => {
    expect(() => getLeaseInput.parse({})).toThrow();
    expect(
      getLeaseInput.parse({ lease_id: '11111111-1111-1111-1111-111111111111' }).lease_id,
    ).toBe('11111111-1111-1111-1111-111111111111');
  });
});

describe('draft_maintenance_response HITL contract', () => {
  it('always saves approved=false', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: '00000000-0000-0000-0000-000000000001',
              ticket_id: '00000000-0000-0000-0000-000000000002',
              proposed_message: 'x'.repeat(30),
              approved: false,
              approved_by: null,
              approved_at: null,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
      }),
    });
    const sb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'maintenance_tickets') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: { id: '00000000-0000-0000-0000-000000000002', status: 'open' },
                    error: null,
                  }),
              }),
            }),
          };
        }
        return { insert: insertMock };
      }),
    };
    const { draftMaintenanceResponse } = await import('../src/tools/draft-maintenance-response.js');
    const res = await draftMaintenanceResponse(sb as never, {
      ticket_id: '00000000-0000-0000-0000-000000000002',
      proposed_message: 'x'.repeat(30),
    });
    expect(res.draft.approved).toBe(false);
    expect(res.hitl_notice).toMatch(/human/i);
  });
});
