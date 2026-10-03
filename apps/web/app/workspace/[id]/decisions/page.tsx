"use client";

import { use, useEffect, useState } from "react";
import { Gavel, Plus } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Memory } from "@/lib/types";

export default function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text, notify } = useApp();
  const [items, setItems] = useState<Memory[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ content: "", reason: "", source: "Human review" });

  useEffect(() => { api<Memory[]>(`/api/workspaces/${id}/decisions`).then(setItems); }, [id]);
  async function create() {
    if (!form.content.trim() || saving) return;
    setSaving(true);
    try {
      const item = await api<Memory>(`/api/workspaces/${id}/memories`, { method: "POST", body: JSON.stringify({ type: "decision", importance: .95, ...form }) });
      setItems(current => [item, ...current]); setOpen(false); setForm({ content: "", reason: "", source: "Human review" });
      notify(text("Decision recorded.", "決策已記錄。"));
    } catch (error) { notify(error instanceof Error ? error.message : text("Unable to record the decision.", "無法記錄決策。"), "error"); }
    finally { setSaving(false); }
  }

  return <WorkspaceShell id={id} title="Decision Memory"><div className="page">
    <PageTitle eyebrow={text("Organizational memory", "組織記憶")} title={text("Decision Memory", "決策記憶")} description={text("Formal choices remain visible to future workflows, with the reason and source needed to avoid reopening settled questions.", "將正式決策、理由與來源保留下來，讓後續工作流都能看見，也避免重複討論已定案事項。")}
      action={<button className="button primary" onClick={() => setOpen(current => !current)}><Plus size={14}/>{open ? text("Close form", "關閉表單") : text("Record decision", "記錄決策")}</button>}/>
    {open && <div className="card form-reveal" style={{ padding: 18, marginBottom: 18 }}><div className="form-grid"><div className="field"><label>{text("Decision", "決策內容")}</label><input autoFocus value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder={text("What was decided?", "這次做了什麼決定？")}/></div><div className="field"><label>{text("Reason", "決策理由")}</label><textarea style={{ minHeight: 80 }} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} placeholder={text("Why was this choice made?", "為什麼做出這個選擇？")}/></div><button className="button accent" onClick={create} disabled={!form.content.trim() || saving}>{saving ? text("Recording…", "記錄中…") : text("Approve & record", "核准並記錄")}</button></div></div>}
    {!items.length ? <div className="card empty"><Gavel size={22}/><br/>{text("No decisions have been recorded yet.", "目前還沒有已記錄的決策。")}</div> : <div className="memory-grid">{items.map(item => <div className="memory-card interactive-card" key={item.id}><Gavel size={18}/><h3>{item.content}</h3><p>{item.reason}</p><div className="meta-row"><span className="pill green">{text("Active", "有效")}</span><span className="pill">{item.source}</span></div></div>)}</div>}
  </div></WorkspaceShell>;
}
