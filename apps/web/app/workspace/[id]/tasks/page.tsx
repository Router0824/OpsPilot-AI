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
import { useApp } from "@/components/AppProvider";
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
  const { text, notify } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompt, setPrompt] = useState("帮助我们在两周内完成这个项目。");
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Task[]>(`/api/workspaces/${id}/tasks`).then((result) => {
      if (active) setTasks(result);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : text("Unable to load tasks.", "无法加载任务。"));
    });
    return () => { active = false; };
  }, [id, text]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.owner} ${task.description} ${task.expected_output}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (!priority || task.priority === priority);
  }), [priority, query, tasks]);

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
      const destinationZh = { todo: "待办", in_progress: "进行中", blocked: "受阻", done: "完成" }[status];
      notify(text(`“${task.title}” moved to ${destination}.`, `「${task.title}」已移至${destinationZh}。`));
    } catch (requestError) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: previousStatus } : item));
      setError(requestError instanceof Error ? requestError.message : text("Task move failed and was rolled back.", "任务移动失败，已自动还原。"));
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
      notify(text("AI plan created and added to the board.", "AI 执行计划已创建并加入看板。"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text("Unable to generate a plan.", "无法生成执行计划。"));
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
      notify(text(`“${created.title}” added to the board.`, `「${created.title}」已加入看板。`));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text("Unable to create the task.", "无法创建任务。"));
    }
  }

  return (
    <WorkspaceShell id={id} title="Task Board">
      <div className="page task-page">
        <PageTitle eyebrow={text("Workflow automation", "工作流自动化")} title={text("Task Board", "任务看板")} description={text("Drag work across stages, surface ownership gaps, and turn project goals into trackable execution.", "拖拽任务调整阶段、找出责任缺口，并将项目目标转化为可跟踪的执行工作。")}/>

        {error && <div className="error task-error">{error}<button onClick={() => setError("")} aria-label={text("Dismiss error", "关闭错误消息")}><X size={13} /></button></div>}

        <section className={`plan-composer ${plannerOpen ? "" : "collapsed"}`}>
          <div className="plan-copy"><span className="plan-icon"><Sparkles size={15} /></span><div><strong>{text("Generate an execution plan", "生成执行计划")}</strong><p>{text("OpsPilot turns a goal into milestone-based tasks. Review the result on this board.", "OpsPilot 会把目标拆解为里程碑任务，结果会加入此看板供你确认。")}</p></div></div>
          {plannerOpen ? <div className="plan-actions"><input autoFocus aria-label={text("Planning prompt", "计划提示词")} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") generatePlan(); if (event.key === "Escape") setPlannerOpen(false); }} /><button className="button primary" onClick={generatePlan} disabled={planning || !prompt.trim()}><Sparkles size={14} />{planning ? text("Planning…", "规划中…") : text("Generate plan", "生成计划")}</button><button className="plan-close" onClick={() => setPlannerOpen(false)} aria-label={text("Close AI planner", "关闭 AI 规划器")}><X size={14} /></button></div> : <button className="button plan-open" onClick={() => setPlannerOpen(true)}><Sparkles size={13} />{text("Plan with AI", "使用 AI 规划")}</button>}
        </section>

        <div className="board-toolbar">
          <div className="board-search"><Search size={14} /><input aria-label={text("Search tasks", "搜索任务")} placeholder={text("Search tasks or owners…", "搜索任务或负责人…")} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
          <select aria-label={text("Filter by priority", "按优先级筛选")} value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">{text("All priorities", "所有优先级")}</option>
            <option value="critical">{text("Critical", "紧急")}</option>
            <option value="high">{text("High", "高")}</option>
            <option value="medium">{text("Medium", "中")}</option>
            <option value="low">{text("Low", "低")}</option>
          </select>
          <span className="board-hint"><GripVertical size={12} />{text("Drag cards or use the arrow controls", "拖拽便条或使用左右按钮")}</span>
        </div>

        <div className="board">
          {columns.map(([status, label]) => {
            const displayLabel = text(label, { todo: "待办", in_progress: "进行中", blocked: "受阻", done: "完成" }[status]);
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
              <div className="column-head"><div><span className="column-dot" /><span>{displayLabel}</span></div><span className="column-count">{columnTasks.length}</span></div>
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
                      <span className="drag-handle" title={text("Drag to move", "拖拽移动")}><GripVertical size={14} /></span>
                      <span className={`pill priority-${task.priority}`}>{text(task.priority, { critical: "紧急", high: "高", medium: "中", low: "低" }[task.priority] || task.priority)}</span>
                      {task.evidence === "Generated from Meeting" && <span className="ai-task-mark" title={text("Generated from Meeting", "由会议自动生成")}><Sparkles size={11} />AI</span>}
                    </div>
                    <h3>{task.title}</h3>
                    <p className="task-outcome">{task.expected_output || task.description || text("No expected output added yet.", "尚未设置预期产出。")}</p>

                    {(task.status === "blocked" || overdue || needsOwner) && <div className={`task-alert ${task.status === "blocked" || overdue ? "danger" : ""}`}><AlertTriangle size={12} /><span>{task.status === "blocked" ? text("Blocked", "任务受阻") : overdue ? text("Overdue", "已逾期") : text("Needs owner", "缺少负责人")}{needsOwner && task.status === "blocked" ? text(" · assign an owner", " · 请分配负责人") : ""}</span></div>}

                    <div className="task-metadata">
                      <span title={task.owner}><span className="avatar">{needsOwner ? "?" : task.owner.slice(0, 2).toUpperCase()}</span>{needsOwner ? text("Unassigned", "未分配") : task.owner}</span>
                      <span className={overdue ? "overdue" : ""}><CalendarDays size={12} />{task.deadline ? formatDate(task.deadline) : task.milestone}</span>
                    </div>

                    {expanded && <div className="task-details">
                      {task.description && <div><span>{text("Description", "说明")}</span><p>{task.description}</p></div>}
                      <div><span>{text("Expected output", "预期产出")}</span><p>{task.expected_output || text("Not defined", "未定义")}</p></div>
                      {task.dependencies.length > 0 && <div><span>{text("Dependencies", "依赖任务")}</span><p><Network size={11} />{task.dependencies.join(", ")}</p></div>}
                      <div><span>{text("Source", "来源")}</span><p>{task.evidence || text("Human created", "人工创建")}</p></div>
                    </div>}

                    <div className="task-card-actions">
                      <button className="icon-button" aria-label={text(`Move ${task.title} backward`, `将「${task.title}」往前移动`)} title={text("Move backward", "往前移动")} disabled={index === 0 || movingId === task.id} onClick={() => moveTask(task, statusFlow[index - 1])}><ChevronLeft size={14} /></button>
                      <button className="task-expand" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? "" : task.id)}>{text("Details", "详情")} <ChevronDown size={13} /></button>
                      <button className="icon-button" aria-label={text(`Move ${task.title} forward`, `将「${task.title}」往后移动`)} title={text("Move forward", "往后移动")} disabled={index === statusFlow.length - 1 || movingId === task.id} onClick={() => moveTask(task, statusFlow[index + 1])}>{index === statusFlow.length - 2 ? <Check size={14} /> : <ChevronRight size={14} />}</button>
                    </div>
                  </article>;
                })}

                {!columnTasks.length && <div className="column-empty"><span className="column-empty-icon"><Plus size={15} /></span><strong>{text("No tasks here", "此栏没有任务")}</strong><p>{text("Drop a card or add new work.", "拖入便条或添加工作。")}</p></div>}
              </div>

              {addingStatus === status ? <div className="quick-add"><input autoFocus aria-label={text(`New ${label} task title`, `添加${displayLabel}任务标题`)} placeholder={text("Task title…", "任务标题…")} value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") createTask(status); if (event.key === "Escape") setAddingStatus(""); }} /><div><button className="button small accent" onClick={() => createTask(status)} disabled={!draftTitle.trim()}>{text("Add task", "添加任务")}</button><button className="button small ghost" onClick={() => { setAddingStatus(""); setDraftTitle(""); }}>{text("Cancel", "取消")}</button></div></div> : <button className="column-add" onClick={() => { setAddingStatus(status); setDraftTitle(""); }}><Plus size={13} />{text("Add task", "添加任务")}</button>}
            </section>;
          })}
        </div>

      </div>
    </WorkspaceShell>
  );
}
