"use client";

import { use, useState } from "react";
import { ArrowRight, CalendarClock, Check, FileText, Play, Presentation, ShieldAlert, Workflow, X } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";

type ProposedRisk = { risk: string; severity: string; evidence: string; suggested_action: string; status: string; source: string };
type WeeklyReport = { headline: string; completed: string[]; in_progress: string[]; blocked: string[]; key_decisions: string[]; risks: string[]; next_week_priorities: string[] };

const flows = [
  { icon: Presentation, title: "Meeting → Tasks", trigger: "Meeting added", step: "Analyze decisions & actions", action: "Human review → Task Board", runnable: null },
  { icon: Presentation, title: "Meeting → Decision Memory", trigger: "Meeting approved", step: "Extract evidence & reason", action: "Record formal decision", runnable: null },
  { icon: FileText, title: "Documents → Knowledge Base", trigger: "Document uploaded", step: "Parse, chunk & index", action: "Make knowledge retrievable", runnable: null },
  { icon: CalendarClock, title: "Workspace → Weekly Report", trigger: "Weekly review", step: "Summarize workspace state", action: "Publish operations report", runnable: "weekly" },
  { icon: ShieldAlert, title: "Risk Detection", trigger: "Task or decision changed", step: "Find blockers & conflicts", action: "Review → Risk Tracker", runnable: "risk" },
] as const;

export default function AutomationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState("");
  const [runId, setRunId] = useState("");
  const [risks, setRisks] = useState<ProposedRisk[]>([]);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [message, setMessage] = useState("");

  async function runRiskDetection() {
    setLoading("risk"); setReport(null); setMessage("");
    try {
      const result = await api<{ run_id: string; risks: ProposedRisk[] }>(`/api/workspaces/${id}/automations/risk-detection`, { method: "POST" });
      setRunId(result.run_id); setRisks(result.risks);
    } finally { setLoading(""); }
  }

  async function approveRisks() {
    setLoading("approve");
    try {
      const result = await api<{ created: number; duplicates_skipped: number }>(`/api/workspaces/${id}/automations/risk-detection/approve`, { method: "POST", body: JSON.stringify({ run_id: runId, risks }) });
      setMessage(`${result.created} risks created · ${result.duplicates_skipped} existing risks skipped.`); setRisks([]);
    } finally { setLoading(""); }
  }

  async function rejectRisks() {
    if (runId) await api(`/api/agent-runs/${runId}/review`, { method: "POST", body: JSON.stringify({ value: "rejected" }) });
    setRisks([]); setRunId(""); setMessage("Risk proposal rejected. Workspace data was not changed.");
  }

  async function runWeekly() {
    setLoading("weekly"); setRisks([]); setMessage("");
    try {
      const result = await api<{ report: WeeklyReport }>(`/api/workspaces/${id}/automations/weekly-report`, { method: "POST" });
      setReport(result.report);
    } finally { setLoading(""); }
  }

  return <WorkspaceShell id={id} title="Workflow Automation"><div className="page">
    <PageTitle eyebrow="Automation gallery" title="Operational workflows" description="Agents serve repeatable operating workflows rather than acting as standalone chatbots. Write actions remain under human review." />
    <div className="doc-grid">{flows.map(flow => <div className="doc-card" key={flow.title} style={{ minHeight: 220 }}>
      <flow.icon size={18} /><h3>{flow.title}</h3>
      <div className="flow" style={{ marginTop: 15 }}><div className="flow-item"><span>{flow.trigger}</span><ArrowRight size={11} /></div><div className="flow-item active"><span>{flow.step}</span><Workflow size={11} /></div><div className="flow-item"><span>{flow.action}</span></div></div>
      {flow.runnable === "risk" && <button className="button small" style={{ marginTop: 12 }} onClick={runRiskDetection} disabled={!!loading}><Play size={11} />{loading === "risk" ? "Detecting…" : "Run now"}</button>}
      {flow.runnable === "weekly" && <button className="button small" style={{ marginTop: 12 }} onClick={runWeekly} disabled={!!loading}><Play size={11} />{loading === "weekly" ? "Generating…" : "Run now"}</button>}
    </div>)}</div>

    {message && <div className="demo-badge" style={{ marginTop: 18 }}>{message}</div>}
    {!!risks.length && <div className="card" style={{ marginTop: 18 }}><div className="card-header"><h2>Review proposed risks</h2><span className="pill amber">Pending approval</span></div><div className="card-body stack">
      {risks.map((item, index) => <div className="result-section" key={`${item.evidence}-${index}`}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h3>{item.risk}</h3><p>{item.evidence}</p><div className="meta-row"><span className={`pill ${item.severity === "critical" ? "red" : "amber"}`}>{item.severity}</span><span className="pill">{item.source}</span></div></div><button className="button small" onClick={() => setRisks(risks.filter((_, itemIndex) => itemIndex !== index))}><X size={11} />Remove</button></div><p><strong>Suggested action:</strong> {item.suggested_action}</p></div>)}
      <div style={{ display: "flex", gap: 8 }}><button className="button accent" onClick={approveRisks} disabled={loading === "approve"}><Check size={13} />{loading === "approve" ? "Saving…" : "Approve selected risks"}</button><button className="button" onClick={rejectRisks}>Reject run</button></div>
    </div></div>}

    {report && <div className="card" style={{ marginTop: 18 }}><div className="card-header"><h2>Weekly operations report</h2><span className="pill green">Generated</span></div><div className="card-body answer"><div className="answer-main">{report.headline}</div>{[["Completed", report.completed], ["In progress", report.in_progress], ["Blocked", report.blocked], ["Key decisions", report.key_decisions], ["Risks", report.risks], ["Next priorities", report.next_week_priorities]].map(([title, items]) => <div className="answer-section" key={title as string}><h4>{title as string}</h4><ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></div>}
  </div></WorkspaceShell>;
}
