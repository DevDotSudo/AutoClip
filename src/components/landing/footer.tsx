import Link from "next/link";

export function Footer() {
  return <footer className="site-footer"><div className="container footer-grid"><div><Link href="/" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link><p>AI-assisted clipping for creators who want stronger short-form output without living on the timeline.</p></div><div><b>Product</b><a href="#workflow">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div><div><b>Company</b><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><div className="footer-status"><span><i/> Systems ready</span><small>© 2026 AutoClip</small></div></div></footer>;
}
