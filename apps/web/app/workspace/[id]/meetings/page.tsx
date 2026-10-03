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
  async function analyze() { setLoading(true); setSaved(false); try { const result = await api<{run_id:string;analysis: MeetingAnalysis}>(`/api/workspaces/${id}/meetings/analyze`, { method: "POST", body: JSON.stringify({notes}) }); setAnalysis(result.analysis); setRunId(result.run_id); notify(text("Meeting analysis is ready for review.", "会议分析已完成，请确认内容。")); } catch(error) { notify(error instanceof Error ? error.message : text("Meeting analysis failed.", "会议分析失败。"), "error"); } finally { setLoading(false); } }
  async function save() { if (!analysis) return; setReviewing("save"); try { await api(`/api/workspaces/${id}/meetings/save`, { method: "POST", body: JSON.stringify({analysis,run_id:runId}) }); setSaved(true); notify(text("Meeting outcomes saved to the workspace.", "会议结果已保存至工作区。")); } catch(error) { notify(error instanceof Error ? error.message : text("Unable to save meeting outcomes.", "无法保存会议结果。"), "error"); } finally { setReviewing(""); } }
  async function reject() { setReviewing("reject"); try { if(runId) await api(`/api/agent-runs/${runId}/review`,{method:'POST',body:JSON.stringify({value:'rejected'})}); setAnalysis(null); setRunId(''); notify(text("Proposal rejected. Workspace data was not changed.", "提案已拒绝，工作区数据未被修改。")); } catch(error) { notify(error instanceof Error ? error.message : text("Unable to reject the proposal.", "无法拒绝提案。"), "error"); } finally { setReviewing(""); } }
  return <WorkspaceShell id={id} title="Meeting Intelligence"><div className="page">
    <PageTitle eyebrow={text("Meeting → Decisions → Actions", "会议 → 决策 → 行动")} title={text("Meeting Intelligence", "会议智能")} description={text("Extract structured decisions, accountable action items, risks, and open questions—then save them into durable workspace state.", "提取结构化决策、责任明确的行动项目、风险与待确认问题，再保存为可持续使用的工作区状态。")}/>
    <div className="content-grid">
      <div className="card interactive-card"><div className="card-header"><h2>{text("Meeting notes", "会议记录")}</h2><span>{text("Structured extraction", "结构化提取")}</span></div><div className="card-body"><div className="field"><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder={text("Paste meeting notes…", "粘贴会议记录…")}/></div><button className="button primary" style={{marginTop:12}} onClick={analyze} disabled={loading || notes.length < 10}><Sparkles size={14}/>{loading ? text("Analyzing…", "分析中…") : text("Analyze meeting", "分析会议")}</button></div></div>
      <div className="card interactive-card"><div className="card-header"><h2>{text("Review & Confirm", "查看并确认")}</h2>{analysis && <span className="pill amber">{text("Pending approval", "等待确认")}</span>}</div><div className="card-body">
        {!analysis ? <div className="empty">{text("Decisions and actions will appear here.", "决策与行动项目会显示在这里。")}</div> : <div className="meeting-result result-enter">
          <div className="result-section"><h3>{text("Summary", "摘要")}</h3><p>{analysis.summary}</p></div>
          <div className="result-section"><h3>{text("Decisions", "决策")} · {analysis.decisions.length}</h3>{analysis.decisions.map((item,index) => <div className="field" key={`${item.decision}-${index}`} style={{marginBottom:9}}><input value={item.decision} onChange={event=>setAnalysis({...analysis,decisions:analysis.decisions.map((value,i)=>i===index?{...value,decision:event.target.value}:value)})}/><p>{text("Confidence", "置信度")} {Math.round(item.confidence*100)}% · {item.reason||text('No reason captured', '未提取原因')}</p></div>)}</div>
          <div className="result-section"><h3>{text("Action items", "行动项目")} · {analysis.action_items.length}</h3>{analysis.action_items.map((item,index) => <div className="field" key={`${item.task}-${index}`} style={{marginBottom:9}}><input value={item.task} onChange={event=>setAnalysis({...analysis,action_items:analysis.action_items.map((value,i)=>i===index?{...value,task:event.target.value}:value)})}/><p>{item.owner} · {item.deadline || text('No deadline', '无期限')} · {item.priority}</p></div>)}</div>
          <div className="result-section"><h3>{text("Risks", "风险")}</h3>{analysis.risks.map(item => <p key={item.risk}><strong>{item.risk}</strong><br/><span className="muted">{item.severity} · {item.suggested_action}</span></p>)}</div>
          <div className="result-section"><h3>{text("Follow-up questions", "后续问题")}</h3><ul>{analysis.follow_up_questions.map(item => <li key={item}>{item}</li>)}</ul></div>
          <div style={{display:'flex',gap:8}}><button className={`button ${saved ? '' : 'accent'}`} onClick={save} disabled={saved || !!reviewing}>{saved ? <><Check size={14}/>{text("Approved & saved", "已确认并保存")}</> : reviewing === "save" ? text("Saving…", "保存中…") : text("Approve & save to workspace", "确认并保存至工作区")}</button><button className="button" onClick={reject} disabled={saved || !!reviewing}>{reviewing === "reject" ? text("Rejecting…", "拒绝中…") : text("Reject", "拒绝")}</button></div>
        </div>}
      </div></div>
    </div>
  </div></WorkspaceShell>;
}
