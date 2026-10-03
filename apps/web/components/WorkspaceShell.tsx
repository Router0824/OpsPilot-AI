"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BarChart3, Bot, ClipboardList, FileText, Gavel, LayoutDashboard, Presentation, Settings, ShieldAlert, Workflow } from "lucide-react";
import { api } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import { Logo } from "./Logo";

const nav = [
  ["", "Overview", LayoutDashboard],
  ["meetings", "Meetings", Presentation],
  ["knowledge", "Knowledge Hub", FileText],
  ["copilot", "Operations Copilot", Bot],
  ["tasks", "Task Board", ClipboardList],
  ["decisions", "Decisions", Gavel],
  ["risks", "Risk Tracker", ShieldAlert],
  ["automation", "Automation", Workflow],
  ["analytics", "Operations Analytics", BarChart3],
] as const;

export function WorkspaceShell({ id, children, title }: { id: string; children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  useEffect(() => { api<Workspace>(`/api/workspaces/${id}`).then(setWorkspace).catch(() => undefined); }, [id]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/"><Logo /></Link>
        <div className="workspace-switcher"><small>Workspace</small><strong>{workspace?.name || "Loading workspace…"}</strong></div>
        <div className="side-label">Workspace</div>
        <nav className="side-nav">
          {nav.map(([slug, label, Icon]) => {
            const href = `/workspace/${id}${slug ? `/${slug}` : ""}`;
            return <Link key={label} href={href} className={`side-link ${pathname === href ? "active" : ""}`}><Icon size={15} />{label}</Link>;
          })}
        </nav>
        <div className="side-bottom">
          <div className="side-link"><Settings size={15} />Settings</div>
          <div className="demo-badge"><strong>Demo Mode</strong><br />AI Product Launch · synthetic data</div>
        </div>
      </aside>
      <main className="main">
        <header className="app-header">
          <div className="breadcrumbs">Workspace&nbsp; / &nbsp;<strong>{title}</strong></div>
          <div className="header-actions"><div className="status"><span className="status-dot" />System operational</div><Link className="button small" href="/workspaces">All workspaces</Link></div>
        </header>
        {children}
      </main>
    </div>
  );
}
