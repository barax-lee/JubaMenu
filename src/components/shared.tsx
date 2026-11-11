import Link from 'next/link';
export function Brand(){return <Link href="/" className="brand" aria-label="JubaMenu home"><span className="mark">j</span><span>juba<em>menu</em><span style={{color:'#a2a394',fontSize:15}}> ·</span></span></Link>;}
export function DemoBanner(){return <div className="demo-banner">LOCAL DEMONSTRATION · Fictional restaurants & illustrative prices · Data stays on this development server</div>;}
export function Footer(){return <footer className="footer"><div className="wrap row"><Brand/><span>Made for the way Juba dines.</span><span>Simple menus. Better service.</span></div></footer>;}
