'use client';
import Image from 'next/image';
import { useState } from 'react';
export function FoodImage({src,name,priority=false}:{src:string|null;name:string;priority?:boolean}){const [failed,setFailed]=useState(false);return src&&!failed?<Image src={src} alt={name} fill sizes="(max-width:760px) 50vw, 400px" priority={priority} unoptimized={!src.startsWith('https://images.unsplash.com/')} onError={()=>setFailed(true)}/>:<div className="photo-fallback">{name}</div>;}
