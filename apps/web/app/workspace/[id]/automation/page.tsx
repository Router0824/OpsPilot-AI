"use client";

import { use } from "react";
import { ArrowRight, CalendarClock, FileText, Presentation, ShieldAlert, Workflow } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";

const flows=[
  [Presentation,'Meeting → Tasks','Meeting added','Analyze decisions & actions','Human review → Task Board'],
  [Presentation,'Meeting → Decision Memory','Meeting approved','Extract evidence & reason','Record formal decision'],
  [FileText,'Documents → Knowledge Base','Document uploaded','Parse, chunk & index','Make knowledge retrievable'],
  [CalendarClock,'Workspace → Weekly Report','Weekly review','Summarize workspace state','Publish operations report'],
  [ShieldAlert,'Risk Detection','Task or meeting changed','Find blockers & conflicts','Review → Risk Tracker'],
] as const;

export default function AutomationPage({params}:{params:Promise<{id:string}>}){const{id}=use(params);return <WorkspaceShell id={id} title="Workflow Automation"><div className="page"><PageTitle eyebrow="Automation gallery" title="Operational workflows" description="Agents serve repeatable operating workflows rather than acting as standalone chatbots. Every write path includes human review."/>
<div className="doc-grid">{flows.map(([Icon,title,trigger,step,action])=><div className="doc-card" key={title} style={{minHeight:190}}><Icon size={18}/><h3>{title}</h3><div className="flow" style={{marginTop:15}}><div className="flow-item"><span>{trigger}</span><ArrowRight size={11}/></div><div className="flow-item active"><span>{step}</span><Workflow size={11}/></div><div className="flow-item"><span>{action}</span></div></div></div>)}</div></div></WorkspaceShell>}

