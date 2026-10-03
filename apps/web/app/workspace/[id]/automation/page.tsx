"use client";

import { use, useState } from "react";
import { ArrowRight, CalendarClock, Check, FileText, Play, Presentation, ShieldAlert, Workflow, X } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";

type ProposedRisk = { risk: string; severity: string; evidence: string; suggested_action: string; status: string; source: string };
type WeeklyReport = { headline: string; completed: string[]; in_progress: string[]; blocked: string[]; key_decisions: string[]; risks: string[]; next_week_priorities: string[] };

export default function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text, notify } = useApp();
  const [loading, setLoading] = useState("");
  const [runId, setRunId] = useState("");
  const [risks, setRisks] = useState<ProposedRisk[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [message, setMessage] = useState("");
  const flows = [
    { icon: Presentation, title: text("Meeting → Tasks", "會議 → 任務"), trigger: text("Meeting added", "新增會議"), step: text("Analyze decisions & actions", "分析決策與行動"), action: text("Human review → Task Board", "人工審核 → 任務看板"), runnable: null },
    { icon: Presentation, title: text("Meeting → Decision Memory", "會議 → 決策記憶"), trigger: text("Meeting approved", "會議已核准"), step: text("Extract evidence & reason", "擷取依據與理由"), action: text("Record formal decision", "記錄正式決策"), runnable: null },
    { icon: FileText, title: text("Documents → Knowledge Base", "文件 → 知識庫"), trigger: text("Document uploaded", "文件已上傳"), step: text("Parse, chunk & index", "解析、切分與索引"), action: text("Make knowledge retrievable", "建立可檢索知識"), runnable: null },
    { icon: CalendarClock, title: text("Workspace → Weekly Report", "工作區 → 週報"), trigger: text("Weekly review", "每週檢視"), step: text("Summarize workspace state", "彙整工作區狀態"), action: text("Publish operations report", "產生營運報告"), runnable: "weekly" },
    { icon: ShieldAlert, title: text("Risk Detection", "風險偵測"), trigger: text("Task or decision changed", "任務或決策變更"), step: text("Find blockers & conflicts", "找出阻礙與衝突"), action: text("Review → Risk Tracker", "審核 → 風險追蹤"), runnable: "risk" },
  ] as const;

  async function runRiskDetection() {
    setLoading("risk"); setReport(null); setMessage("");
    try {
      const result = await api<{ run_id: string; risks: ProposedRisk[] }>(`/api/workspaces/${id}/automations/risk-detection`, { method: "POST" });
      setRunId(result.run_id); setRisks(result.risks);
      notify(result.risks.length ? text("Risk proposals are ready for review.", "風險提案已準備好，請進行審核。") : text("No new risks were detected.", "未偵測到新的風險。"));
    } catch (error) { notify(error instanceof Error ? error.message : text("Risk detection failed.", "風險偵測失敗。"), "error"); }
    finally { setLoading(""); }
  }
  async function approveRisks() {
    setLoading("approve");
    try {
      const result = await api<{ created: number; duplicates_skipped: number }>(`/api/workspaces/${id}/automations/risk-detection/approve`, { method: "POST", body: JSON.stringify({ run_id: runId, risks }) });
      const next = text(`${result.created} risks created · ${result.duplicates_skipped} existing risks skipped.`, `已建立 ${result.created} 項風險 · 略過 ${result.duplicates_skipped} 項既有風險。`);
      setMessage(next); setRisks([]); notify(next);
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to save approved risks.", "無法儲存已核准的風險。"), "error"); }
    finally { setLoading(""); }
  }
  async function rejectRisks() {
    setLoading("reject");
    try {
      if (runId) await api(`/api/agent-runs/${runId}/review`, { method: "POST", body: JSON.stringify({ value: "rejected" }) });
      setRisks([]); setRunId("");
      const next = text("Risk proposal rejected. Workspace data was not changed.", "已拒絕風險提案，工作區資料未被修改。");
      setMessage(next); notify(next);
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to reject this run.", "無法拒絕這次執行。"), "error"); }
    finally { setLoading(""); }
  }
  async function runWeekly() {
    setLoading("weekly"); setRisks([]); setMessage("");
    try {
      const result = await api<{ report: WeeklyReport }>(`/api/workspaces/${id}/automations/weekly-report`, { method: "POST" });
      setReport(result.report); notify(text("Weekly report generated.", "週報已產生。"));
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to generate the weekly report.", "無法產生週報。"), "error"); }
    finally { setLoading(""); }
  }

  return <WorkspaceShell id={id} title="Automation"><div className="page">
    <PageTitle eyebrow={text("Automation gallery", "自動化工作流庫")} title={text("Operational workflows", "營運工作流")} description={text("Agents serve repeatable operating workflows rather than acting as standalone chatbots. Write actions remain under human review.", "AI 代理服務於可重複執行的營運流程，而非只是一個聊天機器人；所有資料寫入仍由人工審核。")}/>
    <div className="doc-grid">{flows.map(flow => <div className="doc-card interactive-card" key={flow.title} style={{ minHeight: 220 }}><flow.icon size={18}/><h3>{flow.title}</h3><div className="flow" style={{ marginTop: 15 }}><div className="flow-item"><span>{flow.trigger}</span><ArrowRight size={11}/></div><div className="flow-item active"><span>{flow.step}</span><Workflow size={11}/></div><div className="flow-item"><span>{flow.action}</span></div></div>
      {flow.runnable === "risk" && <button className="button small" style={{ marginTop: 12 }} onClick={runRiskDetection} disabled={!!loading}><Play size={11}/>{loading === "risk" ? text("Detecting…", "偵測中…") : text("Run now", "立即執行")}</button>}
      {flow.runnable === "weekly" && <button className="button small" style={{ marginTop: 12 }} onClick={runWeekly} disabled={!!loading}><Play size={11}/>{loading === "weekly" ? text("Generating…", "產生中…") : text("Run now", "立即執行")}</button>}
    </div>)}</div>
    {message && <div className="demo-badge result-enter" style={{ marginTop: 18 }}>{message}</div>}
    {!!risks.length && <div className="card result-enter" style={{ marginTop: 18 }}><div className="card-header"><h2>{text("Review proposed risks", "審核風險提案")}</h2><span className="pill amber">{text("Pending approval", "待核准")}</span></div><div className="card-body stack">
      {risks.map((item, index) => <div className="result-section" key={`${item.evidence}-${index}`}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h3>{item.risk}</h3><p>{item.evidence}</p><div className="meta-row"><span className={`pill ${item.severity === "critical" ? "red" : "amber"}`}>{item.severity}</span><span className="pill">{item.source}</span></div></div><button className="button small" onClick={() => setRisks(current => current.filter((_, itemIndex) => itemIndex !== index))}><X size={11}/>{text("Remove", "移除")}</button></div><p><strong>{text("Suggested action:", "建議行動：")}</strong> {item.suggested_action}</p></div>)}
      <div style={{ display: "flex", gap: 8 }}><button className="button accent" onClick={approveRisks} disabled={!!loading}><Check size={13}/>{loading === "approve" ? text("Saving…", "儲存中…") : text("Approve selected risks", "核准已選風險")}</button><button className="button" onClick={rejectRisks} disabled={!!loading}>{loading === "reject" ? text("Rejecting…", "拒絕中…") : text("Reject run", "拒絕本次執行")}</button></div>
    </div></div>}
    {report && <div className="card result-enter" style={{ marginTop: 18 }}><div className="card-header"><h2>{text("Weekly operations report", "每週營運報告")}</h2><span className="pill green">{text("Generated", "已產生")}</span></div><div className="card-body answer"><div className="answer-main">{report.headline}</div>{[[text("Completed", "已完成"), report.completed], [text("In progress", "進行中"), report.in_progress], [text("Blocked", "受阻"), report.blocked], [text("Key decisions", "關鍵決策"), report.key_decisions], [text("Risks", "風險"), report.risks], [text("Next priorities", "後續優先事項"), report.next_week_priorities]].map(([title, items]) => <div className="answer-section" key={title as string}><h4>{title as string}</h4><ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></div>}
  </div></WorkspaceShell>;
}
