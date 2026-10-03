"use client";

import { use, useEffect, useState } from "react";
import { Network, Sparkles } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Task } from "@/lib/types";

const columns = [["todo","Todo"],["in_progress","In progress"],["blocked","Blocked"],["done","Done"]] as const;

export default function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prompt, setPrompt] = useState("Help us finish this project in 2 weeks.");
  const [planning, setPlanning] = useState(false);
  function load(){api<Task[]>(`/api/workspaces/${id}/tasks`).then(setTasks)}
  useEffect(load,[id]);
  async function update(task:Task){const flow:Task['status'][]=['todo','in_progress','blocked','done'];const next=flow[(flow.indexOf(task.status)+1)%flow.length];const changed=await api<Task>(`/api/tasks/${task.id}`,{method:'PATCH',body:JSON.stringify({status:next})});setTasks(tasks.map(item=>item.id===changed.id?changed:item));}
  async function plan(){setPlanning(true);try{await api(`/api/workspaces/${id}/plans`,{method:'POST',body:JSON.stringify({prompt})});load();}finally{setPlanning(false)}}
  return <WorkspaceShell id={id} title="Task Board"><div className="page">
    <PageTitle eyebrow="Workflow automation" title="Task Board" description="Turn goals and meeting outcomes into milestone-based work with owners, dependencies, priorities, and expected outputs."/>
    <div className="card" style={{marginBottom:18}}><div className="card-body"><div className="composer" style={{border:0,padding:0}}><input value={prompt} onChange={event=>setPrompt(event.target.value)}/><button className="button primary" onClick={plan} disabled={planning}><Sparkles size={14}/>{planning?'Planning…':'Generate plan'}</button></div></div></div>
    <div className="board">{columns.map(([status,label])=><div className="column" key={status}><div className="column-head"><span>{label}</span><span>{tasks.filter(task=>task.status===status).length}</span></div>{tasks.filter(task=>task.status===status).map(task=><div className="task-card" key={task.id} onClick={()=>update(task)} title="Click to advance status"><div className="meta-row" style={{marginTop:0}}><span className={`pill ${task.priority==='critical'?'red':task.priority==='high'?'amber':''}`}>{task.priority}</span>{task.dependencies.length>0&&<span className="pill"><Network size={9}/> {task.dependencies.length}</span>}</div><h3>{task.title}</h3><p>{task.expected_output||task.description}</p>{task.evidence&&<div className="pill green" style={{display:'inline-block',marginTop:8}}>{task.evidence}</div>}<div className="task-footer"><span className="muted" style={{fontSize:9}}>{task.deadline||task.milestone}</span><span className="avatar">{task.owner==='Unassigned'?'?':task.owner.slice(0,2).toUpperCase()}</span></div></div>)}</div>)}</div>
  </div></WorkspaceShell>;
}
