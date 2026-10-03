"use client";

import { use, useState } from "react";
import { ArrowUp, Bot, CheckCircle2 } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";

type Result={kind:string;title:string;items?:Record<string,string>[];report?:{headline:string;completed:string[];in_progress:string[];blocked:string[];key_decisions:string[];risks:string[];next_week_priorities:string[]}};
const prompts=['Summarize our project status for this week.','Which tasks are overdue?','What changed this week?'];

export default function CopilotPage({params}:{params:Promise<{id:string}>}){const{id}=use(params);const[query,setQuery]=useState(prompts[0]);const[result,setResult]=useState<Result|null>(null);const[loading,setLoading]=useState(false);
async function run(value=query){setQuery(value);setLoading(true);try{const response=await api<{result:Result}>(`/api/workspaces/${id}/copilot`,{method:'POST',body:JSON.stringify({query:value})});setResult(response.result)}finally{setLoading(false)}}
return <WorkspaceShell id={id} title="Operations Copilot"><div className="page"><PageTitle eyebrow="Workspace-aware operations" title="Operations Copilot" description="Ask for status, overdue work, weekly changes, risks, or next priorities. Responses read live tasks, decisions, risks, meetings, and knowledge."/>
<div className="chat-layout"><div className="card chat-panel"><div className="messages">{!result&&!loading&&<div className="empty"><Bot size={26}/><br/>Choose an operations workflow or ask your own question.</div>}{loading&&<div className="eyebrow">Reviewing workspace state…</div>}{result&&<div className="answer"><div className="meta-row"><span className="pill green"><CheckCircle2 size={9}/> Reviewed</span><span className="pill">{result.kind.replace('_',' ')}</span></div><h2 className="display">{result.title}</h2>{result.report&&<><div className="answer-main">{result.report.headline}</div>{[['Completed',result.report.completed],['In progress',result.report.in_progress],['Blocked',result.report.blocked],['Key decisions',result.report.key_decisions],['Risks',result.report.risks],['Next week priorities',result.report.next_week_priorities]].map(([title,items])=><div className="answer-section" key={title as string}><h4>{title as string}</h4><ul>{(items as string[]).map(item=><li key={item}>{item}</li>)}</ul></div>)}</>}{result.items&&<div className="stack">{result.items.map((item,index)=><div className="list-row" key={index}><h3>{item.task||item.value}</h3><p>{Object.entries(item).filter(([key])=>!['task','value'].includes(key)).map(([,value])=>value).join(' · ')}</p></div>)}</div>}</div>}</div><div className="composer"><input value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>event.key==='Enter'&&run()}/><button className="button primary" onClick={()=>run()} disabled={loading}><ArrowUp size={15}/></button></div></div>
<div className="card"><div className="card-header"><h2>Operations workflows</h2><span>one click</span></div><div className="card-body stack">{prompts.map(item=><button className="button" style={{justifyContent:'flex-start'}} key={item} onClick={()=>run(item)}>{item}</button>)}</div></div></div></div></WorkspaceShell>}

