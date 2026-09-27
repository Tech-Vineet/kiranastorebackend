import Link from 'next/link';
export default function Home() { return 
<main className="landing">
    <div className="brandMark">
        KS
    </div>
    <h1>Kirana Saathi</h1>
    <p>A fast, friendly ordering demo for your neighbourhood store.</p>
    <div className="homeActions"><Link className="primary" href="/store/sharma-kirana">Open customer demo</Link><Link className="secondary" href="/merchant">Open merchant dashboard</Link></div></main>; }
