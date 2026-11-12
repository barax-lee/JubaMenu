import { notFound } from 'next/navigation';
import { publicMenu,publicTable } from '@/lib/data';
import { isDemo } from '@/lib/supabase';
import { Menu } from '@/components/menu';
export default async function Page({params}:{params:Promise<{slug:string;token:string}>}){const {slug,token}=await params;const data=await publicMenu(slug);if(!data)notFound();const table=await publicTable(data.restaurant.id,token);if(!table)return <main id="main" className="wrap section"><h1>This table link is unavailable.</h1><p>The table may be inactive or its QR code may have changed. Ask your server for the current code.</p><a className="btn" href={`/r/${slug}`}>Browse the menu</a></main>;return <Menu {...data} table={table} demo={isDemo()}/>;}
