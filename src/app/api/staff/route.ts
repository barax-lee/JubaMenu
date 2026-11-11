import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { memberships,mutateOrder,staffData } from '@/lib/data';
import { isDemo } from '@/lib/supabase';
import { fail,sameOrigin } from '@/lib/http';
import { DomainError } from '@/lib/domain';
export async function GET(){try{return NextResponse.json(await staffData(),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{sameOrigin(req);const body=await req.json();if(body.action==='switch'){const id=z.uuid().parse(body.id);if(!(await memberships()).some(r=>r.id===id))throw new DomainError('Restaurant access denied',403);(await cookies()).set(isDemo()?'demo_restaurant':'active_restaurant',id,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'});}else{const input=z.object({id:z.uuid(),action:z.enum(['status','payment','bill']),value:z.string()}).parse(body);if(input.action==='status')z.enum(['accepted','preparing','ready','served','cancelled']).parse(input.value);if(input.action==='payment')z.enum(['cash','mobile_money','other']).parse(input.value);if(input.action==='bill')z.enum(['acknowledged','resolved']).parse(input.value);await mutateOrder(input.id,input.action,input.value);}return NextResponse.json({ok:true});}catch(e){return fail(e);}}
