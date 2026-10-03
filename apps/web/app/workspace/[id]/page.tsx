"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, FileText, ShieldAlert, Timer } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text } = useApp();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<Dashboard>(`/api/workspaces/${id}/dashboard`).then(setData).catch(error => setError(error.message)); }, [id]);
  return <WorkspaceShell id={id} title="Overview"><div className="page">
    <PageTitle eyebrow={text("Operations dashboard", "營運儀表板")} title={data?.workspace.name || text("Loading workspace", "載入工作區")} description={data?.workspace.goal || text("Retrieving project state…", "正在取得專案狀態…")} action={<Link className="button primary" href={`/workspace/${id}/copilot`}>{text("Open Copilot", "開啟營運助理")} <ArrowRight size={14}/></Link>}/>
    {error && <div className="error">{error}</div>}
    {!data ? <div className="loading">{text("Assembling workspace context…", "正在組合工作區脈絡…")}</div> : <>
      <div className="side-label" style={{paddingLeft:0}}>{text("Workspace health", "工作區健康狀態")}</div>
      <div className="stats-grid">
        {[['Active tasks','進行中任務','active_tasks'],['Completed','已完成','completed_tasks'],['Blocked','受阻','blocked_tasks'],['Open risks','未解風險','open_risks'],['Documents','文件','documents'],['Decisions','決策','decisions']].map(([label,zh,key]) => <div className="stat-card" key={key}><div className="stat-label">{text(label,zh)}</div><div className="stat-value">{data.counts[key] || 0}</div></div>)}
      </div>
      <div className="side-label" style={{paddingLeft:0}}>{text("AI automation impact", "AI 自動化成效")}</div>
      <div className="stats-grid">
        {[['Meetings processed','已處理會議','meetings_processed'],['Tasks generated','自動產生任務','tasks_auto_generated'],['Decisions captured','已擷取決策','decisions_captured'],['Documents indexed','已索引文件','documents_indexed'],['Workflow runs','工作流執行','workflow_runs'],['Est. minutes saved','預估節省分鐘','estimated_minutes_saved']].map(([label,zh,key]) => <div className="stat-card" key={key}><div className="stat-label">{text(label,zh)}</div><div className="stat-value">{data.impact[key] || 0}</div>{key==='estimated_minutes_saved'&&<div className="muted" style={{fontSize:8,marginTop:5}}>{text("Based on configurable assumptions", "依可調整的假設估算")}</div>}</div>)}
      </div>
      <div className="content-grid">
        <div className="card"><div className="card-header"><h2>{text("Active work", "目前工作")}</h2><Link href={`/workspace/${id}/tasks`}>{text("View board", "查看看板")} →</Link></div><div className="card-body stack">
          {data.tasks.filter(task => task.status !== 'done').slice(0,5).map(task => <div className="list-row" key={task.id}><h3>{task.title}</h3><p>{task.expected_output || task.description}</p><div className="meta-row"><span className={`pill ${task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : ''}`}>{task.priority}</span><span className="pill">{task.owner}</span><span className="pill green">{task.milestone}</span></div></div>)}
        </div></div>
        <div className="stack">
          <div className="card"><div className="card-header"><h2>{text("Recent decisions", "近期決策")}</h2><Link href={`/workspace/${id}/decisions`}>{text("Decisions", "決策")} →</Link></div><div className="card-body">{data.decisions.map(item => <div className="list-row" key={item.id}><h3>{item.content}</h3><p>{item.reason || item.source}</p></div>)}</div></div>
          <div className="card"><div className="card-header"><h2>{text("Open risks", "未解風險")}</h2><Link href={`/workspace/${id}/risks`}>{text("Risk tracker", "風險追蹤")} →</Link></div><div className="card-body">{data.risks.slice(0,3).map(item => <div className="list-row" key={item.id}><h3><ShieldAlert size={11}/> {item.risk}</h3><div className="meta-row"><span className={`pill ${item.severity==='critical'?'red':'amber'}`}>{item.severity}</span><span className="pill">{item.status}</span></div></div>)}</div></div>
          <div className="card"><div className="card-header"><h2>{text("AI activity", "AI 活動")}</h2><span>{data.runs.length} {text("recent", "筆近期紀錄")}</span></div><div className="card-body">{data.runs.length ? data.runs.map(run => <div className="list-row" key={run.id}><h3><Bot size={11}/> {run.input}</h3><div className="meta-row"><span className="pill green">{run.groundedness}</span><span className="muted"><Timer size={10}/> {run.latency_ms} ms</span></div></div>) : <div className="empty">{text("No runs yet. Ask your first workspace question.", "尚無執行紀錄，請先提出第一個工作區問題。")}</div>}</div></div>
          <div className="card"><div className="card-header"><h2>{text("Knowledge", "知識")}</h2><FileText size={13}/></div><div className="card-body">{data.documents.slice(0,3).map(doc => <div className="list-row" key={doc.id}><h3>{doc.name}</h3><p>{doc.chunk_count} {text("indexed chunks", "個已索引片段")}</p></div>)}</div></div>
        </div>
      </div>
    </>}
  </div></WorkspaceShell>;
}
