'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main" className="wrap section"><h1>We couldn’t load this page.</h1><p>Check your connection and try again. Your saved cart will be kept.</p><button className="btn primary" onClick={reset}>Try again</button></main>;}
