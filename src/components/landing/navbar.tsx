"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll(); window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={`landing-nav-wrap ${scrolled ? "scrolled" : ""}`}>
      <nav className="landing-nav container">
        <Link href="/" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link>
        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? "×" : "☰"}</button>
        <div className={`landing-nav-links ${open ? "open" : ""}`}>
          <a href="#workflow">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
        </div>
        <div className="landing-nav-actions">
          <Link href="/login" className="btn btn-ghost">Log in</Link>
          <Link href="/signup" className="btn btn-primary">Start free <span>↗</span></Link>
        </div>
      </nav>
    </header>
  );
}
