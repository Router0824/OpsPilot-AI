"use client";

import { ChangeEvent, use, useEffect, useState } from "react";
import { File, FileText, UploadCloud } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { useApp } from "@/components/AppProvider";
import { api } from "@/lib/api";
import type { Document } from "@/lib/types";

export default function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { text, notify } = useApp();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  function load() { api<Document[]>(`/api/workspaces/${id}/documents`).then(setDocuments); }
  useEffect(load, [id]);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setLoading(true); setMessage(""); const form = new FormData(); form.append("file", file);
    try { const document = await api<Document>(`/api/workspaces/${id}/documents`, { method: "POST", body: form }); setDocuments([document, ...documents]); const success = text(`${document.name} indexed into ${document.chunk_count} chunks.`, `${document.name} 已索引為 ${document.chunk_count} 個片段。`); setMessage(success); notify(success); }
    catch (error) { const failure = error instanceof Error ? error.message : text("Upload failed", "上傳失敗"); setMessage(failure); notify(failure, "error"); }
    finally { setLoading(false); event.target.value = ""; }
  }
  return <WorkspaceShell id={id} title="Knowledge Hub"><div className="page">
    <PageTitle eyebrow="Hybrid RAG" title={text("Knowledge Hub", "知識中心")} description={text("Upload local PDF, Markdown, or text files. OpsPilot parses, chunks, indexes, and retrieves them with vector + keyword rank fusion.", "上傳 PDF、Markdown 或文字檔。OpsPilot 會解析、切分、索引，並透過向量與關鍵字融合檢索內容。")}/>
    <div className={`upload-zone ${loading ? "is-processing" : ""}`}><UploadCloud size={25}/><strong style={{display:'block',marginTop:10}}>{text("Add project knowledge", "新增專案知識")}</strong><p>{text("PDF, TXT, or Markdown · up to 10 MB · processed by your backend", "PDF、TXT 或 Markdown · 上限 10 MB · 由你的後端處理")}</p><label className="button primary">{loading ? text("Indexing…", "索引中…") : text("Choose a file", "選擇檔案")}<input type="file" accept=".pdf,.txt,.md,.markdown" hidden onChange={upload} disabled={loading}/></label>{message && <p className="upload-message">{message}</p>}</div>
    <div style={{height:24}}/><div className="page-title"><div><h1 className="display" style={{fontSize:22}}>{text("Indexed documents", "已索引文件")}</h1><p>{text(`${documents.reduce((sum,item) => sum + item.chunk_count, 0)} retrievable chunks across ${documents.length} sources.`, `${documents.length} 個來源，共有 ${documents.reduce((sum,item) => sum + item.chunk_count, 0)} 個可檢索片段。`)}</p></div></div>
    <div className="doc-grid">{documents.map(document => <div className="doc-card interactive-card" key={document.id}><FileText size={18}/><h3>{document.name}</h3><p>{document.kind.toUpperCase()} · {document.chunk_count} {text("chunks", "個片段")}</p><div className="meta-row"><span className="pill green">{text("Indexed", "已索引")}</span></div></div>)}{!documents.length && <div className="empty"><File/>{text("No documents yet.", "尚未新增文件。")}</div>}</div>
  </div></WorkspaceShell>;
}
