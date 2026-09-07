import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";

export function Hero() {
  return (
    <section className="hero-section">
      <div className="hero-grid-lines" />
      <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
      <div className="container hero-grid">
        <Reveal className="hero-copy">
          <div className="eyebrow"><span className="pulse-dot" /> AI CLIPPING FOR CREATORS</div>
          <h1>Turn long videos into <span>clips people stop for.</span></h1>
          <p className="hero-lead">AutoClip finds the strongest moments, scores their clip potential, writes focused titles, and prepares vertical exports—without scrubbing through an entire timeline.</p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary btn-lg">Create clips free <span>→</span></Link>
            <a href="#product" className="btn btn-secondary btn-lg"><span className="play-dot">▶</span> See how it works</a>
          </div>
          <div className="hero-trust"><span>✓ No card required</span><span>✓ 30 free minutes</span><span>✓ Built for owned/licensed content</span></div>
        </Reveal>

        <Reveal className="hero-product" delay={120}>
          <div className="product-window" id="product">
            <div className="window-top"><div className="traffic"><i/><i/><i/></div><div className="window-title">AutoClip / New project</div><div className="status-pill"><span/> AI ready</div></div>
            <div className="product-body">
              <div className="source-card">
                <div className="source-top"><div><small>SOURCE VIDEO</small><strong>The creator economy podcast — Episode 48</strong></div><div className="duration">48:12</div></div>
                <div className="timeline"><span/><span/><span/><span/><span/><span/></div>
              </div>
              <div className="product-content">
                <div className="preview-phone">
                  <div className="phone-video"><div className="video-face"><span className="face-ring"/></div><div className="caption-line">The biggest mistake was waiting for perfect.</div><div className="video-time">00:37</div></div>
                </div>
                <div className="analysis-panel">
                  <div className="score-head"><div><small>CLIP POTENTIAL</small><div className="score-number">94<span>/100</span></div></div><div className="rank-badge">Top 3%</div></div>
                  <h3>The mistake that nearly killed momentum</h3>
                  <p>Strong cold-open, immediate tension, clear payoff, and a self-contained idea.</p>
                  <div className="score-list">
                    {[["Hook",95],["Clarity",91],["Payoff",94],["Emotion",86]].map(([label,score]) => <div className="score-item" key={label as string}><div><span>{label}</span><b>{score}</b></div><div className="meter"><i style={{width:`${score}%`}}/></div></div>)}
                  </div>
                  <button className="mock-export">Export 9:16 clip <span>↗</span></button>
                </div>
              </div>
            </div>
          </div>
          <div className="float-chip chip-one"><b>12</b><span>strong moments found</span></div>
          <div className="float-chip chip-two"><span className="spark">✦</span><div><b>AI titles ready</b><span>Grounded to transcript</span></div></div>
        </Reveal>
      </div>
    </section>
  );
}
