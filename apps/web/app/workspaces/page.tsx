"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { LocaleToggle, useApp } from "@/components/AppProvider";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export default function WorkspacesPage() {
  const { text, notify } = useApp();
  const [items, setItems] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "" });
  async function create() {
    setSaving(true);
    try {
      const item = await api<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(form) });
      setItems([item, ...items]); setOpen(false); setForm({ name: "", goal: "" });
      notify(text("Workspace created.", "工作区已创建。"));
    } catch (error) {
      notify(error instanceof Error ? error.message : text("Unable to create workspace.", "无法创建工作区。"), "error");
    } finally { setSaving(false); }
  }
  useEffect(() => { api<Workspace[]>("/api/workspaces").then(setItems).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return <div className="workspaces-page">
    <div className="workspace-page-top"><Link href="/"><Logo /></Link><LocaleToggle /></div>
    <div className="page-title" style={{ marginTop: 65 }}><div><h1 className="display">{text("Your workspaces", "你的工作区")}</h1><p>{text("Each workspace keeps knowledge, decisions, tasks, and agent activity together.", "每个工作区都会集中保存知识、决策、任务与 AI 活动。")}</p></div><button className="button primary" onClick={() => setOpen(!open)}><Plus size={14}/>{text("New workspace", "添加工作区")}</button></div>
    {open && <div className="card form-reveal" style={{ padding: 20, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>{text("Workspace name", "工作区名称")}</label><input value={form.name} onChange={event => setForm({...form, name: event.target.value})} placeholder={text("Product Research", "产品研究")}/></div><div className="field"><label>{text("Project goal", "项目目标")}</label><textarea style={{ minHeight: 90 }} value={form.goal} onChange={event => setForm({...form, goal: event.target.value})} placeholder={text("What should this workspace accomplish?", "这个工作区希望完成什么？")}/></div><button className="button accent" disabled={saving || form.name.length < 2 || form.goal.length < 5} onClick={create}>{saving ? text("Creating…", "创建中…") : text("Create workspace", "创建工作区")}</button></div></div>}
    {loading ? <div className="loading">{text("Loading workspaces…", "加载工作区…")}</div> : items.map(item => <Link className="workspace-card" href={`/workspace/${item.id}`} key={item.id}><div><h2>{item.name}</h2><p>{item.goal}</p></div><ArrowRight size={16}/></Link>)}
  </div>;
}
