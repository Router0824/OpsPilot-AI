"use client";

import { use, useState } from "react";
import { ArrowUp, Bot, CheckCircle2 } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";

type Result = { kind: string; title: string; items?: Record<string, string>[]; report?: { headline: string; completed: string[]; in_progress: string[]; blocked: string[]; key_decisions: string[]; risks: string[]; next_week_priorities: string[] } };

export default function CopilotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text, notify } = useApp();
  const prompts = [
    text("Summarize our project status for this week.", "整理本週的專案狀態。"),
    text("Which tasks are overdue?", "哪些任務已經逾期？"),
    text("What changed this week?", "本週有哪些變化？"),
  ];
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run(value = query || prompts[0]) {
    if (!value.trim() || loading) return;
    setQuery(value); setLoading(true); setError("");
    try {
      const response = await api<{ result: Result }>(`/api/workspaces/${id}/copilot`, { method: "POST", body: JSON.stringify({ query: value }) });
      setResult(response.result);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : text("Unable to run the copilot.", "營運助理暫時無法執行。");
      setError(message); notify(message, "error");
    } finally { setLoading(false); }
  }

  const reportSections = result?.report ? [
    [text("Completed", "已完成"), result.report.completed],
    [text("In progress", "進行中"), result.report.in_progress],
    [text("Blocked", "受阻"), result.report.blocked],
    [text("Key decisions", "關鍵決策"), result.report.key_decisions],
    [text("Risks", "風險"), result.report.risks],
    [text("Next week priorities", "下週優先事項"), result.report.next_week_priorities],
  ] as const : [];

  return <WorkspaceShell id={id} title="Operations Copilot"><div className="page">
    <PageTitle eyebrow={text("Workspace-aware operations", "工作區感知營運")} title={text("Operations Copilot", "營運助理")} description={text("Ask for status, overdue work, weekly changes, risks, or next priorities. Responses read live tasks, decisions, risks, meetings, and knowledge.", "詢問專案狀態、逾期工作、本週變化、風險或下一步優先事項。回答會綜合即時任務、決策、風險、會議與知識內容。")}/>
    <div className="chat-layout"><div className="card chat-panel"><div className="messages">
      {!result && !loading && !error && <div className="empty"><Bot size={26}/><br/>{text("Choose an operations workflow or ask your own question.", "選擇一個營運工作流，或直接提出你的問題。")}</div>}
      {loading && <div className="answer result-enter"><div className="eyebrow">{text("Reviewing workspace state…", "正在檢視工作區狀態…")}</div><div className="answer-main">{text("Connecting tasks, decisions, risks, meetings, and knowledge.", "正在串聯任務、決策、風險、會議與知識內容。")}</div></div>}
      {error && <div className="error">{error}</div>}
      {result && !loading && <div className="answer result-enter"><div className="meta-row"><span className="pill green"><CheckCircle2 size={9}/> {text("Reviewed", "已檢視")}</span><span className="pill">{result.kind.replaceAll("_", " ")}</span></div><h2 className="display">{result.title}</h2>
        {result.report && <><div className="answer-main">{result.report.headline}</div>{reportSections.map(([title, items]) => <div className="answer-section" key={title}><h4>{title}</h4><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</>}
        {result.items && <div className="stack">{result.items.map((item, index) => <div className="list-row" key={index}><h3>{item.task || item.value}</h3><p>{Object.entries(item).filter(([key]) => !["task", "value"].includes(key)).map(([, value]) => value).join(" · ")}</p></div>)}</div>}
      </div>}
    </div><div className="composer"><input aria-label={text("Ask Operations Copilot", "詢問營運助理")} placeholder={text("Ask about status, blockers, or priorities…", "詢問狀態、阻礙或優先事項…")} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && run()}/><button className="button primary" aria-label={text("Send", "送出")} onClick={() => run()} disabled={loading || !query.trim()}><ArrowUp size={15}/></button></div></div>
      <div className="card"><div className="card-header"><h2>{text("Operations workflows", "營運工作流")}</h2><span>{text("one click", "一鍵執行")}</span></div><div className="card-body stack">{prompts.map(item => <button className="button interactive-card" style={{ justifyContent: "flex-start" }} key={item} onClick={() => run(item)} disabled={loading}>{item}</button>)}</div></div>
    </div>
  </div></WorkspaceShell>;
}
