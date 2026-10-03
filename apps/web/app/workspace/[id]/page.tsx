"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, FileText, ShieldAlert, Timer } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Dashboard>(`/api/workspaces/${id}/dashboard`).then(setData).catch(error => setError(error.message)); }, [id]);
  return <WorkspaceShell id={id} title="Overview"><div className="page">
    <PageTitle eyebrow="Operations dashboard" title={data?.workspace.name || "Loading workspace"} description={data?.workspace.goal || "Retrieving project state…"} action={<Link className="button primary" href={`/workspace/${id}/copilot`}>Open Copilot <ArrowRight size={14}/></Link>}/>
    {error && <div className="error">{error}</div>}
    {!data ? <div className="loading">Assembling workspace context…</div> : <>
      <div className="side-label" style={{paddingLeft:0}}>Workspace health</div>
      <div className="stats-grid">
        {[['Active tasks','active_tasks'],['Completed','completed_tasks'],['Blocked','blocked_tasks'],['Open risks','open_risks'],['Documents','documents'],['Decisions','decisions']].map(([label,key]) => <div className="stat-card" key={key}><div className="stat-label">{label}</div><div className="stat-value">{data.counts[key] || 0}</div></div>)}
      </div>
      <div className="side-label" style={{paddingLeft:0}}>AI automation impact</div>
      <div className="stats-grid">
        {[['Meetings processed','meetings_processed'],['Tasks generated','tasks_auto_generated'],['Decisions captured','decisions_captured'],['Documents indexed','documents_indexed'],['Workflow runs','workflow_runs'],['Est. minutes saved','estimated_minutes_saved']].map(([label,key]) => <div className="stat-card" key={key}><div className="stat-label">{label}</div><div className="stat-value">{data.impact[key] || 0}</div>{key==='estimated_minutes_saved'&&<div className="muted" style={{fontSize:8,marginTop:5}}>Based on configurable assumptions</div>}</div>)}
      </div>
      <div className="content-grid">
        <div className="card"><div className="card-header"><h2>Active work</h2><Link href={`/workspace/${id}/tasks`}>View board →</Link></div><div className="card-body stack">
          {data.tasks.filter(task => task.status !== 'done').slice(0,5).map(task => <div className="list-row" key={task.id}><h3>{task.title}</h3><p>{task.expected_output || task.description}</p><div className="meta-row"><span className={`pill ${task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : ''}`}>{task.priority}</span><span className="pill">{task.owner}</span><span className="pill green">{task.milestone}</span></div></div>)}
        </div></div>
        <div className="stack">
          <div className="card"><div className="card-header"><h2>Recent decisions</h2><Link href={`/workspace/${id}/decisions`}>Decisions →</Link></div><div className="card-body">{data.decisions.map(item => <div className="list-row" key={item.id}><h3>{item.content}</h3><p>{item.reason || item.source}</p></div>)}</div></div>
          <div className="card"><div className="card-header"><h2>Open risks</h2><Link href={`/workspace/${id}/risks`}>Risk tracker →</Link></div><div className="card-body">{data.risks.slice(0,3).map(item => <div className="list-row" key={item.id}><h3><ShieldAlert size={11}/> {item.risk}</h3><div className="meta-row"><span className={`pill ${item.severity==='critical'?'red':'amber'}`}>{item.severity}</span><span className="pill">{item.status}</span></div></div>)}</div></div>
          <div className="card"><div className="card-header"><h2>AI activity</h2><span>{data.runs.length} recent</span></div><div className="card-body">{data.runs.length ? data.runs.map(run => <div className="list-row" key={run.id}><h3><Bot size={11}/> {run.input}</h3><div className="meta-row"><span className="pill green">{run.groundedness}</span><span className="muted"><Timer size={10}/> {run.latency_ms} ms</span></div></div>) : <div className="empty">No runs yet. Ask your first workspace question.</div>}</div></div>
          <div className="card"><div className="card-header"><h2>Knowledge</h2><FileText size={13}/></div><div className="card-body">{data.documents.slice(0,3).map(doc => <div className="list-row" key={doc.id}><h3>{doc.name}</h3><p>{doc.chunk_count} indexed chunks</p></div>)}</div></div>
        </div>
      </div>
    </>}
  </div></WorkspaceShell>;
}
