"use client";

import { use, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";

type Analytics = { impact: Record<string, number>; operations: { workflow_runs: number; successful_runs: number; pending_reviews: number; average_latency_ms: number | null; human_approval_rate: number | null }; assumptions: { meeting_minutes_saved: number; label: string } };

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text } = useApp();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Analytics>(`/api/workspaces/${id}/analytics`).then(setData).catch(error => setError(error instanceof Error ? error.message : text("Unable to load analytics.", "無法載入分析資料。"))); }, [id, text]);
  const labels: Record<string, string> = {
    tasks_completed: text("Tasks completed", "已完成任務"), decisions_recorded: text("Decisions recorded", "已記錄決策"), risks_active: text("Active risks", "進行中風險"), meetings_analyzed: text("Meetings analyzed", "已分析會議"), knowledge_documents: text("Knowledge documents", "知識文件"),
    workflow_runs: text("Workflow runs", "工作流執行次數"), successful_runs: text("Successful runs", "成功執行"), pending_reviews: text("Pending reviews", "待審核"), average_latency_ms: text("Average latency", "平均延遲"), human_approval_rate: text("Human approval rate", "人工核准率"),
  };
  return <WorkspaceShell id={id} title="Operations Analytics"><div className="page">
    <PageTitle eyebrow={text("Operational outcomes", "營運成果")} title={text("Operations Analytics", "營運分析")} description={text("Track workflow throughput and human approval alongside technical run health. Estimates are labelled separately from observed events.", "同時追蹤工作流產出、人工核准與技術執行狀況；估算資料會與實際事件清楚區分。")}/>
    {error ? <div className="error">{error}</div> : !data ? <div className="loading">{text("Loading operations metrics…", "正在載入營運指標…")}</div> : <><div className="stats-grid">{Object.entries(data.impact).map(([key, value]) => <div className="stat-card interactive-card" key={key}><div className="stat-label">{labels[key] || key.replaceAll("_", " ")}</div><div className="stat-value">{value}</div></div>)}</div><div className="content-grid"><div className="card"><div className="card-header"><h2>{text("Workflow health", "工作流健康狀態")}</h2><BarChart3 size={14}/></div><div className="card-body">{Object.entries(data.operations).map(([key, value]) => <div className="list-row" key={key}><h3>{labels[key] || key.replaceAll("_", " ")}</h3><p>{value ?? text("Not available", "尚無資料")}{key === "human_approval_rate" && value !== null ? "%" : key === "average_latency_ms" && value !== null ? " ms" : ""}</p></div>)}</div></div><div className="card"><div className="card-header"><h2>{text("Estimation policy", "估算政策")}</h2><span>{text("transparent", "透明標示")}</span></div><div className="card-body"><div className="stat-value">{data.assumptions.meeting_minutes_saved} {text("min", "分鐘")}</div><p className="muted">{text("Estimated time saved per approved Meeting Intelligence workflow.", "每次核准「會議智慧」工作流後的預估節省時間。")}</p><div className="demo-badge">{data.assumptions.label}</div></div></div></div></>}
  </div></WorkspaceShell>;
}
