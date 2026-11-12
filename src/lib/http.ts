import 'server-only';
import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DomainError } from './domain';
import { adminClient, isDemo } from './supabase';

export function fail(error: unknown) {
  const headers = { 'Cache-Control': 'no-store' };
  if (error instanceof DomainError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid request. Check your input and try again.' }, { status: 400, headers });
  }
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500, headers });
}

export function sameOrigin(req: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') throw new DomainError('Application URL is not configured.', 503);
  const expected = new URL(configuredUrl || req.url).origin;
  if (req.headers.get('origin') !== expected || req.headers.get('sec-fetch-site') === 'cross-site') {
    throw new DomainError('Request origin is not allowed.', 403);
  }
}

const demoLimits = new Map<string, { start: number; hits: number }>();
const limits = { checkout: 10, track: 120, bill: 20 } as const;
export async function rateLimit(req: NextRequest, action: keyof typeof limits) {
  const demo = isDemo();
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!demo && (!secret || secret.length < 32)) throw new DomainError('Rate limiting is not configured.', 503);
  // The deployment proxy must overwrite this header with trusted client information.
  const address = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = createHmac('sha256', secret || 'local-demo-only').update(`${action}:${address}`).digest('hex');
  if (demo) {
    const now = Date.now();
    for (const [entryKey, entry] of demoLimits) if (now - entry.start >= 60_000) demoLimits.delete(entryKey);
    const entry = demoLimits.get(key) || { start: now, hits: 0 };
    entry.hits++;
    demoLimits.set(key, entry);
    if (entry.hits > limits[action]) throw new DomainError('Too many requests. Try again in a minute.', 429);
    return;
  }
  const { data, error } = await adminClient().rpc('consume_rate_limit', { rate_key: key, max_hits: limits[action], window_seconds: 60 });
  if (error || typeof data !== 'boolean') throw new DomainError('Rate limiting is temporarily unavailable.', 503);
  if (!data) throw new DomainError('Too many requests. Try again in a minute.', 429);
}
