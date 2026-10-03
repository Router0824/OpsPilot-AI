"use client";

import { use, useEffect, useState } from "react";
import { Brain, Clock3, Gavel, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Memory } from "@/lib/types";

const icons = { semantic: Brain, decision: Gavel, episodic: Clock3 };

export default function MemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [items, setItems] = useState<Memory[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "decision", content: "", reason: "", source: "user", importance: .8 });
  function load() { api<Memory[]>(`/api/workspaces/${id}/memories`).then(setItems); }
  useEffect(load, [id]);
  async function create() { const memory = await api<Memory>(`/api/workspaces/${id}/memories`, {method:'POST',body:JSON.stringify(form)}); setItems([memory,...items]); setOpen(false); setForm({...form,content:'',reason:''}); }
  return <WorkspaceShell id={id} title="Project Memory"><div className="page">
    <PageTitle eyebrow="Durable context" title="Project Memory" description="Semantic facts, explicit decisions, and episodic outcomes are retrieved alongside documents so the agent does not start from zero." action={<button className="button primary" onClick={() => setOpen(!open)}><Plus size={14}/>Add memory</button>}/>
    {open && <div className="card" style={{padding:18,marginBottom:18}}><div className="form-grid"><div className="field"><label>Type</label><select value={form.type} onChange={event=>setForm({...form,type:event.target.value})}><option value="semantic">Semantic</option><option value="decision">Decision</option><option value="episodic">Episodic</option></select></div><div className="field"><label>Memory</label><textarea style={{minHeight:90}} value={form.content} onChange={event=>setForm({...form,content:event.target.value})}/></div><div className="field"><label>Reason / context</label><input value={form.reason} onChange={event=>setForm({...form,reason:event.target.value})}/></div><button className="button accent" disabled={!form.content} onClick={create}>Save memory</button></div></div>}
    {(['decision','semantic','episodic'] as const).map(type => <section key={type} style={{marginBottom:28}}><div className="page-title" style={{marginBottom:13}}><div><h1 className="display" style={{fontSize:20,textTransform:'capitalize'}}>{type} memory</h1><p>{items.filter(item=>item.type===type).length} durable records</p></div></div><div className="memory-grid">{items.filter(item=>item.type===type).map(item => {const Icon=icons[type];return <div className="memory-card" key={item.id}><Icon size={18}/><h3>{item.content}</h3><p>{item.reason || `Source: ${item.source}`}</p><div className="meta-row"><span className="pill green">{Math.round(item.importance*100)}% importance</span><span className="pill">{item.source}</span></div></div>})}</div></section>)}
  </div></WorkspaceShell>;
}

