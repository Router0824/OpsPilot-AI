"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

type ActivityData = { summary: { total_runs: number; completed_runs: number; pending_reviews: number; approval_rate: number | null }; workflows: string[]; runs: AgentRun[] };
const ZH_LABELS: Record<string, string> = { completed: "已完成", pending_review: "待审核", rejected: "已拒绝", approved: "已批准", helpful: "有帮助", not_helpful: "没有帮助", meeting_analysis: "会议分析", risk_detection: "风险检测", weekly_report: "每周报告", task_planning: "任务规划", workspace_chat: "工作区问答", copilot: "运营助理", text: "文字", workspace: "工作区", meeting: "会议", document: "文档" };
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
  const reviewLabel = (run: AgentRun) => run.status === "pending_review" ? text("Pending review", "待审核") : run.human_approved === true ? text("Approved", "已批准") : run.human_approved === false ? text("Rejected", "已拒绝") : text("Not required", "不需审核");
  const reviewTone = (run: AgentRun) => run.status === "pending_review" ? "amber" : run.human_approved === true ? "green" : run.human_approved === false ? "red" : "";

  const load = useCallback(async (showNotice = true) => {
    setLoading(true); setError("");
    try {
      const result = await api<ActivityData>(activityPath(id, workflow, status)); setData(result);
      setSelectedId(current => result.runs.some(run => run.id === current) ? current : result.runs[0]?.id || "");
      if (showNotice) notify(text("Activity refreshed.", "活动记录已更新。"));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : text("Unable to load workflow activity.", "无法加载工作流活动记录。"); setError(message);
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
      setError(requestError instanceof Error ? requestError.message : text("Unable to load workflow activity.", "无法加载工作流活动记录。")); setLoading(false);
    });
    return () => { active = false; };
  }, [id, status, text, workflow]);
  const selected = useMemo(() => data?.runs.find(run => run.id === selectedId) || null, [data, selectedId]);

  return <WorkspaceShell id={id} title="AI Activity"><div className="page">
    <PageTitle eyebrow={text("Execution audit", "执行审计")} title={text("AI Activity & Approval Audit", "AI 活动与审批审计")} description={text("Inspect every operational workflow, its inputs, tools, outcome, human-review state, and user feedback in one traceable timeline.", "在可追溯的时间轴中，查看每个运营工作流的输入、工具、结果、人工审核状态与用户反馈。")}/>
    {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
    {!data ? <div className="loading">{loading ? text("Loading workflow audit…", "正在加载工作流审核…") : text("Activity data is unavailable.", "目前无法取得活动数据。")}</div> : <>
      <div className="stats-grid audit-stats"><div className="stat-card"><div className="stat-label">{text("Workflow runs", "工作流运行")}</div><div className="stat-value">{data.summary.total_runs}</div></div><div className="stat-card"><div className="stat-label">{text("Completed", "已完成")}</div><div className="stat-value">{data.summary.completed_runs}</div></div><div className="stat-card"><div className="stat-label">{text("Pending review", "待审核")}</div><div className="stat-value">{data.summary.pending_reviews}</div></div><div className="stat-card"><div className="stat-label">{text("Human approval rate", "人工批准率")}</div><div className="stat-value">{data.summary.approval_rate === null ? "—" : `${data.summary.approval_rate}%`}</div></div></div>
      <div className="filter-bar"><div><strong>{text("Run history", "运行记录")}</strong><span>{text(`${data.runs.length} matching runs`, `符合条件：${data.runs.length} 条`)}</span></div><div className="filter-actions"><select aria-label={text("Filter by workflow", "按工作流筛选")} value={workflow} onChange={event => { setLoading(true); setWorkflow(event.target.value); }}><option value="">{text("All workflows", "所有工作流")}</option>{data.workflows.map(item => <option value={item} key={item}>{label(item)}</option>)}</select><select aria-label={text("Filter by status", "按状态筛选")} value={status} onChange={event => { setLoading(true); setStatus(event.target.value); }}><option value="">{text("All statuses", "所有状态")}</option><option value="completed">{text("Completed", "已完成")}</option><option value="pending_review">{text("Pending review", "待审核")}</option><option value="rejected">{text("Rejected", "已拒绝")}</option></select><button className="button small" onClick={() => load()} disabled={loading}><RefreshCw size={12} className={loading ? "spin" : ""}/>{loading ? text("Refreshing…", "更新中…") : text("Refresh", "更新")}</button></div></div>
      <div className="audit-layout"><div className="card"><div className="table-wrap"><table className="table audit-table"><thead><tr><th>{text("Workflow", "工作流")}</th><th>{text("Input", "输入")}</th><th>{text("Status", "状态")}</th><th>{text("Human review", "人工审核")}</th><th>{text("Latency", "延迟")}</th><th>{text("Created", "创建时间")}</th></tr></thead><tbody>{data.runs.map(run => <tr key={run.id} className={selectedId === run.id ? "selected-row" : ""} onClick={() => setSelectedId(run.id)}><td><strong>{label(run.workflow)}</strong><br/><span className="muted">{label(run.input_type)}</span></td><td><span className="audit-input">{run.input}</span></td><td><span className={`pill ${run.status === "completed" ? "green" : run.status === "rejected" ? "red" : "amber"}`}>{label(run.status)}</span></td><td><span className={`pill ${reviewTone(run)}`}>{reviewLabel(run)}</span></td><td>{run.latency_ms} ms</td><td>{new Date(run.created_at).toLocaleDateString(locale === "zh" ? "zh-CN" : "en")}</td></tr>)}{!data.runs.length && <tr><td colSpan={6}><div className="empty"><Activity size={22}/><br/>{text("No runs match these filters.", "没有符合目前筛选条件的运行记录。")}</div></td></tr>}</tbody></table></div></div>
        <aside className="card audit-detail"><div className="card-header"><h2>{text("Run detail", "运行详情")}</h2><ShieldCheck size={15}/></div>{!selected ? <div className="empty">{text("Select a run to inspect its audit trace.", "选择一条运行记录以查看审计轨迹。")}</div> : <div className="card-body stack"><div><div className="audit-label">{text("Workflow ID", "工作流 ID")}</div><strong>{selected.id}</strong></div><div className="audit-meta"><span><CheckCircle2 size={12}/>{selected.groundedness}</span><span><Clock3 size={12}/>{selected.latency_ms} ms</span><span>{selected.context_size} {text("context tokens", "上下文 tokens")}</span><span>{selected.token_usage ?? "—"} {text("model tokens", "模型 tokens")}</span></div><div><div className="audit-label">{text("Agent chain", "代理链")}</div><p>{selected.agent}</p></div><div><div className="audit-label">{text("Tools used", "使用工具")}</div><div className="meta-row">{selected.tool_calls.length ? selected.tool_calls.map(tool => <span className="pill" key={tool}>{tool}</span>) : <span className="muted">{text("No tools recorded", "没有工具记录")}</span>}</div></div><div><div className="audit-label">{text("User feedback", "用户反馈")}</div><p>{selected.feedback ? label(selected.feedback) : text("No feedback submitted", "尚未提交反馈")}</p></div><div><div className="audit-label">{text("Recorded output", "输出记录")}</div><pre className="code-block">{formattedOutput(selected.output)}</pre></div></div>}</aside>
      </div>
    </>}
  </div></WorkspaceShell>;
}
