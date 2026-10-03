"use client";

import { use, useState } from "react";
import { ArrowUp, CheckCircle2, Database, Search } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Citation } from "@/lib/types";

type Answer = { run_id: string; result: { answer: string; findings: string[]; knowledge_gaps: string[]; recommended_actions: string[]; groundedness: string }; citations: Citation[]; metrics: { latency_ms: number; token_usage: number | null; context_size: number; tool_calls: string[] } };
export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { text, notify } = useApp();
  const [query, setQuery] = useState(""); const [asked, setAsked] = useState(""); const [answer, setAnswer] = useState<Answer | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function send() {
    if (!query.trim() || loading) return;
    setLoading(true); setError(""); setAsked(query); setAnswer(null);
    try { setAnswer(await api<Answer>(`/api/workspaces/${id}/chat`, { method: "POST", body: JSON.stringify({ query }) })); setQuery(""); }
    catch (requestError) { const message = requestError instanceof Error ? requestError.message : text("Agent run failed.", "代理运行失败。"); setError(message); notify(message, "error"); }
    finally { setLoading(false); }
  }
  return <WorkspaceShell id={id} title="Chat"><div className="page">
    <PageTitle eyebrow={text("Context-aware agent", "上下文感知代理")} title={text("Ask your workspace", "询问你的工作区")} description={text("Every answer is assembled from relevant knowledge, durable memory, decisions, active tasks, and conversation—not a full context dump.", "每个回答都会从相关知识、长期记忆、决策、进行中任务与对话中动态组合，而不是一次塞入所有数据。")}/>
    <div className="chat-layout"><div className="card chat-panel"><div className="messages">
      {!asked && <div className="empty"><Search size={24} style={{ marginBottom: 12 }}/><br/>{text("Ask an open-ended project question. OpsPilot will research, execute, and review it.", "提出一个开放式项目问题，OpsPilot 会搜索数据、运行推理并检查回答。")}</div>}
      {asked && <div className="message user">{asked}</div>}
      {loading && <div className="answer result-enter"><div className="eyebrow">{text("Building task-aware context…", "正在创建任务相关上下文…")}</div><div className="answer-main">{text("Searching project knowledge and memory, then reviewing the response against evidence.", "正在搜索项目知识与记忆，并根据证据检查回答。")}</div></div>}
      {error && <div className="error">{error}</div>}
      {answer && <div className="answer result-enter"><div className="meta-row"><span className="pill green"><CheckCircle2 size={9}/> {answer.result.groundedness}</span><span className="pill">{answer.metrics.context_size} {text("context tokens", "上下文 tokens")}</span><span className="pill">{answer.metrics.latency_ms} ms</span></div><div className="answer-main">{answer.result.answer}</div><div className="answer-section"><h4>{text("Findings", "发现")}</h4><ul>{answer.result.findings.map(item => <li key={item}>{item}</li>)}</ul></div><div className="answer-section"><h4>{text("Recommended actions", "建议行动")}</h4><ul>{answer.result.recommended_actions.map(item => <li key={item}>{item}</li>)}</ul></div><div className="answer-section"><h4>{text("Knowledge gaps", "知识缺口")}</h4><ul>{answer.result.knowledge_gaps.map(item => <li key={item}>{item}</li>)}</ul></div></div>}
    </div><div className="composer"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === "Enter" && send()} placeholder={text("Ask about risks, decisions, gaps, or next steps…", "询问风险、决策、缺口或下一步…")}/><button className="button primary" aria-label={text("Send", "送出")} onClick={send} disabled={loading || !query.trim()}><ArrowUp size={15}/></button></div></div>
      <div className="stack"><div className="card"><div className="card-header"><h2>{text("Evidence & citations", "证据与引用")}</h2><Database size={13}/></div><div className="card-body stack">{answer?.citations.length ? answer.citations.map(item => <div className="citation interactive-card" key={item.chunk_id}><strong>{item.source} · <span className="score">{Math.round(item.score * 100)}%</span></strong><p>{item.excerpt}</p></div>) : <div className="empty">{text("Retrieved evidence appears here.", "检索到的证据会显示在这里。")}</div>}</div></div><div className="card"><div className="card-header"><h2>{text("Tool trace", "工具轨迹")}</h2><span>{text("observable", "可观测")}</span></div><div className="card-body">{(answer?.metrics.tool_calls || ["get_project_state", "search_documents", "search_memory"]).map((tool, index) => <div className="list-row" key={tool}><h3>{index + 1}. {tool}()</h3><p>{answer ? text("Completed", "已完成") : text("Runs when you submit a question", "送出问题后运行")}</p></div>)}</div></div></div>
    </div>
  </div></WorkspaceShell>;
}
