'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Brand } from './shared';
import { money } from '@/lib/domain';
import type { tracking } from '@/lib/data';
type Tracked = NonNullable<Awaited<ReturnType<typeof tracking>>>;
const steps = ['new', 'accepted', 'preparing', 'ready', 'served'];
export function OrderTracking({ initial }: { initial: Tracked }) {
  const [order, setOrder] = useState(initial);
  const [connection, setConnection] = useState('Checking for updates…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const url = `/api/track/${encodeURIComponent(initial.public_token)}`;
  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function refresh() {
      if (running || controller.signal.aborted) return;
      running = true;
      try { const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) }); if (!response.ok) throw new Error(); const data = await response.json(); if (!controller.signal.aborted) { setOrder(data); setConnection('Updates connected · checks every 8 seconds'); } }
      catch { if (!controller.signal.aborted) setConnection('Updates interrupted. Reconnecting automatically…'); }
      finally { running = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 8000);
    window.addEventListener('online', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('online', refresh); };
  }, [url]);
  async function requestBill() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(15000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Bill request failed.'); setOrder(o => ({ ...o, bill_status: 'pending' })); }
    catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Connection interrupted. You can safely retry your bill request.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="wrap"><header className="topbar"><Brand /><Link href="/">Home</Link></header><main id="main" className="tracking"><span className="eyebrow">Order confirmed</span><h1>Order #{order.number}</h1><p><strong>{order.restaurant_name}</strong> · {order.table_name} · {new Date(order.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Juba' })}</p><p className="notice" role="status">Status: <strong>{order.status}</strong> · {order.paid ? 'Paid' : 'Unpaid'}</p>{order.status !== 'cancelled' && <div className="timeline" aria-label="Order progress">{steps.map((step,i) => <div key={step} className={i <= steps.indexOf(order.status) ? 'done' : ''}>{step}</div>)}</div>}<p className="connection" role="status">{connection}</p><section className="panel"><h2>Your items</h2>{order.items.map((item,i) => <div className="cart-line" key={i}><div className="row"><strong>{item.quantity} × {item.name}</strong><span>{money(item.line_total, order.currency)}</span></div>{item.instructions && <p>{item.instructions}</p>}</div>)}{order.instructions && <p>Order instructions: {order.instructions}</p>}<p className="cart-total">Total: {money(order.total, order.currency)}</p><p>No online payment was taken. Pay the restaurant directly.</p></section><p>Bill request: {order.bill_status}</p>{!order.paid && order.status !== 'cancelled' && <button className="btn primary" disabled={busy || ['pending','acknowledged'].includes(order.bill_status)} onClick={requestBill}>{busy ? 'Requesting…' : order.bill_status === 'pending' ? 'Bill requested' : order.bill_status === 'acknowledged' ? 'Staff acknowledged your bill' : 'Request the bill'}</button>}{error && <p className="error" role="alert">{error}</p>}<p className="hint">Bookmark this page to return to your order. Keep its private link to yourself.</p></main></div>;
}
