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

