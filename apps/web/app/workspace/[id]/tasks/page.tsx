"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Network,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";

const columns = [
  ["todo", "Todo"],
  ["in_progress", "In progress"],
  ["blocked", "Blocked"],
  ["done", "Done"],
] as const;

const statusFlow: Task["status"][] = ["todo", "in_progress", "blocked", "done"];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(task: Task) {
  if (!task.deadline || task.status === "done") return false;
  return new Date(`${task.deadline}T23:59:59`) < new Date();
}

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompt, setPrompt] = useState("Help us finish this project in 2 weeks.");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [movingId, setMovingId] = useState("");
  const [draggedId, setDraggedId] = useState("");
  const [dropStatus, setDropStatus] = useState<Task["status"] | "">("");
  const [expandedId, setExpandedId] = useState("");
  const [addingStatus, setAddingStatus] = useState<Task["status"] | "">("");
  const [draftTitle, setDraftTitle] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Task[]>(`/api/workspaces/${id}/tasks`).then((result) => {
      if (active) setTasks(result);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load tasks.");
    });
    return () => { active = false; };
  }, [id]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.owner} ${task.description} ${task.expected_output}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!priority || task.priority === priority);
  }), [priority, query, tasks]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  async function moveTask(task: Task, status: Task["status"]) {
    if (task.status === status || movingId === task.id) return;
    const previousStatus = task.status;
    setMovingId(task.id);
    setError("");
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    try {
      const changed = await api<Task>(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setTasks((current) => current.map((item) => item.id === changed.id ? changed : item));
      const destination = columns.find(([value]) => value === status)?.[1] || status;
      notify(`“${task.title}” moved to ${destination}.`);
    } catch (requestError) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
      setError(requestError instanceof Error ? requestError.message : "Task move failed and was rolled back.");
    } finally {
      setMovingId("");
    }
  }

  async function generatePlan() {
    setPlanning(true);
    setError("");
    try {
      await api(`/api/workspaces/${id}/plans`, { method: "POST", body: JSON.stringify({ prompt }) });
      const result = await api<Task[]>(`/api/workspaces/${id}/tasks`);
      setTasks(result);
      setPlannerOpen(false);
      notify("AI plan created and added to the board.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate a plan.");
    } finally {
      setPlanning(false);
    }
  }

  async function createTask(status: Task["status"]) {
    const title = draftTitle.trim();
    if (!title) return;
    setError("");
    try {
      const created = await api<Task>(`/api/workspaces/${id}/tasks`, {
        method: "POST",
        body: JSON.stringify({ title, status, priority: "medium", owner: "Unassigned", milestone: "Backlog", evidence: "Human created" }),
      });
      setTasks((current) => [created, ...current]);
      setAddingStatus("");
      setDraftTitle("");
      notify(`“${created.title}” added to the board.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the task.");
    }
  }

  return (
    <WorkspaceShell id={id} title="Task Board">
      <div className="page task-page">
        <PageTitle eyebrow="Workflow automation" title="Task Board" description="Drag work across stages, surface ownership gaps, and turn project goals into trackable execution." />

        {error && <div className="error task-error">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={13} /></button></div>}

        <section className={`plan-composer ${plannerOpen ? "" : "collapsed"}`}>
          <div className="plan-copy"><span className="plan-icon"><Sparkles size={15} /></span><div><strong>Generate an execution plan</strong><p>OpsPilot turns a goal into milestone-based tasks. Review the result on this board.</p></div></div>
          {plannerOpen ? <div className="plan-actions"><input autoFocus aria-label="Planning prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") generatePlan(); if (event.key === "Escape") setPlannerOpen(false); }} /><button className="button primary" onClick={generatePlan} disabled={planning || !prompt.trim()}><Sparkles size={14} />{planning ? "Planning…" : "Generate plan"}</button><button className="plan-close" onClick={() => setPlannerOpen(false)} aria-label="Close AI planner"><X size={14} /></button></div> : <button className="button plan-open" onClick={() => setPlannerOpen(true)}><Sparkles size={13} />Plan with AI</button>}
        </section>

        <div className="board-toolbar">
          <div className="board-search"><Search size={14} /><input aria-label="Search tasks" placeholder="Search tasks or owners…" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="board-hint"><GripVertical size={12} />Drag cards or use the arrow controls</span>
        </div>

        <div className="board">
          {columns.map(([status, label]) => {
            const columnTasks = visibleTasks.filter((task) => task.status === status);
            const isTarget = dropStatus === status && draggedId;
            return <section
              className={`column column-${status} ${isTarget ? "drop-target" : ""}`}
              key={status}
              onDragEnter={() => setDropStatus(status)}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropStatus(""); }}
              onDrop={(event) => {
                event.preventDefault();
                const task = tasks.find((item) => item.id === draggedId);
                setDropStatus("");
                setDraggedId("");
                if (task) moveTask(task, status);
              }}
            >
              <div className="column-head"><div><span className="column-dot" /><span>{label}</span></div><span className="column-count">{columnTasks.length}</span></div>
              <div className="column-stack">
                {columnTasks.map((task) => {
                  const index = statusFlow.indexOf(task.status);
                  const overdue = isOverdue(task);
                  const needsOwner = task.owner === "Unassigned";
                  const expanded = expandedId === task.id;
                  return <article
                    className={`task-card task-${task.status} ${draggedId === task.id ? "dragging" : ""} ${movingId === task.id ? "moving" : ""}`}
                    key={task.id}
                    draggable={movingId !== task.id}
                    onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", task.id); setDraggedId(task.id); }}
                    onDragEnd={() => { setDraggedId(""); setDropStatus(""); }}
                  >
                    <div className="task-card-top">
                      <span className="drag-handle" title="Drag to move"><GripVertical size={14} /></span>
                      <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                      {task.evidence === "Generated from Meeting" && <span className="ai-task-mark" title="Generated from Meeting"><Sparkles size={11} />AI</span>}
                    </div>
                    <h3>{task.title}</h3>
                    <p className="task-outcome">{task.expected_output || task.description || "No expected output added yet."}</p>

                    {(task.status === "blocked" || overdue || needsOwner) && <div className={`task-alert ${task.status === "blocked" || overdue ? "danger" : ""}`}><AlertTriangle size={12} /><span>{task.status === "blocked" ? "Blocked" : overdue ? "Overdue" : "Needs owner"}{needsOwner && task.status === "blocked" ? " · assign an owner" : ""}</span></div>}

                    <div className="task-metadata">
                      <span title={task.owner}><span className="avatar">{needsOwner ? "?" : task.owner.slice(0, 2).toUpperCase()}</span>{needsOwner ? "Unassigned" : task.owner}</span>
                      <span className={overdue ? "overdue" : ""}><CalendarDays size={12} />{task.deadline ? formatDate(task.deadline) : task.milestone}</span>
                    </div>

                    {expanded && <div className="task-details">
                      {task.description && <div><span>Description</span><p>{task.description}</p></div>}
                      <div><span>Expected output</span><p>{task.expected_output || "Not defined"}</p></div>
                      {task.dependencies.length > 0 && <div><span>Dependencies</span><p><Network size={11} />{task.dependencies.join(", ")}</p></div>}
                      <div><span>Source</span><p>{task.evidence || "Human created"}</p></div>
                    </div>}

                    <div className="task-card-actions">
                      <button className="icon-button" aria-label={`Move ${task.title} backward`} title="Move backward" disabled={index === 0 || movingId === task.id} onClick={() => moveTask(task, statusFlow[index - 1])}><ChevronLeft size={14} /></button>
                      <button className="task-expand" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? "" : task.id)}>Details <ChevronDown size={13} /></button>
                      <button className="icon-button" aria-label={`Move ${task.title} forward`} title="Move forward" disabled={index === statusFlow.length - 1 || movingId === task.id} onClick={() => moveTask(task, statusFlow[index + 1])}>{index === statusFlow.length - 2 ? <Check size={14} /> : <ChevronRight size={14} />}</button>
                    </div>
                  </article>;
                })}

                {!columnTasks.length && <div className="column-empty"><span className="column-empty-icon"><Plus size={15} /></span><strong>No tasks here</strong><p>Drop a card or add new work.</p></div>}
              </div>

              {addingStatus === status ? <div className="quick-add"><input autoFocus aria-label={`New ${label} task title`} placeholder="Task title…" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createTask(status); if (event.key === "Escape") setAddingStatus(""); }} /><div><button className="button small accent" onClick={() => createTask(status)} disabled={!draftTitle.trim()}>Add task</button><button className="button small ghost" onClick={() => { setAddingStatus(""); setDraftTitle(""); }}>Cancel</button></div></div> : <button className="column-add" onClick={() => { setAddingStatus(status); setDraftTitle(""); }}><Plus size={13} />Add task</button>}
            </section>;
          })}
        </div>

        {toast && <div className="toast"><Check size={14} />{toast}</div>}
      </div>
    </WorkspaceShell>
  );
}
