"use client";

import Link from "next/link";
import { ArrowRight, Brain, Check, FileStack, Github, Presentation, Workflow } from "lucide-react";
import { LocaleToggle, useApp } from "@/components/AppProvider";
import { Logo } from "@/components/Logo";
import { demoWorkspaceId } from "@/lib/api";

export default function Landing() {
  const { locale, text } = useApp();
  const capabilities = locale === "zh" ? [
    [Presentation, "會議智慧", "提取決策、負責人、期限、風險與後續行動，並交由人工確認。"],
    [FileStack, "知識管理", "把零散文件轉換為可搜尋、可追溯來源的組織知識。"],
    [Workflow, "工作流自動化", "串連會後追蹤、任務管理、週報產出與風險偵測。"],
    [Brain, "組織記憶", "保存正式決策與專案歷史，供未來每個工作流使用。"],
  ] as const : [
    [Presentation, "Meeting Intelligence", "Extract decisions, owners, deadlines, risks, and next actions for human review."],
    [FileStack, "Knowledge Management", "Turn fragmented documents into cited, searchable organizational knowledge."],
    [Workflow, "Workflow Automation", "Connect meeting follow-up, task tracking, reporting, and risk detection."],
    [Brain, "Organizational Memory", "Keep formal decisions and project history available to every future workflow."],
  ] as const;
  return (
    <>
      <nav className="top-nav">
        <Logo />
        <div className="nav-links">
          <a href="#capabilities">{text("Capabilities", "核心能力")}</a><a href="https://github.com" target="_blank">GitHub</a><LocaleToggle />
          <Link className="button small primary" href={`/workspace/${demoWorkspaceId}`}>{text("Open workspace", "開啟工作區")} <ArrowRight size={13} /></Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="eyebrow">{text("AI-native operations workspace for smarter teams", "為高效團隊打造的 AI 原生營運工作區")}</div>
          <h1 className="display">{text("Conversation into ", "讓對話轉化為")}<span>{text("action.", "行動。")}</span></h1>
          <p className="hero-copy">{text("Turn meetings, documents, and project context into structured knowledge, decisions, tasks, risks, and automated workflows.", "將會議、文件與專案脈絡轉化為結構化知識、決策、任務、風險與自動化工作流。")}</p>
          <div className="hero-actions">
            <Link className="button primary" href={`/workspace/${demoWorkspaceId}`}>{text("Try the live demo", "體驗線上示範")} <ArrowRight size={15} /></Link>
            <a className="button" href="https://github.com" target="_blank"><Github size={15} />{text("View on GitHub", "查看 GitHub")}</a>
          </div>
          <div className="hero-note"><Check size={13} />{text("No API key required · synthetic demo data included", "無需 API Key · 內建合成示範資料")}</div>
        </div>
        <div className="hero-visual">
          <div className="visual-window">
            <div className="visual-bar"><span className="visual-dot"/><span className="visual-dot"/><span className="visual-dot"/></div>
            <div className="visual-body">
              <div className="visual-label">{text("Agent run · 04", "AI 執行 · 04")}</div>
              <div className="visual-query">{text("Launch meeting → follow-up", "發布會議 → 後續追蹤")}</div>
              <div className="flow">
                <div className="flow-item"><strong>{text("Meeting captured", "已擷取會議")}</strong><span>{text("12 min", "12 分鐘")}</span></div>
                <div className="flow-item"><strong>{text("Decision recorded", "已記錄決策")}</strong><span>Azure OpenAI</span></div>
                <div className="flow-item"><strong>{text("Tasks assigned", "已指派任務")}</strong><span>{text("2 owners", "2 位負責人")}</span></div>
                <div className="flow-item active"><strong>{text("Human review", "人工確認")}</strong><span className="pulse" /></div>
                <div className="flow-item"><strong>{text("Risk detected", "已偵測風險")}</strong><span>{text("Permissions", "權限")}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="capabilities" id="capabilities">
        <div className="section-heading"><div className="eyebrow">{text("From conversation to action", "從對話走向行動")}</div><h2 className="display">{text("Meeting → Decision → Task → Workflow → Memory.", "會議 → 決策 → 任務 → 工作流 → 記憶。")}</h2><p>{text("OpsPilot connects the operational work that teams normally copy, summarize, assign, and chase by hand.", "OpsPilot 串連團隊原本需要手動複製、摘要、指派與追蹤的營運工作。")}</p></div>
        <div className="cap-grid">{capabilities.map(([Icon, name, copy]) => <div className="cap-card" key={name}><div className="cap-icon"><Icon size={18}/></div><h3>{name}</h3><p>{copy}</p></div>)}</div>
      </section>
      <footer className="footer"><Logo /><span>{text("Open source · Synthetic demo content · Built for responsible AI operations", "開源 · 合成示範內容 · 為負責任的 AI 營運而打造")}</span></footer>
    </>
  );
}
