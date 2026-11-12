import { notFound } from 'next/navigation';
import { publicMenu } from '@/lib/data';
import { isDemo } from '@/lib/supabase';
import { Menu } from '@/components/menu';
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const data=await publicMenu(slug);if(!data)notFound();return <Menu {...data} table={null} demo={isDemo()}/>;}
