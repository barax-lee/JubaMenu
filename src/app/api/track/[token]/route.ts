import { NextRequest,NextResponse } from 'next/server';
import { bill,tracking } from '@/lib/data';
import { fail,rateLimit,sameOrigin } from '@/lib/http';
export async function GET(req:NextRequest,{params}:{params:Promise<{token:string}>}){try{await rateLimit(req,'track');const o=await tracking((await params).token);return NextResponse.json(o,{status:o?200:404,headers:{'Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(req:NextRequest,{params}:{params:Promise<{token:string}>}){try{sameOrigin(req);await rateLimit(req,'bill');await bill((await params).token);return NextResponse.json({ok:true});}catch(e){return fail(e);}}
