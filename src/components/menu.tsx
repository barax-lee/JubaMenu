'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import { Brand, DemoBanner, Footer } from './shared';
import { FoodImage } from './food-image';
import { money, type Restaurant, type Category, type Item, type Table } from '@/lib/domain';

type Props = { restaurant: Restaurant; categories: Category[]; items: Item[]; table: Table | null; demo: boolean };

export function Menu({ restaurant, categories, items, table, demo }: Props) {
  const freedom = restaurant.slug === 'freedom-lounge';
  const visible = items.filter(item => item.active);
  return <>
    {demo && <DemoBanner />}
    <div className="wrap">
      <header className="topbar"><Brand /><Link href="/#restaurants" className="btn small"><ArrowLeft size={15} /> All restaurants</Link></header>
      <main id="main">
        <div className="restaurant-head">
          <div className="restaurant-brand"><span className="restaurant-logo">{freedom ? 'F' : 'L'}</span><div><h2>{restaurant.name}</h2><p>Juba, South Sudan</p></div></div>
          <span className="pill"><MapPin size={13} />{table ? table.name : 'Explore our menu'}</span>
        </div>
        <section className="menu-hero" aria-label={`Welcome to ${restaurant.name}`}>
          <FoodImage src={freedom ? 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85' : 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=85'} name={restaurant.name} priority />
          <div className="menu-hero-content"><span className="eyebrow" style={{ color: '#f5c5a5' }}>{freedom ? 'Slow down. Stay a little longer.' : 'Good food. Great company.'}</span><h1>{restaurant.name}</h1><p>{restaurant.description}</p><span className="pill" style={{ background: 'transparent' }}><Clock size={13} />{restaurant.opening_info}</span></div>
        </section>
        {demo && <p className="muted">Illustrative menu prices · {restaurant.currency}</p>}
        {!table && <p className="notice">Take a look around. To order at your table, scan its QR code.</p>}
        {!restaurant.ordering_enabled && <p className="notice">Ordering is currently paused. You can still browse the menu.</p>}
        {categories.filter(c => c.active).sort((a,b) => a.sort_order-b.sort_order).map(c => {
          const dishes = visible.filter(item => item.category_id === c.id).sort((a,b) => a.sort_order-b.sort_order);
          if (!dishes.length) return null;
          return <section key={c.id} className="menu-section"><h2>{c.name}</h2><p className="muted">Made for your kind of moment.</p><div className="grid">{dishes.map(item => <article className="card" key={item.id}><div className="photo"><FoodImage src={item.image_url} name={item.name} />{!item.available && <span className="sold">Sold out</span>}</div><div className="card-body"><h3>{item.name}</h3><p>{item.description}</p><span className="price">{money(item.price, restaurant.currency)}</span></div></article>)}</div></section>;
        })}
      </main>
    </div><Footer />
  </>;
}
