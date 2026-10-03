"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, BarChart3, Bot, ClipboardList, FileText, Gavel, LayoutDashboard, Presentation, Settings, ShieldAlert, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { LocaleToggle, useApp } from "./AppProvider";
import { Logo } from "./Logo";

const nav = [
  ["", "Overview", "总览", LayoutDashboard],
  ["meetings", "Meetings", "会议智能", Presentation],
  ["knowledge", "Knowledge Hub", "知识中心", FileText],
  ["copilot", "Operations Copilot", "运营助理", Bot],
  ["tasks", "Task Board", "任务看板", ClipboardList],
  ["decisions", "Decisions", "决策记忆", Gavel],
  ["risks", "Risk Tracker", "风险跟踪", ShieldAlert],
  ["automation", "Automation", "工作流自动化", Workflow],
  ["activity", "AI Activity", "AI 活动记录", Activity],
  ["analytics", "Operations Analytics", "运营分析", BarChart3],
] as const;

const titleZh: Record<string, string> = { Overview: "总览", "Meeting Intelligence": "会议智能", "Knowledge Hub": "知识中心", "Operations Copilot": "运营助理", "Task Board": "任务看板", "Decision Memory": "决策记忆", "Risk Tracker": "风险跟踪", Automation: "工作流自动化", "AI Activity": "AI 活动记录", "Operations Analytics": "运营分析", Evaluation: "评估与可观测性", Memory: "项目记忆", Chat: "知识问答" };

export function WorkspaceShell({ id, children, title }: { id: string; children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { locale, text } = useApp();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  useEffect(() => { api<Workspace>(`/api/workspaces/${id}`).then(setWorkspace).catch(() => undefined); }, [id]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/"><Logo /></Link>
        <div className="workspace-switcher"><small>{text("Workspace", "工作区")}</small><strong>{workspace?.name || text("Loading workspace…", "加载工作区…")}</strong></div>
        <div className="side-label">{text("Workspace", "工作区")}</div>
        <nav className="side-nav">
          {nav.map(([slug, label, zhLabel, Icon]) => {
            const href = `/workspace/${id}${slug ? `/${slug}` : ""}`;
            return <Link key={label} href={href} className={`side-link ${pathname === href ? "active" : ""}`}><Icon size={15} />{locale === "zh" ? zhLabel : label}</Link>;
          })}
        </nav>
        <div className="side-bottom">
          <div className="side-link"><Settings size={15} />{text("Settings", "设置")}<LocaleToggle compact /></div>
          <div className="demo-badge"><strong>{text("Demo Mode", "演示模式")}</strong><br />{text("AI Product Launch · synthetic data", "AI 产品发布 · 合成数据")}</div>
        </div>
      </aside>
      <main className="main">
        <header className="app-header">
          <div className="breadcrumbs">{text("Workspace", "工作区")}&nbsp; / &nbsp;<strong>{locale === "zh" ? titleZh[title] || title : title}</strong></div>
          <div className="header-actions"><LocaleToggle compact /><div className="status"><span className="status-dot" />{text("System operational", "系统运行正常")}</div><Link className="button small" href="/workspaces">{text("All workspaces", "所有工作区")}</Link></div>
        </header>
        {children}
      </main>
    </div>
  );
}
