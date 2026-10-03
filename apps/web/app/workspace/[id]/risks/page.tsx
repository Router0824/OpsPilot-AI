"use client";

import { use, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Risk } from "@/lib/types";

export default function RisksPage({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);const {text,notify}=useApp();const [items,setItems]=useState<Risk[]>([]);const [updating,setUpdating]=useState("");function load(){api<Risk[]>(`/api/workspaces/${id}/risks`).then(setItems)}useEffect(load,[id]);
  const statusLabel=(status:string)=>text(status,{open:"待處理",monitoring:"監控中",resolved:"已解決"}[status]||status);
  async function advance(item:Risk){const next=item.status==='open'?'monitoring':item.status==='monitoring'?'resolved':'open';setUpdating(item.id);try{const updated=await api<Risk>(`/api/risks/${item.id}`,{method:'PATCH',body:JSON.stringify({status:next})});setItems(items.map(value=>value.id===updated.id?updated:value));notify(text(`Risk moved to ${next}.`,`風險狀態已更新為「${statusLabel(next)}」。`));}catch(error){notify(error instanceof Error?error.message:text("Unable to update risk.","無法更新風險。"),"error");}finally{setUpdating("")}}
  return <WorkspaceShell id={id} title="Risk Tracker"><div className="page"><PageTitle eyebrow={text("Proactive operations","主動式營運")} title={text("Risk Tracker","風險追蹤")} description={text("Detected from meetings, blocked work, missing ownership, overdue deadlines, and unresolved decisions—then kept under human control.","從會議、受阻任務、缺少負責人、逾期期限與未解決決策中偵測風險，並由人工掌控處理狀態。")}/>
  <div className="card interactive-card"><div className="table-wrap"><table className="table"><thead><tr><th>{text("Risk","風險")}</th><th>{text("Severity","嚴重度")}</th><th>{text("Evidence","依據")}</th><th>{text("Suggested action","建議行動")}</th><th>{text("Status","狀態")}</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong><AlertTriangle size={12}/> {item.risk}</strong><br/><span className="muted">{item.source}</span></td><td><span className={`pill ${item.severity==='critical'?'red':'amber'}`}>{text(item.severity,item.severity==='critical'?'緊急':item.severity==='high'?'高':item.severity==='medium'?'中':'低')}</span></td><td>{item.evidence}</td><td>{item.suggested_action}</td><td><button className="button small" disabled={updating===item.id} onClick={()=>advance(item)}>{item.status==='resolved'?<CheckCircle2 size={12}/>:null}{updating===item.id?text("Updating…","更新中…"):statusLabel(item.status)}</button></td></tr>)}</tbody></table></div></div></div></WorkspaceShell>
}
