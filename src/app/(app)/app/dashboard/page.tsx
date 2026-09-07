import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export default async function DashboardPage(){
  const s=await createClient();
  const [projectsRes,jobsRes,clipsRes,subRes,creditRes]=await Promise.all([
    s.from("projects").select("id,title,status,created_at").order("created_at",{ascending:false}).limit(5),
    s.from("processing_jobs").select("id,state,stage,progress,created_at").order("created_at",{ascending:false}).limit(5),
    s.from("clips").select("id",{count:"exact",head:true}),
    s.from("subscriptions").select("plan_code,status,period_end").eq("status","ACTIVE").order("period_end",{ascending:false}).limit(1).maybeSingle(),
    s.from("credit_ledger").select("delta_minutes"),
  ]);
  const remaining=(creditRes.data||[]).reduce((sum,r)=>sum+Number(r.delta_minutes||0),0);
  const running=(jobsRes.data||[]).filter(j=>!["COMPLETED","FAILED","CANCELLED"].includes(j.state)).length;
  return <><div className="page-head"><div><h1>Dashboard</h1><p>Everything moving through your clipping workspace.</p></div><Link className="btn btn-primary" href="/app/new">＋ New project</Link></div><section className="metrics"><Metric label="Minutes available" value={String(remaining)} detail="Credit ledger balance"/><Metric label="Projects" value={String(projectsRes.data?.length||0)} detail="Recent workspace projects"/><Metric label="Jobs running" value={String(running)} detail="Queued or processing"/><Metric label="Clips created" value={String(clipsRes.count||0)} detail="Across your library"/></section><section className="dashboard-grid"><div className="panel"><div className="panel-head"><h2>Recent projects</h2><Link href="/app/projects">View all</Link></div>{projectsRes.data?.length?<table className="table"><thead><tr><th>Project</th><th>Status</th><th>Created</th></tr></thead><tbody>{projectsRes.data.map(p=><tr key={p.id}><td><Link href={`/app/projects/${p.id}`}><strong>{p.title}</strong></Link></td><td><span className={`status ${p.status.toLowerCase()}`}>{humanize(p.status)}</span></td><td>{formatDate(p.created_at)}</td></tr>)}</tbody></table>:<Empty text="No projects yet. Start by importing your first video."/>}</div><div className="panel"><div className="panel-head"><h2>Current plan</h2><Link href="/app/billing">Manage</Link></div><div style={{padding:"12px 0"}}><div className="section-kicker">{subRes.data?.status||"FREE"}</div><h2 style={{fontSize:"2rem"}}>{subRes.data?.plan_code||"Free"}</h2><p style={{color:"var(--muted)",fontSize:'.8rem'}}>Access period ends: {formatDate(subRes.data?.period_end)}</p><Link className="btn btn-secondary" href="/app/billing">View plans →</Link></div></div></section><section className="panel" style={{marginTop:12}}><div className="panel-head"><h2>Latest processing</h2><Link href="/app/jobs">View queue</Link></div>{jobsRes.data?.length?<table className="table"><thead><tr><th>Stage</th><th>State</th><th>Progress</th></tr></thead><tbody>{jobsRes.data.map(j=><tr key={j.id}><td><strong>{humanize(j.stage)}</strong></td><td><span className={`status ${j.state.toLowerCase()}`}>{humanize(j.state)}</span></td><td>{j.progress}%</td></tr>)}</tbody></table>:<Empty text="No processing jobs yet."/>}</section></>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="metric-card"><small>{label}</small><b>{value}</b><span>{detail}</span></div>}
function Empty({text}:{text:string}){return <div className="empty-state"><h3>Nothing here yet</h3><p>{text}</p></div>}
