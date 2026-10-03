"use client";

import { use, useEffect, useState } from "react";
import { Activity, Gauge, ThumbsDown, ThumbsUp } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

type Evaluation={summary:{total_runs:number;avg_latency_ms:number|null;helpful:number;not_helpful:number;benchmarked_accuracy:null};runs:AgentRun[];note:string};

export default function EvaluationPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const [data,setData]=useState<Evaluation|null>(null);
  function load(){api<Evaluation>(`/api/workspaces/${id}/evaluation`).then(setData)}useEffect(load,[id]);
  async function feedback(run:string,value:string){await api(`/api/agent-runs/${run}/feedback`,{method:'POST',body:JSON.stringify({value})});load()}
  return <WorkspaceShell id={id} title="Evaluation"><div className="page">
    <PageTitle eyebrow="Evidence, not vanity metrics" title="Evaluation & Observability" description="Inspect retrieval scores, context usage, latency, tool calls, groundedness, and explicit human feedback for every run."/>
    {!data?<div className="loading">Loading evaluation traces…</div>:<><div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
      <div className="stat-card"><div className="stat-label">Agent runs</div><div className="stat-value">{data.summary.total_runs}</div></div>
      <div className="stat-card"><div className="stat-label">Average latency</div><div className="stat-value">{data.summary.avg_latency_ms??'—'}<small style={{fontSize:10}}> ms</small></div></div>
      <div className="stat-card"><div className="stat-label">Helpful ratings</div><div className="stat-value">{data.summary.helpful}</div></div>
      <div className="stat-card"><div className="stat-label">Benchmark accuracy</div><div className="stat-value">—</div></div>
    </div><div className="card"><div className="card-header"><h2>Run-level metrics</h2><span>{data.note}</span></div><div className="table-wrap"><table className="table"><thead><tr><th>Request</th><th>Groundedness</th><th>Latency</th><th>Context</th><th>Tools</th><th>Feedback</th></tr></thead><tbody>{data.runs.map(run=><tr key={run.id}><td><strong>{run.input}</strong><br/><span className="muted">{run.agent}</span></td><td><span className={`pill ${run.groundedness==='SUPPORTED'?'green':run.groundedness==='UNSUPPORTED'?'red':'amber'}`}>{run.groundedness}</span></td><td>{run.latency_ms} ms</td><td>{run.context_size} tokens</td><td>{run.tool_calls.length}</td><td><div className="feedback"><button className={run.feedback==='helpful'?'selected':''} onClick={()=>feedback(run.id,'helpful')}><ThumbsUp size={12}/></button><button className={run.feedback==='not_helpful'?'selected':''} onClick={()=>feedback(run.id,'not_helpful')}><ThumbsDown size={12}/></button></div></td></tr>)}{!data.runs.length&&<tr><td colSpan={6}><div className="empty"><Activity size={22}/><br/>Run the workspace agent to create an evaluation trace.</div></td></tr>}</tbody></table></div></div>
    {data.runs[0]?.retrieval?.length>0&&<div className="card" style={{marginTop:15}}><div className="card-header"><h2>Top-K retrieval · latest run</h2><Gauge size={14}/></div><div className="table-wrap"><table className="table"><thead><tr><th>Source</th><th>Excerpt</th><th>Vector</th><th>Keyword</th><th>Fused score</th></tr></thead><tbody>{data.runs[0].retrieval.map(item=><tr key={item.chunk_id}><td><strong>{item.source}</strong></td><td className="muted">{item.excerpt}</td><td>{item.vector_score!==undefined?item.vector_score.toFixed(3):'—'}</td><td>{item.keyword_score!==undefined?item.keyword_score.toFixed(3):'—'}</td><td><span className="bar-track"><span className="bar-fill" style={{width:`${item.score*100}%`,display:'block'}}/></span>{item.score.toFixed(3)}</td></tr>)}</tbody></table></div></div>}
    </>}
  </div></WorkspaceShell>
}

