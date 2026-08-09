import { useEffect, useRef, useState } from "react";
import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReaderDocumentView } from "../../../ipc/generated/ReaderDocumentView";
import { importDocumentAsset, saveReaderDocument, saveReaderDraft } from "../../../ipc/commands";
import { operationId } from "./schema";
import * as styles from "./BasicLeafDocument.css";
import { LoadingRow } from "../../../design-system/primitives/States";
import { DecisionDialog } from "../../../app/layout/DialogSurface";

const Callout = Node.create({
  name: "callout", group: "block", content: "block+", defining: true,
  addAttributes() { return { variant: { default: "note" } }; },
  parseHTML() { return [{ tag: "aside[data-callout]" }]; },
  renderHTML({ HTMLAttributes }) { return ["aside", { "data-callout": HTMLAttributes.variant }, 0]; },
});
const AssetImage = Image.extend({
  addAttributes() { return { ...this.parent?.(), assetId: { default: null } }; },
});
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, horizontalRule: false, strike: false }),
  Link.configure({ openOnClick: false, protocols: ["http", "https", "mailto"] }),
  AssetImage.configure({ allowBase64: false }), TableKit, Callout,
];

type Props = { document: ReaderDocumentView; initialJson?: string | null; onCommitted: (value: ReaderDocumentView) => void; onCancel: () => void };
export default function BasicLeafEditor({ document, initialJson, onCommitted, onCancel }: Props) {
  const revision = useRef(document.revision);
  const [status, setStatus] = useState("Saved");
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string>();
  const [dialog, setDialog] = useState<"link" | "exit" | null>(null);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const editor = useEditor({ extensions, content: JSON.parse(initialJson ?? document.canonical_json), onUpdate: () => { setDirty(true); setStatus("Saving draft"); } });
  const json = () => JSON.stringify(editor?.getJSON());
  const commit = async () => {
    if (!editor) return false;
    setStatus("Saving document"); setMessage(undefined);
    try {
      const saved = await saveReaderDocument({ document_id: document.id, expected_revision: revision.current, schema_version: 1, canonical_json: json(), operation_id: operationId("document-save") });
      revision.current = saved.revision; setDirty(false); setStatus("Saved"); onCommitted(saved); return true;
    } catch { setStatus("Error / recovery required"); setMessage("The document could not be committed. Your recoverable draft is preserved."); return false; }
  };
  useEffect(() => {
    if (!dirty || !editor) return;
    const draftTimer = window.setTimeout(() => {
      void saveReaderDraft({ document_id: document.id, base_revision: revision.current, canonical_json: json() })
        .then(() => setStatus("Draft saved"))
        .catch(() => { setStatus("Error / recovery required"); setMessage("Draft storage failed. Keep this editor open and try Save again."); });
    }, 1000);
    const commitTimer = window.setTimeout(() => { void commit(); }, 3000);
    return () => { window.clearTimeout(draftTimer); window.clearTimeout(commitTimer); };
  }, [dirty, editor?.state]);
  if (!editor) return <LoadingRow label="Loading focused editor…" />;
  const openDialog = (kind: "link" | "exit", invoker: HTMLElement) => {
    dialogReturnFocus.current = invoker;
    setDialog(kind);
  };
  const addImage = async (file?: File) => { if (!file) return; setStatus("Saving asset"); try { const result = await importDocumentAsset({ original_name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) }); editor.chain().focus().setImage({ src: `asset:${result.asset_id}`, assetId: result.asset_id, alt: file.name } as never).run(); setStatus("Saving draft"); } catch { setStatus("Error / recovery required"); setMessage("The image was rejected or could not be stored."); } };
  return <section className={styles.shell} aria-label="Document editor">
    <div className={styles.toolbar} role="toolbar" aria-label="Document formatting">
      <button className={styles.toolbarButton} aria-label="Bold" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></button>
      <button className={styles.toolbarButton} aria-label="Italic" aria-pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></button>
      {[1,2,3].map(level => <button key={level} className={styles.toolbarButton} aria-label={`Heading ${level}`} aria-pressed={editor.isActive("heading", { level })} onClick={() => editor.chain().focus().toggleHeading({ level: level as 1|2|3 }).run()}>H{level}</button>)}
      <button className={styles.toolbarButton} aria-pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet list</button>
      <button className={styles.toolbarButton} aria-pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered list</button>
      <button className={styles.toolbarButton} aria-pressed={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
      <button className={styles.toolbarButton} aria-pressed={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code block</button>
      <button className={styles.toolbarButton} onClick={(event) => openDialog("link", event.currentTarget)}>Link</button>
      <button className={styles.toolbarButton} onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>Table</button>
      <label className={styles.toolbarFileLabel}>Image<input className={styles.hiddenFile} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => void addImage(event.currentTarget.files?.[0])}/></label>
    </div>
    <div className={styles.editor}><EditorContent editor={editor} /></div>
    <p className={styles.status} role="status" aria-live="polite">{status}</p>
    {message && <p role="alert">{message}</p>}
    <div className={styles.actions}><button className={styles.primary} disabled={status.startsWith("Saving")} onClick={() => void commit()}>Save</button><button className={styles.button} onClick={(event) => { if (dirty) openDialog("exit", event.currentTarget); else onCancel(); }}>Back to Reader</button></div>
    {dialog === "link" ? <DecisionDialog title="Add link" description="Enter a safe HTTPS, HTTP, or mailto destination." confirmLabel="Add link" inputLabel="Link destination" inputPlaceholder="https://example.com" returnFocus={dialogReturnFocus.current} onCancel={() => setDialog(null)} onConfirm={(href) => { setDialog(null); if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run(); }} /> : null}
    {dialog === "exit" ? <DecisionDialog title="Leave Edit?" description="The latest recoverable draft will be kept, but unsaved changes may not be in the committed document." confirmLabel="Leave Edit" destructive returnFocus={dialogReturnFocus.current} onCancel={() => setDialog(null)} onConfirm={() => { setDialog(null); onCancel(); }} /> : null}
  </section>;
}
