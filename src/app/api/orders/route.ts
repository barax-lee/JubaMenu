import { NextRequest, NextResponse } from 'next/server';
import { checkoutSchema, DomainError } from '@/lib/domain';
import { createOrder } from '@/lib/data';
import { fail,rateLimit,sameOrigin } from '@/lib/http';
export async function POST(req:NextRequest){try{sameOrigin(req);await rateLimit(req,'checkout');if(Number(req.headers.get('content-length')??0)>20000)throw new DomainError('Cart too large',413);const text=await req.text();if(text.length>20000)throw new DomainError('Cart too large',413);const input=checkoutSchema.parse(JSON.parse(text));const token=await createOrder(input);return NextResponse.json({token});}catch(e){return fail(e);}}
