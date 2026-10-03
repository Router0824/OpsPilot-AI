"use client";

import { use, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Risk } from "@/lib/types";

export default function RisksPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const [items,setItems]=useState<Risk[]>([]);function load(){api<Risk[]>(`/api/workspaces/${id}/risks`).then(setItems)}useEffect(load,[id]);
  async function advance(item:Risk){const next=item.status==='open'?'monitoring':item.status==='monitoring'?'resolved':'open';const updated=await api<Risk>(`/api/risks/${item.id}`,{method:'PATCH',body:JSON.stringify({status:next})});setItems(items.map(value=>value.id===updated.id?updated:value))}
  return <WorkspaceShell id={id} title="Risk Tracker"><div className="page"><PageTitle eyebrow="Proactive operations" title="Risk Tracker" description="Detected from meetings, blocked work, missing ownership, overdue deadlines, and unresolved decisions—then kept under human control."/>
  <div className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Risk</th><th>Severity</th><th>Evidence</th><th>Suggested action</th><th>Status</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong><AlertTriangle size={12}/> {item.risk}</strong><br/><span className="muted">{item.source}</span></td><td><span className={`pill ${item.severity==='critical'?'red':'amber'}`}>{item.severity}</span></td><td>{item.evidence}</td><td>{item.suggested_action}</td><td><button className="button small" onClick={()=>advance(item)}>{item.status==='resolved'?<CheckCircle2 size={12}/>:null}{item.status}</button></td></tr>)}</tbody></table></div></div></div></WorkspaceShell>
}

