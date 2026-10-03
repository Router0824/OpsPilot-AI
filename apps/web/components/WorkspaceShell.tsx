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
  ["", "Overview", "總覽", LayoutDashboard],
  ["meetings", "Meetings", "會議智慧", Presentation],
  ["knowledge", "Knowledge Hub", "知識中心", FileText],
  ["copilot", "Operations Copilot", "營運助理", Bot],
  ["tasks", "Task Board", "任務看板", ClipboardList],
  ["decisions", "Decisions", "決策記憶", Gavel],
  ["risks", "Risk Tracker", "風險追蹤", ShieldAlert],
  ["automation", "Automation", "工作流自動化", Workflow],
  ["activity", "AI Activity", "AI 活動紀錄", Activity],
  ["analytics", "Operations Analytics", "營運分析", BarChart3],
] as const;

const titleZh: Record<string, string> = { Overview: "總覽", "Meeting Intelligence": "會議智慧", "Knowledge Hub": "知識中心", "Operations Copilot": "營運助理", "Task Board": "任務看板", "Decision Memory": "決策記憶", "Risk Tracker": "風險追蹤", Automation: "工作流自動化", "AI Activity": "AI 活動紀錄", "Operations Analytics": "營運分析", Evaluation: "評估與可觀測性", Memory: "專案記憶", Chat: "知識問答" };

export function WorkspaceShell({ id, children, title }: { id: string; children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { locale, text } = useApp();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  useEffect(() => { api<Workspace>(`/api/workspaces/${id}`).then(setWorkspace).catch(() => undefined); }, [id]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/"><Logo /></Link>
        <div className="workspace-switcher"><small>{text("Workspace", "工作區")}</small><strong>{workspace?.name || text("Loading workspace…", "載入工作區…")}</strong></div>
        <div className="side-label">{text("Workspace", "工作區")}</div>
        <nav className="side-nav">
          {nav.map(([slug, label, zhLabel, Icon]) => {
            const href = `/workspace/${id}${slug ? `/${slug}` : ""}`;
            return <Link key={label} href={href} className={`side-link ${pathname === href ? "active" : ""}`}><Icon size={15} />{locale === "zh" ? zhLabel : label}</Link>;
          })}
        </nav>
        <div className="side-bottom">
          <div className="side-link"><Settings size={15} />{text("Settings", "設定")}<LocaleToggle compact /></div>
          <div className="demo-badge"><strong>{text("Demo Mode", "示範模式")}</strong><br />{text("AI Product Launch · synthetic data", "AI 產品發布 · 合成資料")}</div>
        </div>
      </aside>
      <main className="main">
        <header className="app-header">
          <div className="breadcrumbs">{text("Workspace", "工作區")}&nbsp; / &nbsp;<strong>{locale === "zh" ? titleZh[title] || title : title}</strong></div>
          <div className="header-actions"><LocaleToggle compact /><div className="status"><span className="status-dot" />{text("System operational", "系統運作正常")}</div><Link className="button small" href="/workspaces">{text("All workspaces", "所有工作區")}</Link></div>
        </header>
        {children}
      </main>
    </div>
  );
}
