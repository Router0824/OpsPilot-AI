"use client";

import { use, useEffect, useState } from "react";
import { Gavel, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Memory } from "@/lib/types";

export default function DecisionsPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const [items,setItems]=useState<Memory[]>([]);const [open,setOpen]=useState(false);const [form,setForm]=useState({content:'',reason:'',source:'Human review'});
  function load(){api<Memory[]>(`/api/workspaces/${id}/decisions`).then(setItems)}useEffect(load,[id]);
  async function create(){const item=await api<Memory>(`/api/workspaces/${id}/memories`,{method:'POST',body:JSON.stringify({type:'decision',importance:.95,...form})});setItems([item,...items]);setOpen(false);setForm({content:'',reason:'',source:'Human review'})}
  return <WorkspaceShell id={id} title="Decision Memory"><div className="page"><PageTitle eyebrow="Organizational memory" title="Decision Memory" description="Formal choices remain visible to future workflows, with the reason and source needed to avoid reopening settled questions." action={<button className="button primary" onClick={()=>setOpen(!open)}><Plus size={14}/>Record decision</button>}/>
  {open&&<div className="card" style={{padding:18,marginBottom:18}}><div className="form-grid"><div className="field"><label>Decision</label><input value={form.content} onChange={event=>setForm({...form,content:event.target.value})}/></div><div className="field"><label>Reason</label><textarea style={{minHeight:80}} value={form.reason} onChange={event=>setForm({...form,reason:event.target.value})}/></div><button className="button accent" onClick={create} disabled={!form.content}>Approve & record</button></div></div>}
  <div className="memory-grid">{items.map(item=><div className="memory-card" key={item.id}><Gavel size={18}/><h3>{item.content}</h3><p>{item.reason}</p><div className="meta-row"><span className="pill green">Active</span><span className="pill">{item.source}</span></div></div>)}</div></div></WorkspaceShell>
}

