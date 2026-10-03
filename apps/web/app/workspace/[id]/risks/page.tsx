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
  const statusLabel=(status:string)=>text(status,{open:"待处理",monitoring:"监控中",resolved:"已解决"}[status]||status);
  async function advance(item:Risk){const next=item.status==='open'?'monitoring':item.status==='monitoring'?'resolved':'open';setUpdating(item.id);try{const updated=await api<Risk>(`/api/risks/${item.id}`,{method:'PATCH',body:JSON.stringify({status:next})});setItems(items.map(value=>value.id===updated.id?updated:value));notify(text(`Risk moved to ${next}.`,`风险状态已更新为「${statusLabel(next)}」。`));}catch(error){notify(error instanceof Error?error.message:text("Unable to update risk.","无法更新风险。"),"error");}finally{setUpdating("")}}
  return <WorkspaceShell id={id} title="Risk Tracker"><div className="page"><PageTitle eyebrow={text("Proactive operations","主动运营")} title={text("Risk Tracker","风险跟踪")} description={text("Detected from meetings, blocked work, missing ownership, overdue deadlines, and unresolved decisions—then kept under human control.","从会议、受阻任务、缺少负责人、逾期期限与未解决决策中检测风险，并由人工控制处理状态。")}/>
  <div className="card interactive-card"><div className="table-wrap"><table className="table"><thead><tr><th>{text("Risk","风险")}</th><th>{text("Severity","严重程度")}</th><th>{text("Evidence","依据")}</th><th>{text("Suggested action","建议行动")}</th><th>{text("Status","状态")}</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td><strong><AlertTriangle size={12}/> {item.risk}</strong><br/><span className="muted">{item.source}</span></td><td><span className={`pill ${item.severity==='critical'?'red':'amber'}`}>{text(item.severity,item.severity==='critical'?'紧急':item.severity==='high'?'高':item.severity==='medium'?'中':'低')}</span></td><td>{item.evidence}</td><td>{item.suggested_action}</td><td><button className="button small" disabled={updating===item.id} onClick={()=>advance(item)}>{item.status==='resolved'?<CheckCircle2 size={12}/>:null}{updating===item.id?text("Updating…","更新中…"):statusLabel(item.status)}</button></td></tr>)}</tbody></table></div></div></div></WorkspaceShell>
}
