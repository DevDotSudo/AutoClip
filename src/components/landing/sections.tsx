import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { createClient } from "@/lib/supabase/server";
import { formatPhp } from "@/lib/billing/format";

const features = [
  ["01", "Moment intelligence", "Transcript-first analysis finds complete, high-signal moments instead of chopping videos at arbitrary intervals."],
  ["02", "Transparent clip scoring", "See hook, clarity, payoff, emotion, novelty, and clean-cut signals behind every candidate."],
  ["03", "Clip-specific titles", "Generate concise titles from what is actually said in the selected segment—without unsupported clickbait."],
  ["04", "Readable captions", "Create subtitle timing and polished vertical-safe placement from the normalized transcript."],
  ["05", "9:16 output", "Prepare Shorts, Reels, and TikTok-friendly MP4 exports while keeping the source workflow simple."],
  ["06", "Private media pipeline", "Source files stay in private object storage and heavy rendering runs outside normal web requests."],
];

export async function LandingSections() {
  const { data: plans } = await (await createClient()).from("plans").select("code,name,price_php,duration_days,included_minutes,max_source_minutes,max_clips_per_job,max_resolution,watermark").eq("active",true).order("price_php");
  return <>
    <section className="logo-strip"><div className="container"><span>BUILT FOR</span><div>Podcasts</div><div>Interviews</div><div>Tutorials</div><div>Commentary</div><div>Talking-head video</div></div></section>

    <section className="section" id="workflow"><div className="container">
      <Reveal><div className="section-kicker">HOW IT WORKS</div><div className="section-head"><h2>From long-form to shortlist<br/>in a focused pipeline.</h2><p>Every stage is observable, recoverable, and designed around one goal: finding clips worth finishing.</p></div></Reveal>
      <div className="steps-grid">{[
        ["01","Import","Paste a permitted video URL or upload a source file directly to private R2 storage."],
        ["02","Transcribe","Create timestamped text so analysis stays fast, cheap, and grounded."],
        ["03","Rank","Gemini proposes candidates; AutoClip scores and deduplicates them server-side."],
        ["04","Render","Selected segments are reframed, captioned, and exported through FFmpeg."],
        ["05","Publish","Download clean MP4 clips with titles and clip-potential context."],
      ].map((x,i)=><Reveal key={x[0]} delay={i*70}><article className="step-card"><div className="step-number">{x[0]}</div><h3>{x[1]}</h3><p>{x[2]}</p><div className="step-line"/></article></Reveal>)}</div>
    </div></section>

    <section className="section feature-section" id="features"><div className="container">
      <Reveal><div className="section-kicker">BUILT FOR BETTER SELECTION</div><div className="section-head"><h2>Editing intelligence,<br/>without the timeline.</h2><p>Less time searching. More confidence in what deserves to become a short.</p></div></Reveal>
      <div className="feature-grid">{features.map((f,i)=><Reveal key={f[1]} delay={(i%3)*70}><article className="feature-card"><span>{f[0]}</span><h3>{f[1]}</h3><p>{f[2]}</p><div className="feature-arrow">↗</div></article></Reveal>)}</div>
    </div></section>

    <section className="section intelligence-section"><div className="container intelligence-grid">
      <Reveal><div className="section-kicker">CLIP POTENTIAL</div><h2>A useful score,<br/>not a fake virality promise.</h2><p>AutoClip combines editorial signals to rank which moments are most worth reviewing. It does not pretend to know the future.</p><div className="signal-tags"><span>Hook strength</span><span>Clarity</span><span>Payoff</span><span>Emotion</span><span>Novelty</span><span>Clean cut</span></div></Reveal>
      <Reveal delay={120}><div className="intelligence-card"><div className="ring-score"><div><b>94</b><span>clip potential</span></div></div><div className="candidate-list"><div className="candidate active"><b>01</b><span><strong>Stop waiting for perfect</strong><small>00:32 – 01:04</small></span><em>94</em></div><div className="candidate"><b>02</b><span><strong>The growth loop nobody notices</strong><small>12:08 – 12:43</small></span><em>89</em></div><div className="candidate"><b>03</b><span><strong>Why consistency compounds</strong><small>25:11 – 25:47</small></span><em>86</em></div></div></div></Reveal>
    </div></section>

    <section className="section" id="pricing"><div className="container">
      <Reveal><div className="section-kicker">SIMPLE BETA PRICING</div><div className="section-head pricing-head"><h2>Start free. Pay when<br/>you need more volume.</h2><p>Paid plans are 30-day access passes. Pay by manual transfer with no automatic charges.</p></div></Reveal>
      <div className="pricing-grid">{(plans||[]).map((plan)=><PriceCard key={plan.code} name={plan.name} price={formatPhp(plan.price_php)} note={plan.code==="FREE"?"No payment required":`per ${plan.duration_days} days`} popular={plan.code==="CREATOR"} items={[`${Number(plan.included_minutes).toLocaleString()} processing minutes`,`${plan.max_clips_per_job} clips per project`,`${plan.max_source_minutes}-minute source limit`,`${plan.max_resolution} export`,plan.watermark?"Watermarked output":"No watermark"]}/>)}</div>
    </div></section>

    <section className="section faq-section" id="faq"><div className="container faq-grid"><Reveal><div className="section-kicker">FAQ</div><h2>Straight answers<br/>before you upload.</h2><p>AutoClip is designed for content you own or are authorized to repurpose.</p></Reveal><div className="faq-list">
      {[["What is a processing minute?","One minute of source video consumes one processing minute from your available balance."],["Can I paste a YouTube link?","Yes for content you own or have permission to process. URL ingestion should follow the source platform's terms and your rights to the video."],["Does a 94 score mean 94% chance of going viral?","No. Clip Potential is an editorial ranking score, not a probability or guarantee of virality."],["How do paid plans work?","Creator and Pro are renewable 30-day passes. Pay manually and submit your receipt for administrator verification."],["Do you support GCash?","Yes. GCash, GoTyme, and bank transfer can be enabled by the administrator."],["Where are videos stored?","Private Cloudflare R2 storage. The architecture uses short-lived upload URLs and retention-aware media records."]].map((f,i)=><Reveal key={f[0]} delay={i*40}><details className="faq-item"><summary>{f[0]}<span>+</span></summary><p>{f[1]}</p></details></Reveal>)}
    </div></div></section>

    <section className="section final-section"><div className="container"><Reveal><div className="final-card"><div className="final-glow"/><div className="section-kicker">YOUR NEXT SHORT IS ALREADY IN THERE</div><h2>Find the moments worth posting.</h2><p>Start with 30 free processing minutes. No card required.</p><Link href="/signup" className="btn btn-primary btn-lg">Start creating free <span>→</span></Link></div></Reveal></div></section>
  </>;
}

function PriceCard({name,price,note,items,popular=false}:{name:string;price:string;note:string;items:string[];popular?:boolean}) {
  return <Reveal><article className={`price-card ${popular?"popular":""}`}>{popular&&<div className="popular-label">MOST POPULAR</div>}<h3>{name}</h3><div className="price"><b>{price}</b><span>{note}</span></div><div className="price-divider"/>{items.map(i=><div className="price-feature" key={i}><span>✓</span>{i}</div>)}<Link href="/signup" className={`btn ${popular?"btn-primary":"btn-secondary"}`}>{name==="Free"?"Start free":`Choose ${name}`} <span>→</span></Link></article></Reveal>
}
