"use client";

import { ChangeEvent, use, useEffect, useState } from "react";
import { File, FileText, UploadCloud } from "lucide-react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { PageTitle } from "@/components/PageTitle";
import { api } from "@/lib/api";
import type { Document } from "@/lib/types";

export default function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  function load() { api<Document[]>(`/api/workspaces/${id}/documents`).then(setDocuments); }
  useEffect(load, [id]);
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setLoading(true); setMessage(""); const form = new FormData(); form.append("file", file);
    try { const document = await api<Document>(`/api/workspaces/${id}/documents`, { method: "POST", body: form }); setDocuments([document, ...documents]); setMessage(`${document.name} indexed into ${document.chunk_count} chunks.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed"); }
    finally { setLoading(false); event.target.value = ""; }
  }
  return <WorkspaceShell id={id} title="Knowledge Hub"><div className="page">
    <PageTitle eyebrow="Hybrid RAG" title="Knowledge Hub" description="Upload local PDF, Markdown, or text files. OpsPilot parses, chunks, indexes, and retrieves them with vector + keyword rank fusion." />
    <div className="upload-zone"><UploadCloud size={25}/><strong style={{display:'block',marginTop:10}}>Add project knowledge</strong><p>PDF, TXT, or Markdown · up to 10 MB · processed by your backend</p><label className="button primary">{loading ? "Indexing…" : "Choose a file"}<input type="file" accept=".pdf,.txt,.md,.markdown" hidden onChange={upload} disabled={loading}/></label>{message && <p>{message}</p>}</div>
    <div style={{height:24}}/><div className="page-title"><div><h1 className="display" style={{fontSize:22}}>Indexed documents</h1><p>{documents.reduce((sum,item) => sum + item.chunk_count, 0)} retrievable chunks across {documents.length} sources.</p></div></div>
    <div className="doc-grid">{documents.map(document => <div className="doc-card" key={document.id}><FileText size={18}/><h3>{document.name}</h3><p>{document.kind.toUpperCase()} · {document.chunk_count} chunks</p><div className="meta-row"><span className="pill green">Indexed</span></div></div>)}{!documents.length && <div className="empty"><File/>No documents yet.</div>}</div>
  </div></WorkspaceShell>;
}

