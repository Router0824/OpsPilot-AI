"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export default function WorkspacesPage() {
  const [items, setItems] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "" });
  async function create() {
    const item = await api<Workspace>("/api/workspaces", { method: "POST", body: JSON.stringify(form) });
    setItems([item, ...items]); setOpen(false); setForm({ name: "", goal: "" });
  }
  useEffect(() => { api<Workspace[]>("/api/workspaces").then(setItems); }, []);
  return <div className="workspaces-page">
    <Link href="/"><Logo /></Link>
    <div className="page-title" style={{ marginTop: 65 }}><div><h1 className="display">Your workspaces</h1><p>Each workspace keeps knowledge, decisions, tasks, and agent activity together.</p></div><button className="button primary" onClick={() => setOpen(!open)}><Plus size={14}/>New workspace</button></div>
    {open && <div className="card" style={{ padding: 20, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>Workspace name</label><input value={form.name} onChange={event => setForm({...form, name: event.target.value})} placeholder="Product Research"/></div><div className="field"><label>Project goal</label><textarea style={{ minHeight: 90 }} value={form.goal} onChange={event => setForm({...form, goal: event.target.value})} placeholder="What should this workspace accomplish?"/></div><button className="button accent" disabled={form.name.length < 2 || form.goal.length < 5} onClick={create}>Create workspace</button></div></div>}
    {items.map(item => <Link className="workspace-card" href={`/workspace/${item.id}`} key={item.id}><div><h2>{item.name}</h2><p>{item.goal}</p></div><ArrowRight size={16}/></Link>)}
  </div>;
}

