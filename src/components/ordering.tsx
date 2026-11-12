'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { checkoutSchema, money, type Item, type Restaurant, type Table, type Checkout } from '@/lib/domain';

const savedSchema = z.object({ lines: z.array(z.object({ item_id: z.string(), name: z.string(), price: z.number().int().nonnegative(), quantity: z.number().int().min(1).max(20), instructions: z.string().max(250) })).max(30), instructions: z.string().max(500), attempt: checkoutSchema.nullable() });
type CartState = z.infer<typeof savedSchema>;
const empty = (): CartState => ({ lines: [], instructions: '', attempt: null });
const CartContext = createContext<{ add: (item: Item) => void; enabled: boolean } | null>(null);
export function AddToCart({ item }: { item: Item }) {
  const cart = useContext(CartContext);
  return <button className="btn small" disabled={!item.available || !cart?.enabled} onClick={() => cart?.add(item)} aria-label={`Add ${item.name} to cart`}>{item.available ? 'Add to order +' : 'Sold out'}</button>;
}
export function Ordering({ restaurant, table, items, children }: { restaurant: Restaurant; table: Table | null; items: Item[]; children: React.ReactNode }) {
  const router = useRouter();
  const storageKey = `jubamenu:cart:${restaurant.id}:${table?.token || 'browse'}:${restaurant.currency}`;
  const [cart, setCart] = useState<CartState>(empty);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastOrder, setLastOrder] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    let saved = empty();
    let last = '';
    try { const raw = localStorage.getItem(storageKey); if (raw) saved = savedSchema.parse(JSON.parse(raw)); last = localStorage.getItem(`${storageKey}:last`) || ''; } catch { /* A damaged cart does not prevent browsing. */ }
    // Restore browser-only storage after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(saved);
    setLastOrder(last);
    setReady(true);
  }, [storageKey]);
  function update(next: CartState) {
    setCart(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { setError('Browser storage is unavailable. Keep this page open to retain your cart.'); }
  }
  const enabled = ready && !!table && restaurant.ordering_enabled && !busy && !cart.attempt;
  function add(item: Item) {
    if (!enabled) return;
    const line = cart.lines.find(l => l.item_id === item.id);
    if ((line?.quantity || 0) >= 20 || cart.lines.reduce((n,l) => n+l.quantity,0) >= 60 || (!line && cart.lines.length >= 30)) { setError('Maximum 20 of one dish, 30 different dishes and 60 items per order.'); return; }
    setError('');
    update({ ...cart, lines: line ? cart.lines.map(l => l.item_id === item.id ? { ...l, quantity: l.quantity+1 } : l) : [...cart.lines, { item_id: item.id, name: item.name, price: item.price, quantity: 1, instructions: '' }] });
  }
  const changed = cart.lines.some(l => { const item = items.find(i => i.id === l.item_id); return !item || !item.active || !item.available || item.price !== l.price; });
  async function submit() {
    if (locked.current || !ready || !table || !cart.lines.length || !restaurant.ordering_enabled) return;
    if (changed && !cart.attempt) { setError('Menu prices or availability changed. Review your cart before submitting.'); return; }
    locked.current = true; setBusy(true); setError('');
    const attempt: Checkout = cart.attempt || { restaurant_id: restaurant.id, table_token: table.token, idempotency_key: crypto.randomUUID(), instructions: cart.instructions, items: cart.lines.map(l => ({ item_id: l.item_id, quantity: l.quantity, expected_price: l.price, instructions: l.instructions })) };
    // Persist the exact request before sending: retries reuse its idempotency key.
    update({ ...cart, attempt });
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attempt), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) update({ ...cart, attempt: null });
        throw new Error(data.error || 'Could not confirm the order. Retry to check safely.');
      }
      if (typeof data.token !== 'string' || !data.token) throw new Error('Order confirmation is incomplete. Retry safely.');
      const url = `/order/${encodeURIComponent(data.token)}`;
      try { localStorage.setItem(`${storageKey}:last`, url); localStorage.removeItem(storageKey); } catch { /* The confirmed tracking link remains visible. */ }
      setCart(empty()); setLastOrder(url); router.push(url);
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Connection interrupted. Your cart is saved. Retry to confirm the same order.'); }
    finally { locked.current = false; setBusy(false); }
  }
  return <CartContext.Provider value={{ add, enabled }}>{children}{table && <aside className="cart" id="cart" aria-label="Your order"><h2>Your order · {table.name}</h2>{!ready ? <p>Loading saved cart…</p> : <>
    {lastOrder && <p><Link className="btn small" href={lastOrder}>View your last order</Link></p>}
    {!cart.lines.length && <p className="cart-empty">Choose something delicious from the menu.</p>}
    {cart.lines.map(line => <div className="cart-line" key={line.item_id}><p><strong>{line.name}</strong> · {money(line.price*line.quantity, restaurant.currency)}</p><div className="quantity"><button disabled={!enabled} aria-label={`Remove one ${line.name}`} onClick={() => update({ ...cart, lines: cart.lines.map(l => l.item_id === line.item_id ? { ...l, quantity: l.quantity-1 } : l).filter(l => l.quantity > 0) })}>−</button><span>{line.quantity}</span><button disabled={!enabled} aria-label={`Add one ${line.name}`} onClick={() => { const item = items.find(i => i.id === line.item_id); if (item) add(item); }}>+</button></div><label className="field">Instructions for {line.name}<textarea disabled={!enabled} maxLength={250} value={line.instructions} onChange={e => update({ ...cart, lines: cart.lines.map(l => l.item_id === line.item_id ? { ...l, instructions: e.target.value } : l) })} /></label></div>)}
    {!!cart.lines.length && <><label className="field">Instructions for the whole order<textarea disabled={!enabled} maxLength={500} value={cart.instructions} onChange={e => update({ ...cart, instructions: e.target.value })} /></label><p className="cart-total">Total: {money(cart.lines.reduce((n,l) => n+l.price*l.quantity,0), restaurant.currency)}</p><p className="hint">Pay the restaurant after ordering. No online payment.</p>
    {changed && !cart.attempt && <div className="notice">Prices or availability changed. Review the current menu before continuing.<button className="btn small" disabled={!enabled} onClick={() => { update({ ...cart, lines: cart.lines.flatMap(l => { const i = items.find(i => i.id === l.item_id && i.active && i.available); return i ? [{ ...l, price: i.price, name: i.name }] : []; }) }); setError('Cart updated. Review the total, then place your order.'); }}>Update cart to current menu</button></div>}
    {cart.attempt && !busy && <p className="notice">The last submission needs confirmation. Retry the same order before changing your cart.</p>}
    <button className="btn primary full" disabled={!ready || busy || !restaurant.ordering_enabled || (changed && !cart.attempt)} onClick={submit}>{busy ? 'Confirming order…' : cart.attempt ? 'Retry same order safely' : 'Place order'}</button></>}
    {error && <p className="error" role="alert">{error} <button className="btn small" onClick={() => router.refresh()}>Refresh menu</button></p>}
  </>}</aside>}</CartContext.Provider>;
}
