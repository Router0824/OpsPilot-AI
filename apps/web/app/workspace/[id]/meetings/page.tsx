"use client";

import { use, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { MeetingAnalysis } from "@/lib/types";

const sample = `We should compare MemGPT and MemoryBank. Alice will implement baseline A. Bob will investigate retrieval evaluation. Deadline is next Friday. We decided not to use a naive conversation buffer because it resurfaces stale assumptions. The main risk is that we do not yet have labelled retrieval queries.`;

export default function MeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [notes, setNotes] = useState(sample);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  async function analyze() { setLoading(true); setSaved(false); try { const result = await api<{run_id:string;analysis: MeetingAnalysis}>(`/api/workspaces/${id}/meetings/analyze`, { method: "POST", body: JSON.stringify({notes}) }); setAnalysis(result.analysis); setRunId(result.run_id); } finally { setLoading(false); } }
  async function save() { if (!analysis) return; await api(`/api/workspaces/${id}/meetings/save`, { method: "POST", body: JSON.stringify({analysis,run_id:runId}) }); setSaved(true); }
  async function reject() { if(runId) await api(`/api/agent-runs/${runId}/review`,{method:'POST',body:JSON.stringify({value:'rejected'})}); setAnalysis(null); setRunId(''); }
  return <WorkspaceShell id={id} title="Meeting Intelligence"><div className="page">
    <PageTitle eyebrow="Meeting → Decisions → Actions" title="Meeting Intelligence" description="Extract structured decisions, accountable action items, risks, and open questions—then save them into durable workspace state." />
    <div className="content-grid">
      <div className="card"><div className="card-header"><h2>Meeting notes</h2><span>Structured extraction</span></div><div className="card-body"><div className="field"><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Paste meeting notes…"/></div><button className="button primary" style={{marginTop:12}} onClick={analyze} disabled={loading || notes.length < 10}><Sparkles size={14}/>{loading ? "Analyzing…" : "Analyze meeting"}</button></div></div>
      <div className="card"><div className="card-header"><h2>Review & Confirm</h2>{analysis && <span className="pill amber">Pending approval</span>}</div><div className="card-body">
        {!analysis ? <div className="empty">Decisions and actions will appear here.</div> : <div className="meeting-result">
          <div className="result-section"><h3>Summary</h3><p>{analysis.summary}</p></div>
          <div className="result-section"><h3>Decisions · {analysis.decisions.length}</h3>{analysis.decisions.map((item,index) => <div className="field" key={`${item.decision}-${index}`} style={{marginBottom:9}}><input value={item.decision} onChange={event=>setAnalysis({...analysis,decisions:analysis.decisions.map((value,i)=>i===index?{...value,decision:event.target.value}:value)})}/><p>Confidence {Math.round(item.confidence*100)}% · {item.reason||'No reason captured'}</p></div>)}</div>
          <div className="result-section"><h3>Action items · {analysis.action_items.length}</h3>{analysis.action_items.map((item,index) => <div className="field" key={`${item.task}-${index}`} style={{marginBottom:9}}><input value={item.task} onChange={event=>setAnalysis({...analysis,action_items:analysis.action_items.map((value,i)=>i===index?{...value,task:event.target.value}:value)})}/><p>{item.owner} · {item.deadline || 'No deadline'} · {item.priority}</p></div>)}</div>
          <div className="result-section"><h3>Risks</h3>{analysis.risks.map(item => <p key={item.risk}><strong>{item.risk}</strong><br/><span className="muted">{item.severity} · {item.suggested_action}</span></p>)}</div>
          <div className="result-section"><h3>Follow-up questions</h3><ul>{analysis.follow_up_questions.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div style={{display:'flex',gap:8}}><button className={`button ${saved ? '' : 'accent'}`} onClick={save} disabled={saved}>{saved ? <><Check size={14}/>Approved & saved</> : "Approve & save to workspace"}</button><button className="button" onClick={reject} disabled={saved}>Reject</button></div>
        </div>}
      </div></div>
    </div>
  </div></WorkspaceShell>;
}
