import Link from "next/link";
import { ArrowRight, Brain, Check, FileStack, Github, Presentation, Workflow } from "lucide-react";
import { Logo } from "@/components/Logo";
import { demoWorkspaceId } from "@/lib/api";

const capabilities = [
  [Presentation, "Meeting Intelligence", "Extract decisions, owners, deadlines, risks, and next actions for human review."],
  [FileStack, "Knowledge Management", "Turn fragmented documents into cited, searchable organizational knowledge."],
  [Workflow, "Workflow Automation", "Connect meeting follow-up, task tracking, reporting, and risk detection."],
  [Brain, "Organizational Memory", "Keep formal decisions and project history available to every future workflow."],
] as const;

export default function Landing() {
  return (
    <>
      <nav className="top-nav">
        <Logo />
        <div className="nav-links">
          <a href="#capabilities">Capabilities</a><a href="https://github.com" target="_blank">GitHub</a>
          <Link className="button small primary" href={`/workspace/${demoWorkspaceId}`}>Open workspace <ArrowRight size={13} /></Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="eyebrow">AI-native operations workspace for smarter teams</div>
          <h1 className="display">Conversation into <span>action.</span></h1>
          <p className="hero-copy">Turn meetings, documents, and project context into structured knowledge, decisions, tasks, risks, and automated workflows.</p>
          <div className="hero-actions">
            <Link className="button primary" href={`/workspace/${demoWorkspaceId}`}>Try the live demo <ArrowRight size={15} /></Link>
            <a className="button" href="https://github.com" target="_blank"><Github size={15} />View on GitHub</a>
          </div>
          <div className="hero-note"><Check size={13} />No API key required · synthetic demo data included</div>
        </div>
        <div className="hero-visual">
          <div className="visual-window">
            <div className="visual-bar"><span className="visual-dot"/><span className="visual-dot"/><span className="visual-dot"/></div>
            <div className="visual-body">
              <div className="visual-label">Agent run · 04</div>
              <div className="visual-query">Launch meeting → follow-up</div>
              <div className="flow">
                <div className="flow-item"><strong>Meeting captured</strong><span>12 min</span></div>
                <div className="flow-item"><strong>Decision recorded</strong><span>Azure OpenAI</span></div>
                <div className="flow-item"><strong>Tasks assigned</strong><span>2 owners</span></div>
                <div className="flow-item active"><strong>Human review</strong><span className="pulse" /></div>
                <div className="flow-item"><strong>Risk detected</strong><span>Permissions</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="capabilities" id="capabilities">
        <div className="section-heading"><div className="eyebrow">From conversation to action</div><h2 className="display">Meeting → Decision → Task → Workflow → Memory.</h2><p>OpsPilot connects the operational work that teams normally copy, summarize, assign, and chase by hand.</p></div>
        <div className="cap-grid">{capabilities.map(([Icon, name, copy]) => <div className="cap-card" key={name}><div className="cap-icon"><Icon size={18}/></div><h3>{name}</h3><p>{copy}</p></div>)}</div>
      </section>
      <footer className="footer"><Logo /><span>Open source · Synthetic demo content · Built for responsible AI operations</span></footer>
    </>
  );
}
