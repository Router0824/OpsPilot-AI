"use client";

import { use, useEffect, useState } from "react";
import { Brain, Clock3, Gavel, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Memory } from "@/lib/types";

const icons = { semantic: Brain, decision: Gavel, episodic: Clock3 };
export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const { text, notify } = useApp();
  const [items, setItems] = useState<Memory[]>([]); const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "decision", content: "", reason: "", source: "user", importance: .8 });
  useEffect(() => { api<Memory[]>(`/api/workspaces/${id}/memories`).then(setItems); }, [id]);
  async function create() { if (!form.content.trim() || saving) return; setSaving(true); try { const memory = await api<Memory>(`/api/workspaces/${id}/memories`, { method: "POST", body: JSON.stringify(form) }); setItems(current => [memory, ...current]); setOpen(false); setForm(current => ({ ...current, content: "", reason: "" })); notify(text("Memory saved.", "记忆已保存。")); } catch (error) { notify(error instanceof Error ? error.message : text("Unable to save memory.", "无法保存记忆。"), "error"); } finally { setSaving(false); } }
  const typeLabel = (type: string) => type === "decision" ? text("Decision", "决策") : type === "semantic" ? text("Semantic", "语意") : text("Episodic", "事件");
  return <WorkspaceShell id={id} title="Memory"><div className="page">
    <PageTitle eyebrow={text("Durable context", "持久上下文")} title={text("Project Memory", "项目记忆")} description={text("Semantic facts, explicit decisions, and episodic outcomes are retrieved alongside documents so the agent does not start from zero.", "语意事实、明确决策与事件结果会和文档一起被检索，让代理每次运行都不必从零开始。")}
      action={<button className="button primary" onClick={() => setOpen(current => !current)}><Plus size={14}/>{open ? text("Close form", "关闭表单") : text("Add memory", "添加记忆")}</button>}/>
    {open && <div className="card form-reveal" style={{ padding: 18, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>{text("Type", "类型")}</label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="semantic">{text("Semantic", "语意")}</option><option value="decision">{text("Decision", "决策")}</option><option value="episodic">{text("Episodic", "事件")}</option></select></div><div className="field"><label>{text("Memory", "记忆内容")}</label><textarea autoFocus style={{ minHeight: 90 }} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder={text("What should the workspace remember?", "工作区需要记住什么？")}/></div><div className="field"><label>{text("Reason / context", "理由／上下文")}</label><input value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })}/></div><button className="button accent" disabled={!form.content.trim() || saving} onClick={create}>{saving ? text("Saving…", "保存中…") : text("Save memory", "保存记忆")}</button></div></div>}
    {(["decision", "semantic", "episodic"] as const).map(type => { const typeItems = items.filter(item => item.type === type); return <section key={type} style={{ marginBottom: 28 }}><div className="page-title" style={{ marginBottom: 13 }}><div><h1 className="display" style={{ fontSize: 20 }}>{typeLabel(type)}{text(" memory", "记忆")}</h1><p>{text(`${typeItems.length} durable records`, `${typeItems.length} 条持久记录`)}</p></div></div>{!typeItems.length ? <div className="column-empty"><strong>{text("No records yet", "尚无记录")}</strong><p>{text("Add one when the project creates durable context.", "当项目产生需要长期保存的上下文时，可在此添加。")}</p></div> : <div className="memory-grid">{typeItems.map(item => { const Icon = icons[type]; return <div className="memory-card interactive-card" key={item.id}><Icon size={18}/><h3>{item.content}</h3><p>{item.reason || `${text("Source", "来源")}: ${item.source}`}</p><div className="meta-row"><span className="pill green">{Math.round(item.importance * 100)}% {text("importance", "重要性")}</span><span className="pill">{item.source}</span></div></div>; })}</div>}</section>; })}
  </div></WorkspaceShell>;
}
