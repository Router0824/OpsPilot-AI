"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { AgentRun } from "@/lib/types";

type ActivityData = {
  summary: { total_runs: number; completed_runs: number; pending_reviews: number; approval_rate: number | null };
  workflows: string[];
  runs: AgentRun[];
};

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function reviewLabel(run: AgentRun) {
  if (run.status === "pending_review") return "Pending review";
  if (run.human_approved === true) return "Approved";
  if (run.human_approved === false) return "Rejected";
  return "Not required";
}

function reviewTone(run: AgentRun) {
  if (run.status === "pending_review") return "amber";
  if (run.human_approved === true) return "green";
  if (run.human_approved === false) return "red";
  return "";
}

function formattedOutput(output: string) {
  try {
    return JSON.stringify(JSON.parse(output), null, 2);
  } catch {
    return output;
  }
}

function activityPath(id: string, workflow: string, status: string) {
  const query = new URLSearchParams();
  if (workflow) query.set("workflow", workflow);
  if (status) query.set("status", status);
  return `/api/workspaces/${id}/activity?${query.toString()}`;
}

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<ActivityData | null>(null);
  const [workflow, setWorkflow] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<ActivityData>(activityPath(id, workflow, status));
      setData(result);
      setSelectedId((current) => result.runs.some((run) => run.id === current) ? current : result.runs[0]?.id || "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load workflow activity.");
    } finally {
      setLoading(false);
    }
  }, [id, status, workflow]);

  useEffect(() => {
    let active = true;
    api<ActivityData>(activityPath(id, workflow, status)).then((result) => {
      if (!active) return;
      setData(result);
      setError("");
      setSelectedId((current) => result.runs.some((run) => run.id === current) ? current : result.runs[0]?.id || "");
      setLoading(false);
    }).catch((requestError: unknown) => {
      if (!active) return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load workflow activity.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, status, workflow]);
  const selected = useMemo(() => data?.runs.find((run) => run.id === selectedId) || null, [data, selectedId]);

  return (
    <WorkspaceShell id={id} title="AI Activity">
      <div className="page">
        <PageTitle eyebrow="Execution audit" title="AI Activity & Approval Audit" description="Inspect every operational workflow, its inputs, tools, outcome, human-review state, and user feedback in one traceable timeline." />
        {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
        {!data ? <div className="loading">{loading ? "Loading workflow audit…" : "Activity data is unavailable."}</div> : <>
          <div className="stats-grid audit-stats">
            <div className="stat-card"><div className="stat-label">Workflow runs</div><div className="stat-value">{data.summary.total_runs}</div></div>
            <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{data.summary.completed_runs}</div></div>
            <div className="stat-card"><div className="stat-label">Pending review</div><div className="stat-value">{data.summary.pending_reviews}</div></div>
            <div className="stat-card"><div className="stat-label">Human approval rate</div><div className="stat-value">{data.summary.approval_rate === null ? "—" : `${data.summary.approval_rate}%`}</div></div>
          </div>

          <div className="filter-bar">
            <div><strong>Run history</strong><span>{data.runs.length} matching runs</span></div>
            <div className="filter-actions">
              <select aria-label="Filter by workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)}>
                <option value="">All workflows</option>
                {data.workflows.map((item) => <option value={item} key={item}>{label(item)}</option>)}
              </select>
              <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="pending_review">Pending review</option>
                <option value="rejected">Rejected</option>
              </select>
              <button className="button small" onClick={load} disabled={loading}><RefreshCw size={12} />Refresh</button>
            </div>
          </div>

          <div className="audit-layout">
            <div className="card">
              <div className="table-wrap"><table className="table audit-table">
                <thead><tr><th>Workflow</th><th>Input</th><th>Status</th><th>Human review</th><th>Latency</th><th>Created</th></tr></thead>
                <tbody>{data.runs.map((run) => <tr key={run.id} className={selectedId === run.id ? "selected-row" : ""} onClick={() => setSelectedId(run.id)}>
                  <td><strong>{label(run.workflow)}</strong><br /><span className="muted">{label(run.input_type)}</span></td>
                  <td><span className="audit-input">{run.input}</span></td>
                  <td><span className={`pill ${run.status === "completed" ? "green" : run.status === "rejected" ? "red" : "amber"}`}>{label(run.status)}</span></td>
                  <td><span className={`pill ${reviewTone(run)}`}>{reviewLabel(run)}</span></td>
                  <td>{run.latency_ms} ms</td>
                  <td>{new Date(run.created_at).toLocaleDateString()}</td>
                </tr>)}{!data.runs.length && <tr><td colSpan={6}><div className="empty"><Activity size={22} /><br />No runs match these filters.</div></td></tr>}</tbody>
              </table></div>
            </div>

            <aside className="card audit-detail">
              <div className="card-header"><h2>Run detail</h2><ShieldCheck size={15} /></div>
              {!selected ? <div className="empty">Select a run to inspect its audit trace.</div> : <div className="card-body stack">
                <div><div className="audit-label">Workflow ID</div><strong>{selected.id}</strong></div>
                <div className="audit-meta">
                  <span><CheckCircle2 size={12} />{selected.groundedness}</span>
                  <span><Clock3 size={12} />{selected.latency_ms} ms</span>
                  <span>{selected.context_size} context tokens</span>
                  <span>{selected.token_usage ?? "—"} model tokens</span>
                </div>
                <div><div className="audit-label">Agent chain</div><p>{selected.agent}</p></div>
                <div><div className="audit-label">Tools used</div><div className="meta-row">{selected.tool_calls.length ? selected.tool_calls.map((tool) => <span className="pill" key={tool}>{tool}</span>) : <span className="muted">No tools recorded</span>}</div></div>
                <div><div className="audit-label">User feedback</div><p>{selected.feedback ? label(selected.feedback) : "No feedback submitted"}</p></div>
                <div><div className="audit-label">Recorded output</div><pre className="code-block">{formattedOutput(selected.output)}</pre></div>
              </div>}
            </aside>
          </div>
        </>}
      </div>
    </WorkspaceShell>
  );
}
