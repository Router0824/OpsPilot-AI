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
    { icon: Presentation, title: text("Meeting → Tasks", "会议 → 任务"), trigger: text("Meeting added", "添加会议"), step: text("Analyze decisions & actions", "分析决策与行动"), action: text("Human review → Task Board", "人工审核 → 任务看板"), runnable: null },
    { icon: Presentation, title: text("Meeting → Decision Memory", "会议 → 决策记忆"), trigger: text("Meeting approved", "会议已批准"), step: text("Extract evidence & reason", "提取依据与理由"), action: text("Record formal decision", "记录正式决策"), runnable: null },
    { icon: FileText, title: text("Documents → Knowledge Base", "文档 → 知识库"), trigger: text("Document uploaded", "文档已上传"), step: text("Parse, chunk & index", "解析、切分与索引"), action: text("Make knowledge retrievable", "创建可检索知识"), runnable: null },
    { icon: CalendarClock, title: text("Workspace → Weekly Report", "工作区 → 周报"), trigger: text("Weekly review", "每周查看"), step: text("Summarize workspace state", "汇总工作区状态"), action: text("Publish operations report", "生成运营报告"), runnable: "weekly" },
    { icon: ShieldAlert, title: text("Risk Detection", "风险检测"), trigger: text("Task or decision changed", "任务或决策变更"), step: text("Find blockers & conflicts", "找出阻碍与冲突"), action: text("Review → Risk Tracker", "审核 → 风险跟踪"), runnable: "risk" },
  ] as const;

  async function runRiskDetection() {
    setLoading("risk"); setReport(null); setMessage("");
    try {
      const result = await api<{ run_id: string; risks: ProposedRisk[] }>(`/api/workspaces/${id}/automations/risk-detection`, { method: "POST" });
      setRunId(result.run_id); setRisks(result.risks);
      notify(result.risks.length ? text("Risk proposals are ready for review.", "风险提案已准备好，请进行审核。") : text("No new risks were detected.", "未检测到新的风险。"));
    } catch (error) { notify(error instanceof Error ? error.message : text("Risk detection failed.", "风险检测失败。"), "error"); }
    finally { setLoading(""); }
  }
  async function approveRisks() {
    setLoading("approve");
    try {
      const result = await api<{ created: number; duplicates_skipped: number }>(`/api/workspaces/${id}/automations/risk-detection/approve`, { method: "POST", body: JSON.stringify({ run_id: runId, risks }) });
      const next = text(`${result.created} risks created · ${result.duplicates_skipped} existing risks skipped.`, `已创建 ${result.created} 项风险 · 略过 ${result.duplicates_skipped} 项既有风险。`);
      setMessage(next); setRisks([]); notify(next);
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to save approved risks.", "无法保存已批准的风险。"), "error"); }
    finally { setLoading(""); }
  }
  async function rejectRisks() {
    setLoading("reject");
    try {
      if (runId) await api(`/api/agent-runs/${runId}/review`, { method: "POST", body: JSON.stringify({ value: "rejected" }) });
      setRisks([]); setRunId("");
      const next = text("Risk proposal rejected. Workspace data was not changed.", "已拒绝风险提案，工作区数据未被修改。");
      setMessage(next); notify(next);
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to reject this run.", "无法拒绝这次运行。"), "error"); }
    finally { setLoading(""); }
  }
  async function runWeekly() {
    setLoading("weekly"); setRisks([]); setMessage("");
    try {
      const result = await api<{ report: WeeklyReport }>(`/api/workspaces/${id}/automations/weekly-report`, { method: "POST" });
      setReport(result.report); notify(text("Weekly report generated.", "周报已生成。"));
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to generate the weekly report.", "无法生成周报。"), "error"); }
    finally { setLoading(""); }
  }

  return <WorkspaceShell id={id} title="Automation"><div className="page">
    <PageTitle eyebrow={text("Automation gallery", "自动化工作流库")} title={text("Operational workflows", "运营工作流")} description={text("Agents serve repeatable operating workflows rather than acting as standalone chatbots. Write actions remain under human review.", "AI 代理服务于可重复运行的运营流程，而非只是一个聊天机器人；所有数据写入仍由人工审核。")}/>
    <div className="doc-grid">{flows.map(flow => <div className="doc-card interactive-card" key={flow.title} style={{ minHeight: 220 }}><flow.icon size={18}/><h3>{flow.title}</h3><div className="flow" style={{ marginTop: 15 }}><div className="flow-item"><span>{flow.trigger}</span><ArrowRight size={11}/></div><div className="flow-item active"><span>{flow.step}</span><Workflow size={11}/></div><div className="flow-item"><span>{flow.action}</span></div></div>
      {flow.runnable === "risk" && <button className="button small" style={{ marginTop: 12 }} onClick={runRiskDetection} disabled={!!loading}><Play size={11}/>{loading === "risk" ? text("Detecting…", "检测中…") : text("Run now", "立即运行")}</button>}
      {flow.runnable === "weekly" && <button className="button small" style={{ marginTop: 12 }} onClick={runWeekly} disabled={!!loading}><Play size={11}/>{loading === "weekly" ? text("Generating…", "生成中…") : text("Run now", "立即运行")}</button>}
    </div>)}</div>
    {message && <div className="demo-badge result-enter" style={{ marginTop: 18 }}>{message}</div>}
    {!!risks.length && <div className="card result-enter" style={{ marginTop: 18 }}><div className="card-header"><h2>{text("Review proposed risks", "审核风险提案")}</h2><span className="pill amber">{text("Pending approval", "待批准")}</span></div><div className="card-body stack">
      {risks.map((item, index) => <div className="result-section" key={`${item.evidence}-${index}`}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><h3>{item.risk}</h3><p>{item.evidence}</p><div className="meta-row"><span className={`pill ${item.severity === "critical" ? "red" : "amber"}`}>{item.severity}</span><span className="pill">{item.source}</span></div></div><button className="button small" onClick={() => setRisks(current => current.filter((_, itemIndex) => itemIndex !== index))}><X size={11}/>{text("Remove", "移除")}</button></div><p><strong>{text("Suggested action:", "建议行动：")}</strong> {item.suggested_action}</p></div>)}
      <div style={{ display: "flex", gap: 8 }}><button className="button accent" onClick={approveRisks} disabled={!!loading}><Check size={13}/>{loading === "approve" ? text("Saving…", "保存中…") : text("Approve selected risks", "批准已选风险")}</button><button className="button" onClick={rejectRisks} disabled={!!loading}>{loading === "reject" ? text("Rejecting…", "拒绝中…") : text("Reject run", "拒绝本次运行")}</button></div>
    </div></div>}
    {report && <div className="card result-enter" style={{ marginTop: 18 }}><div className="card-header"><h2>{text("Weekly operations report", "每周运营报告")}</h2><span className="pill green">{text("Generated", "已生成")}</span></div><div className="card-body answer"><div className="answer-main">{report.headline}</div>{[[text("Completed", "已完成"), report.completed], [text("In progress", "进行中"), report.in_progress], [text("Blocked", "受阻"), report.blocked], [text("Key decisions", "关键决策"), report.key_decisions], [text("Risks", "风险"), report.risks], [text("Next priorities", "后续优先事项"), report.next_week_priorities]].map(([title, items]) => <div className="answer-section" key={title as string}><h4>{title as string}</h4><ul>{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul></div>)}</div></div>}
  </div></WorkspaceShell>;
}
