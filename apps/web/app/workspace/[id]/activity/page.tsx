"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

type ActivityData = { summary: { total_runs: number; completed_runs: number; pending_reviews: number; approval_rate: number | null }; workflows: string[]; runs: AgentRun[] };
const ZH_LABELS: Record<string, string> = { completed: "已完成", pending_review: "待審核", rejected: "已拒絕", approved: "已核准", helpful: "有幫助", not_helpful: "沒有幫助", meeting_analysis: "會議分析", risk_detection: "風險偵測", weekly_report: "每週報告", task_planning: "任務規劃", workspace_chat: "工作區問答", copilot: "營運助理", text: "文字", workspace: "工作區", meeting: "會議", document: "文件" };
function englishLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }
function formattedOutput(output: string) { try { return JSON.stringify(JSON.parse(output), null, 2); } catch { return output; } }
function activityPath(id: string, workflow: string, status: string) { const query = new URLSearchParams(); if (workflow) query.set("workflow", workflow); if (status) query.set("status", status); return `/api/workspaces/${id}/activity?${query.toString()}`; }

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, text, notify } = useApp();
  const [data, setData] = useState<ActivityData | null>(null);
  const [workflow, setWorkflow] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const label = useCallback((value: string) => locale === "zh" ? ZH_LABELS[value] || value.replaceAll("_", " ") : englishLabel(value), [locale]);
  const reviewLabel = (run: AgentRun) => run.status === "pending_review" ? text("Pending review", "待審核") : run.human_approved === true ? text("Approved", "已核准") : run.human_approved === false ? text("Rejected", "已拒絕") : text("Not required", "不需審核");
  const reviewTone = (run: AgentRun) => run.status === "pending_review" ? "amber" : run.human_approved === true ? "green" : run.human_approved === false ? "red" : "";

  const load = useCallback(async (showNotice = true) => {
    setLoading(true); setError("");
    try {
      const result = await api<ActivityData>(activityPath(id, workflow, status)); setData(result);
      setSelectedId(current => result.runs.some(run => run.id === current) ? current : result.runs[0]?.id || "");
      if (showNotice) notify(text("Activity refreshed.", "活動紀錄已更新。"));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : text("Unable to load workflow activity.", "無法載入工作流活動紀錄。"); setError(message);
      if (showNotice) notify(message, "error");
    } finally { setLoading(false); }
  }, [id, notify, status, text, workflow]);

  useEffect(() => {
    let active = true;
    api<ActivityData>(activityPath(id, workflow, status)).then(result => {
      if (!active) return;
      setData(result); setError(""); setSelectedId(current => result.runs.some(run => run.id === current) ? current : result.runs[0]?.id || ""); setLoading(false);
    }).catch((requestError: unknown) => {
      if (!active) return;
      setError(requestError instanceof Error ? requestError.message : text("Unable to load workflow activity.", "無法載入工作流活動紀錄。")); setLoading(false);
    });
    return () => { active = false; };
  }, [id, status, text, workflow]);
  const selected = useMemo(() => data?.runs.find(run => run.id === selectedId) || null, [data, selectedId]);

  return <WorkspaceShell id={id} title="AI Activity"><div className="page">
    <PageTitle eyebrow={text("Execution audit", "執行稽核")} title={text("AI Activity & Approval Audit", "AI 活動與核准稽核")} description={text("Inspect every operational workflow, its inputs, tools, outcome, human-review state, and user feedback in one traceable timeline.", "在可追溯的時間軸中，檢視每個營運工作流的輸入、工具、結果、人工審核狀態與使用者回饋。")}/>
    {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
    {!data ? <div className="loading">{loading ? text("Loading workflow audit…", "正在載入工作流稽核…") : text("Activity data is unavailable.", "目前無法取得活動資料。")}</div> : <>
      <div className="stats-grid audit-stats"><div className="stat-card"><div className="stat-label">{text("Workflow runs", "工作流執行")}</div><div className="stat-value">{data.summary.total_runs}</div></div><div className="stat-card"><div className="stat-label">{text("Completed", "已完成")}</div><div className="stat-value">{data.summary.completed_runs}</div></div><div className="stat-card"><div className="stat-label">{text("Pending review", "待審核")}</div><div className="stat-value">{data.summary.pending_reviews}</div></div><div className="stat-card"><div className="stat-label">{text("Human approval rate", "人工核准率")}</div><div className="stat-value">{data.summary.approval_rate === null ? "—" : `${data.summary.approval_rate}%`}</div></div></div>
      <div className="filter-bar"><div><strong>{text("Run history", "執行紀錄")}</strong><span>{text(`${data.runs.length} matching runs`, `符合條件：${data.runs.length} 筆`)}</span></div><div className="filter-actions"><select aria-label={text("Filter by workflow", "依工作流篩選")} value={workflow} onChange={event => { setLoading(true); setWorkflow(event.target.value); }}><option value="">{text("All workflows", "所有工作流")}</option>{data.workflows.map(item => <option value={item} key={item}>{label(item)}</option>)}</select><select aria-label={text("Filter by status", "依狀態篩選")} value={status} onChange={event => { setLoading(true); setStatus(event.target.value); }}><option value="">{text("All statuses", "所有狀態")}</option><option value="completed">{text("Completed", "已完成")}</option><option value="pending_review">{text("Pending review", "待審核")}</option><option value="rejected">{text("Rejected", "已拒絕")}</option></select><button className="button small" onClick={() => load()} disabled={loading}><RefreshCw size={12} className={loading ? "spin" : ""}/>{loading ? text("Refreshing…", "更新中…") : text("Refresh", "更新")}</button></div></div>
      <div className="audit-layout"><div className="card"><div className="table-wrap"><table className="table audit-table"><thead><tr><th>{text("Workflow", "工作流")}</th><th>{text("Input", "輸入")}</th><th>{text("Status", "狀態")}</th><th>{text("Human review", "人工審核")}</th><th>{text("Latency", "延遲")}</th><th>{text("Created", "建立時間")}</th></tr></thead><tbody>{data.runs.map(run => <tr key={run.id} className={selectedId === run.id ? "selected-row" : ""} onClick={() => setSelectedId(run.id)}><td><strong>{label(run.workflow)}</strong><br/><span className="muted">{label(run.input_type)}</span></td><td><span className="audit-input">{run.input}</span></td><td><span className={`pill ${run.status === "completed" ? "green" : run.status === "rejected" ? "red" : "amber"}`}>{label(run.status)}</span></td><td><span className={`pill ${reviewTone(run)}`}>{reviewLabel(run)}</span></td><td>{run.latency_ms} ms</td><td>{new Date(run.created_at).toLocaleDateString(locale === "zh" ? "zh-TW" : "en")}</td></tr>)}{!data.runs.length && <tr><td colSpan={6}><div className="empty"><Activity size={22}/><br/>{text("No runs match these filters.", "沒有符合目前篩選條件的執行紀錄。")}</div></td></tr>}</tbody></table></div></div>
        <aside className="card audit-detail"><div className="card-header"><h2>{text("Run detail", "執行詳情")}</h2><ShieldCheck size={15}/></div>{!selected ? <div className="empty">{text("Select a run to inspect its audit trace.", "選擇一筆執行紀錄以查看稽核軌跡。")}</div> : <div className="card-body stack"><div><div className="audit-label">{text("Workflow ID", "工作流 ID")}</div><strong>{selected.id}</strong></div><div className="audit-meta"><span><CheckCircle2 size={12}/>{selected.groundedness}</span><span><Clock3 size={12}/>{selected.latency_ms} ms</span><span>{selected.context_size} {text("context tokens", "脈絡 tokens")}</span><span>{selected.token_usage ?? "—"} {text("model tokens", "模型 tokens")}</span></div><div><div className="audit-label">{text("Agent chain", "代理鏈")}</div><p>{selected.agent}</p></div><div><div className="audit-label">{text("Tools used", "使用工具")}</div><div className="meta-row">{selected.tool_calls.length ? selected.tool_calls.map(tool => <span className="pill" key={tool}>{tool}</span>) : <span className="muted">{text("No tools recorded", "沒有工具紀錄")}</span>}</div></div><div><div className="audit-label">{text("User feedback", "使用者回饋")}</div><p>{selected.feedback ? label(selected.feedback) : text("No feedback submitted", "尚未送出回饋")}</p></div><div><div className="audit-label">{text("Recorded output", "輸出紀錄")}</div><pre className="code-block">{formattedOutput(selected.output)}</pre></div></div>}</aside>
      </div>
    </>}
  </div></WorkspaceShell>;
}
