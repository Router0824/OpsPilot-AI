"use client";

import Link from "next/link";
import { ArrowRight, Brain, Check, FileStack, Github, Presentation, Workflow } from "lucide-react";
import { LocaleToggle, useApp } from "@/components/AppProvider";
import { Logo } from "@/components/Logo";
import { demoWorkspaceId } from "@/lib/api";

export default function Landing() {
  const { locale, text } = useApp();
  const capabilities = locale === "zh" ? [
    [Presentation, "会议智能", "提取决策、负责人、期限、风险与后续行动，并交由人工确认。"],
    [FileStack, "知识管理", "把零散文档转换为可搜索、可追溯来源的组织知识。"],
    [Workflow, "工作流自动化", "串联会后跟进、任务管理、周报生成与风险检测。"],
    [Brain, "组织记忆", "保存正式决策与项目历史，供未来每个工作流使用。"],
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
          <Link className="button small primary" href={`/workspace/${demoWorkspaceId}`}>{text("Open workspace", "打开工作区")} <ArrowRight size={13} /></Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="eyebrow">{text("AI-native operations workspace for smarter teams", "为高效团队打造的 AI 原生运营工作区")}</div>
          <h1 className="display">{text("Conversation into ", "让对话转化为")}<span>{text("action.", "行动。")}</span></h1>
          <p className="hero-copy">{text("Turn meetings, documents, and project context into structured knowledge, decisions, tasks, risks, and automated workflows.", "将会议、文档与项目上下文转化为结构化知识、决策、任务、风险与自动化工作流。")}</p>
          <div className="hero-actions">
            <Link className="button primary" href={`/workspace/${demoWorkspaceId}`}>{text("Try the live demo", "体验在线演示")} <ArrowRight size={15} /></Link>
            <a className="button" href="https://github.com" target="_blank"><Github size={15} />{text("View on GitHub", "查看 GitHub")}</a>
          </div>
          <div className="hero-note"><Check size={13} />{text("No API key required · synthetic demo data included", "无需 API Key · 内置合成演示数据")}</div>
        </div>
        <div className="hero-visual">
          <div className="visual-window">
            <div className="visual-bar"><span className="visual-dot"/><span className="visual-dot"/><span className="visual-dot"/></div>
            <div className="visual-body">
              <div className="visual-label">{text("Agent run · 04", "AI 运行 · 04")}</div>
              <div className="visual-query">{text("Launch meeting → follow-up", "项目启动会 → 后续跟进")}</div>
              <div className="flow">
                <div className="flow-item"><strong>{text("Meeting captured", "会议已记录")}</strong><span>{text("12 min", "12 分钟")}</span></div>
                <div className="flow-item"><strong>{text("Decision recorded", "已记录决策")}</strong><span>Azure OpenAI</span></div>
                <div className="flow-item"><strong>{text("Tasks assigned", "已分配任务")}</strong><span>{text("2 owners", "2 位负责人")}</span></div>
                <div className="flow-item active"><strong>{text("Human review", "人工确认")}</strong><span className="pulse" /></div>
                <div className="flow-item"><strong>{text("Risk detected", "已检测风险")}</strong><span>{text("Permissions", "权限")}</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="capabilities" id="capabilities">
        <div className="section-heading"><div className="eyebrow">{text("From conversation to action", "从对话走向行动")}</div><h2 className="display">{text("Meeting → Decision → Task → Workflow → Memory.", "会议 → 决策 → 任务 → 工作流 → 记忆。")}</h2><p>{text("OpsPilot connects the operational work that teams normally copy, summarize, assign, and chase by hand.", "OpsPilot 串联团队原本需要手动复制、摘要、分配与跟进的运营工作。")}</p></div>
        <div className="cap-grid">{capabilities.map(([Icon, name, copy]) => <div className="cap-card" key={name}><div className="cap-icon"><Icon size={18}/></div><h3>{name}</h3><p>{copy}</p></div>)}</div>
      </section>
      <footer className="footer"><Logo /><span>{text("Open source · Synthetic demo content · Built for responsible AI operations", "开源 · 合成演示内容 · 为负责任的 AI 运营而打造")}</span></footer>
    </>
  );
}
