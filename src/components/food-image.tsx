'use client';

import Image from 'next/image';
import { useState } from 'react';

export function FoodImage({ src, name, priority = false }: { src: string | null; name: string; priority?: boolean }) {
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) return <div className="photo-fallback">{name}</div>;

  return (
    <Image
      key={src}
      src={src}
      alt={name}
      fill
      sizes="(max-width:760px) 50vw, 400px"
      preload={priority}
      unoptimized={!src.startsWith('https://images.unsplash.com/')}
      className={`food-image${loadedSource === src ? ' is-loaded' : ''}`}
      onLoad={() => setLoadedSource(src)}
      onError={() => setFailedSource(src)}
    />
  );
}
