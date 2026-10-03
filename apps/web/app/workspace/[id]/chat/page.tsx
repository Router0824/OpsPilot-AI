"use client";

import { use, useState } from "react";
import { ArrowUp, CheckCircle2, Database, Search } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Citation } from "@/lib/types";

type Answer = { run_id: string; result: { answer: string; findings: string[]; knowledge_gaps: string[]; recommended_actions: string[]; groundedness: string }; citations: Citation[]; metrics: { latency_ms: number; token_usage: number | null; context_size: number; tool_calls: string[] } };

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [query, setQuery] = useState("What are the main unresolved problems in our current project?");
  const [asked, setAsked] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function send() {
    if (!query.trim()) return;
    setLoading(true); setError(""); setAsked(query); setAnswer(null);
    try { setAnswer(await api<Answer>(`/api/workspaces/${id}/chat`, { method: "POST", body: JSON.stringify({ query }) })); setQuery(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Agent run failed"); }
    finally { setLoading(false); }
  }
  return <WorkspaceShell id={id} title="AI Workspace"><div className="page">
    <PageTitle eyebrow="Context-aware agent" title="Ask your workspace" description="Every answer is assembled from relevant knowledge, durable memory, decisions, active tasks, and conversation—not a full context dump." />
    <div className="chat-layout">
      <div className="card chat-panel">
        <div className="messages">
          {!asked && <div className="empty"><Search size={24} style={{ marginBottom: 12 }}/><br/>Ask an open-ended project question. OpsPilot will research, execute, and review it.</div>}
          {asked && <div className="message user">{asked}</div>}
          {loading && <div className="answer"><div className="eyebrow">Building task-aware context…</div><div className="answer-main">Searching project knowledge and memory, then reviewing the response against evidence.</div></div>}
          {error && <div className="error">{error}</div>}
          {answer && <div className="answer">
            <div className="meta-row"><span className="pill green"><CheckCircle2 size={9}/> {answer.result.groundedness}</span><span className="pill">{answer.metrics.context_size} context tokens</span><span className="pill">{answer.metrics.latency_ms} ms</span></div>
            <div className="answer-main">{answer.result.answer}</div>
            <div className="answer-section"><h4>Findings</h4><ul>{answer.result.findings.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div className="answer-section"><h4>Recommended actions</h4><ul>{answer.result.recommended_actions.map(item => <li key={item}>{item}</li>)}</ul></div>
            <div className="answer-section"><h4>Knowledge gaps</h4><ul>{answer.result.knowledge_gaps.map(item => <li key={item}>{item}</li>)}</ul></div>
          </div>}
        </div>
        <div className="composer"><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => event.key === 'Enter' && send()} placeholder="Ask about risks, decisions, gaps, or next steps…"/><button className="button primary" onClick={send} disabled={loading}><ArrowUp size={15}/></button></div>
      </div>
      <div className="stack">
        <div className="card"><div className="card-header"><h2>Evidence & citations</h2><Database size={13}/></div><div className="card-body stack">{answer?.citations.length ? answer.citations.map(item => <div className="citation" key={item.chunk_id}><strong>{item.source} · <span className="score">{Math.round(item.score*100)}%</span></strong><p>{item.excerpt}</p></div>) : <div className="empty">Retrieved evidence appears here.</div>}</div></div>
        <div className="card"><div className="card-header"><h2>Tool trace</h2><span>observable</span></div><div className="card-body">{(answer?.metrics.tool_calls || ["get_project_state", "search_documents", "search_memory"]).map((tool,index) => <div className="list-row" key={tool}><h3>{index + 1}. {tool}()</h3><p>{answer ? "Completed" : "Runs when you submit a question"}</p></div>)}</div></div>
      </div>
    </div>
  </div></WorkspaceShell>;
}

