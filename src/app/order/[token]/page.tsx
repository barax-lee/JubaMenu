import { notFound } from 'next/navigation';
import { tracking } from '@/lib/data';
import { OrderTracking } from '@/components/order-tracking';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const order = await tracking((await params).token);
  if (!order) notFound();
  return <OrderTracking initial={order} />;
}
