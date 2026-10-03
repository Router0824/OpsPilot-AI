"use client";

import { use, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { MeetingAnalysis } from "@/lib/types";

const sample = `We should compare MemGPT and MemoryBank. Alice will implement baseline A. Bob will investigate retrieval evaluation. Deadline is next Friday. We decided not to use a naive conversation buffer because it resurfaces stale assumptions. The main risk is that we do not yet have labelled retrieval queries.`;

export default function MeetingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text, notify } = useApp();
  const [notes, setNotes] = useState(sample);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewing, setReviewing] = useState<"save" | "reject" | "">("");
  async function analyze() { setLoading(true); setSaved(false); try { const result = await api<{run_id:string;analysis: MeetingAnalysis}>(`/api/workspaces/${id}/meetings/analyze`, { method: "POST", body: JSON.stringify({notes}) }); setAnalysis(result.analysis); setRunId(result.run_id); notify(text("Meeting analysis is ready for review.", "會議分析已完成，請確認內容。")); } catch(error) { notify(error instanceof Error ? error.message : text("Meeting analysis failed.", "會議分析失敗。"), "error"); } finally { setLoading(false); } }
  async function save() { if (!analysis) return; setReviewing("save"); try { await api(`/api/workspaces/${id}/meetings/save`, { method: "POST", body: JSON.stringify({analysis,run_id:runId}) }); setSaved(true); notify(text("Meeting outcomes saved to the workspace.", "會議結果已儲存至工作區。")); } catch(error) { notify(error instanceof Error ? error.message : text("Unable to save meeting outcomes.", "無法儲存會議結果。"), "error"); } finally { setReviewing(""); } }
  async function reject() { setReviewing("reject"); try { if(runId) await api(`/api/agent-runs/${runId}/review`,{method:'POST',body:JSON.stringify({value:'rejected'})}); setAnalysis(null); setRunId(''); notify(text("Proposal rejected. Workspace data was not changed.", "提案已拒絕，工作區資料未被修改。")); } catch(error) { notify(error instanceof Error ? error.message : text("Unable to reject the proposal.", "無法拒絕提案。"), "error"); } finally { setReviewing(""); } }
  return <WorkspaceShell id={id} title="Meeting Intelligence"><div className="page">
    <PageTitle eyebrow={text("Meeting → Decisions → Actions", "會議 → 決策 → 行動")} title={text("Meeting Intelligence", "會議智慧")} description={text("Extract structured decisions, accountable action items, risks, and open questions—then save them into durable workspace state.", "提取結構化決策、責任明確的行動項目、風險與待確認問題，再儲存為可持續使用的工作區狀態。")}/>
    <div className="content-grid">
      <div className="card interactive-card"><div className="card-header"><h2>{text("Meeting notes", "會議記錄")}</h2><span>{text("Structured extraction", "結構化提取")}</span></div><div className="card-body"><div className="field"><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={text("Paste meeting notes…", "貼上會議記錄…")}/></div><button className="button primary" style={{marginTop:12}} onClick={analyze} disabled={loading || notes.length < 10}><Sparkles size={14}/>{loading ? text("Analyzing…", "分析中…") : text("Analyze meeting", "分析會議")}</button></div></div>
      <div className="card interactive-card"><div className="card-header"><h2>{text("Review & Confirm", "檢視並確認")}</h2>{analysis && <span className="pill amber">{text("Pending approval", "等待確認")}</span>}</div><div className="card-body">
        {!analysis ? <div className="empty">{text("Decisions and actions will appear here.", "決策與行動項目會顯示在這裡。")}</div> : <div className="meeting-result result-enter">
          <div className="result-section"><h3>{text("Summary", "摘要")}</h3><p>{analysis.summary}</p></div>
          <div className="result-section"><h3>{text("Decisions", "決策")} · {analysis.decisions.length}</h3>{analysis.decisions.map((item,index) => <div className="field" key={`${item.decision}-${index}`} style={{marginBottom:9}}><input value={item.decision} onChange={event=>setAnalysis({...analysis,decisions:analysis.decisions.map((value,i)=>i===index?{...value,decision:event.target.value}:value)})}/><p>{text("Confidence", "信心分數")} {Math.round(item.confidence*100)}% · {item.reason||text('No reason captured', '未擷取原因')}</p></div>)}</div>
          <div className="result-section"><h3>{text("Action items", "行動項目")} · {analysis.action_items.length}</h3>{analysis.action_items.map((item,index) => <div className="field" key={`${item.task}-${index}`} style={{marginBottom:9}}><input value={item.task} onChange={event=>setAnalysis({...analysis,action_items:analysis.action_items.map((value,i)=>i===index?{...value,task:event.target.value}:value)})}/><p>{item.owner} · {item.deadline || text('No deadline', '無期限')} · {item.priority}</p></div>)}</div>
          <div className="result-section"><h3>{text("Risks", "風險")}</h3>{analysis.risks.map(item => <p key={item.risk}><strong>{item.risk}</strong><br/><span className="muted">{item.severity} · {item.suggested_action}</span></p>)}</div>
          <div className="result-section"><h3>{text("Follow-up questions", "後續問題")}</h3><ul>{analysis.follow_up_questions.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div style={{display:'flex',gap:8}}><button className={`button ${saved ? '' : 'accent'}`} onClick={save} disabled={saved || !!reviewing}>{saved ? <><Check size={14}/>{text("Approved & saved", "已確認並儲存")}</> : reviewing === "save" ? text("Saving…", "儲存中…") : text("Approve & save to workspace", "確認並儲存至工作區")}</button><button className="button" onClick={reject} disabled={saved || !!reviewing}>{reviewing === "reject" ? text("Rejecting…", "拒絕中…") : text("Reject", "拒絕")}</button></div>
        </div>}
      </div></div>
    </div>
  </div></WorkspaceShell>;
}
