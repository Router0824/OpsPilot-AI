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
  async function create() { if (!form.content.trim() || saving) return; setSaving(true); try { const memory = await api<Memory>(`/api/workspaces/${id}/memories`, { method: "POST", body: JSON.stringify(form) }); setItems(current => [memory, ...current]); setOpen(false); setForm(current => ({ ...current, content: "", reason: "" })); notify(text("Memory saved.", "記憶已儲存。")); } catch (error) { notify(error instanceof Error ? error.message : text("Unable to save memory.", "無法儲存記憶。"), "error"); } finally { setSaving(false); } }
  const typeLabel = (type: string) => type === "decision" ? text("Decision", "決策") : type === "semantic" ? text("Semantic", "語意") : text("Episodic", "事件");
  return <WorkspaceShell id={id} title="Memory"><div className="page">
    <PageTitle eyebrow={text("Durable context", "持久脈絡")} title={text("Project Memory", "專案記憶")} description={text("Semantic facts, explicit decisions, and episodic outcomes are retrieved alongside documents so the agent does not start from zero.", "語意事實、明確決策與事件結果會和文件一起被檢索，讓代理每次執行都不必從零開始。")}
      action={<button className="button primary" onClick={() => setOpen(current => !current)}><Plus size={14}/>{open ? text("Close form", "關閉表單") : text("Add memory", "新增記憶")}</button>}/>
    {open && <div className="card form-reveal" style={{ padding: 18, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>{text("Type", "類型")}</label><select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}><option value="semantic">{text("Semantic", "語意")}</option><option value="decision">{text("Decision", "決策")}</option><option value="episodic">{text("Episodic", "事件")}</option></select></div><div className="field"><label>{text("Memory", "記憶內容")}</label><textarea autoFocus style={{ minHeight: 90 }} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder={text("What should the workspace remember?", "工作區需要記住什麼？")}/></div><div className="field"><label>{text("Reason / context", "理由／脈絡")}</label><input value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })}/></div><button className="button accent" disabled={!form.content.trim() || saving} onClick={create}>{saving ? text("Saving…", "儲存中…") : text("Save memory", "儲存記憶")}</button></div></div>}
    {(["decision", "semantic", "episodic"] as const).map(type => { const typeItems = items.filter(item => item.type === type); return <section key={type} style={{ marginBottom: 28 }}><div className="page-title" style={{ marginBottom: 13 }}><div><h1 className="display" style={{ fontSize: 20 }}>{typeLabel(type)}{text(" memory", "記憶")}</h1><p>{text(`${typeItems.length} durable records`, `${typeItems.length} 筆持久記錄`)}</p></div></div>{!typeItems.length ? <div className="column-empty"><strong>{text("No records yet", "尚無記錄")}</strong><p>{text("Add one when the project creates durable context.", "當專案產生需要長期保存的脈絡時，可在此新增。")}</p></div> : <div className="memory-grid">{typeItems.map(item => { const Icon = icons[type]; return <div className="memory-card interactive-card" key={item.id}><Icon size={18}/><h3>{item.content}</h3><p>{item.reason || `${text("Source", "來源")}: ${item.source}`}</p><div className="meta-row"><span className="pill green">{Math.round(item.importance * 100)}% {text("importance", "重要度")}</span><span className="pill">{item.source}</span></div></div>; })}</div>}</section>; })}
  </div></WorkspaceShell>;
}
