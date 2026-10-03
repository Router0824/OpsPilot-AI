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
      notify(text("Workspace created.", "工作區已建立。"));
    } catch (error) {
      notify(error instanceof Error ? error.message : text("Unable to create workspace.", "無法建立工作區。"), "error");
    } finally { setSaving(false); }
  }
  useEffect(() => { api<Workspace[]>("/api/workspaces").then(setItems).catch(() => undefined).finally(() => setLoading(false)); }, []);
  return <div className="workspaces-page">
    <div className="workspace-page-top"><Link href="/"><Logo /></Link><LocaleToggle /></div>
    <div className="page-title" style={{ marginTop: 65 }}><div><h1 className="display">{text("Your workspaces", "你的工作區")}</h1><p>{text("Each workspace keeps knowledge, decisions, tasks, and agent activity together.", "每個工作區都會集中保存知識、決策、任務與 AI 活動。")}</p></div><button className="button primary" onClick={() => setOpen(!open)}><Plus size={14}/>{text("New workspace", "新增工作區")}</button></div>
    {open && <div className="card form-reveal" style={{ padding: 20, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>{text("Workspace name", "工作區名稱")}</label><input value={form.name} onChange={event => setForm({...form, name: event.target.value})} placeholder={text("Product Research", "產品研究")}/></div><div className="field"><label>{text("Project goal", "專案目標")}</label><textarea style={{ minHeight: 90 }} value={form.goal} onChange={event => setForm({...form, goal: event.target.value})} placeholder={text("What should this workspace accomplish?", "這個工作區希望完成什麼？")}/></div><button className="button accent" disabled={saving || form.name.length < 2 || form.goal.length < 5} onClick={create}>{saving ? text("Creating…", "建立中…") : text("Create workspace", "建立工作區")}</button></div></div>}
    {loading ? <div className="loading">{text("Loading workspaces…", "載入工作區…")}</div> : items.map(item => <Link className="workspace-card" href={`/workspace/${item.id}`} key={item.id}><div><h2>{item.name}</h2><p>{item.goal}</p></div><ArrowRight size={16}/></Link>)}
  </div>;
}
