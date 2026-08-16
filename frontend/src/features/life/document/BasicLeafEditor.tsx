import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReaderDocumentView } from "../../../ipc/generated/ReaderDocumentView";
import { importDocumentAsset, saveReaderDocument, saveReaderDraft } from "../../../ipc/commands";
import { DecisionDialog } from "../../../app/layout/DialogSurface";
import { LoadingRow } from "../../../design-system/primitives/States";
import { operationId } from "./schema";
import "./BasicLeafEditor.css";
import * as styles from "./BasicLeafDocument.css";

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() { return { variant: { default: "note" } }; },
  parseHTML() { return [{ tag: "aside[data-callout]" }]; },
  renderHTML({ HTMLAttributes }) { return ["aside", { "data-callout": HTMLAttributes.variant }, 0]; },
});

const AssetImage = Image.extend({
  addAttributes() { return { ...this.parent?.(), assetId: { default: null } }; },
});
const BasicLeafToolbar = lazy(() => import("./BasicLeafToolbar"));

export const basicLeafExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, horizontalRule: false, link: false }),
  Link.configure({
    openOnClick: false,
    protocols: ["http", "https", "mailto"],
    isAllowedUri: (value) => /^(https?:\/\/|mailto:)[^\s]+$/i.test(value),
  }),
  AssetImage.configure({ allowBase64: false }),
  TableKit,
  Callout,
];

type Props = {
  document: ReaderDocumentView;
  initialJson?: string | null;
  onCommitted: (value: ReaderDocumentView) => void;
  onCancel: () => void;
};

type SaveState = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const statusText = ["Saved", "Unsaved", "Protecting…", "Draft saved", "Saving…", "Adding…", "Save failed"];
const linkHint = "Use a complete HTTPS, HTTP, or mailto address.";
const editorProps = { attributes: { "aria-label": "Document body", "aria-multiline": "true" } };
export default function BasicLeafEditor({ document, initialJson, onCommitted, onCancel }: Props) {
  const revision = useRef(document.revision);
  const changeVersion = useRef(0);
  const committedVersion = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const draftTimer = useRef<number | undefined>(undefined);
  const commitTimer = useRef<number | undefined>(undefined);
  const commitRef = useRef<() => void>(() => {});
  const [saveState, setSaveState] = useState<SaveState>(0);
  const [message, setMessage] = useState("");
  const [dialog, setDialog] = useState<0 | 1 | 2>(0);
  const dialogReturnFocus = useRef<HTMLElement | null>(null);
  const initialContent = useRef(JSON.parse(initialJson ?? document.canonical_json));

  const clearTimers = () => {
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    if (commitTimer.current) window.clearTimeout(commitTimer.current);
  };

  const markChanged = (liveEditor: { getJSON: () => unknown }) => {
    changeVersion.current += 1;
    const version = changeVersion.current;
    clearTimers();
    setMessage("");
    setSaveState((current) => current === 4 ? current : 1);
    draftTimer.current = window.setTimeout(() => {
      if (changeVersion.current !== version || version <= committedVersion.current) return;
      const canonical = JSON.stringify(liveEditor.getJSON());
      saveQueue.current = saveQueue.current.then(async () => {
        if (changeVersion.current !== version || version <= committedVersion.current) return;
        setSaveState((current) => current === 4 ? current : 2);
        try {
          await saveReaderDraft({ document_id: document.id, base_revision: revision.current, canonical_json: canonical });
          if (changeVersion.current === version) setSaveState((current) => current === 4 ? current : 3);
        } catch {
          if (changeVersion.current === version) {
            setSaveState((current) => current === 4 ? current : 6);
            setMessage("Draft backup failed. Keep editor open and retry Save.");
          }
        }
      });
    }, 1000);
    commitTimer.current = window.setTimeout(() => {
      if (changeVersion.current === version && version > committedVersion.current) commitRef.current();
    }, 3000);
  };

  const editor = useEditor({
    extensions: basicLeafExtensions,
    content: initialContent.current,
    autofocus: false,
    editorProps,
    onUpdate: ({ editor: liveEditor }) => markChanged(liveEditor),
    shouldRerenderOnTransaction: false,
  });

  const commit = () => {
    if (!editor) return;
    clearTimers();
    const version = changeVersion.current;
    if (version <= committedVersion.current) return;
    const canonical = JSON.stringify(editor.getJSON());
    setSaveState(4);

    saveQueue.current = saveQueue.current.then(async () => {
      if (version <= committedVersion.current) return;
      try {
        const saved = await saveReaderDocument({
          document_id: document.id,
          expected_revision: revision.current,
          schema_version: 1,
          canonical_json: canonical,
          operation_id: operationId("document-save"),
        });
        revision.current = saved.revision;
        committedVersion.current = version;
        onCommitted(saved);
        setMessage("");
        if (changeVersion.current === version) {
          setSaveState(0);
        } else {
          setSaveState(1);
        }
      } catch {
        setSaveState(6);
        setMessage("Save failed. Changes remain here; keep editing and retry.");
      }
    });
  };
  commitRef.current = commit;

  useEffect(() => () => clearTimers(), []);

  if (!editor) return <LoadingRow label="Loading" />;

  const openDialog = (kind: 1 | 2, invoker: HTMLElement) => {
    dialogReturnFocus.current = invoker;
    setDialog(kind);
  };

  const addImage = async (file?: File) => {
    if (!file) return;
    setSaveState(5);
    setMessage("");
    try {
      const result = await importDocumentAsset({
        original_name: file.name,
        bytes: Array.from(new Uint8Array(await file.arrayBuffer())),
      });
      const inserted = editor.chain().focus().setImage({
        src: `asset:${result.asset_id}`,
        assetId: result.asset_id,
        alt: file.name,
      } as never).run();
      if (!inserted) throw Error();
    } catch {
      setSaveState(6);
      setMessage("Image was not stored; content unchanged.");
    }
  };

  const busy = saveState === 4 || saveState === 5;
  const dirty = changeVersion.current > committedVersion.current;

  return (
    <section className={styles.editorShell} aria-label="Document editor">
      <div className={styles.editorChrome}>
        <div className={styles.commandRow}>
          <p className={styles.editorStatus} data-state={saveState} role="status">{statusText[saveState]}</p>
          <button className={styles.backButton} disabled={busy} onClick={(event) => { if (dirty) openDialog(2, event.currentTarget); else onCancel(); }}>Back to Reader</button>
          <button className={styles.saveButton} disabled={!dirty || busy} onClick={commit}>Save changes</button>
        </div>

        <Suspense fallback={null}><BasicLeafToolbar editor={editor} onLink={invoker=>openDialog(1,invoker)} onImage={addImage}/></Suspense>
      </div>

      {message && <p className={styles.editorAlert} role="alert">{message}</p>}
      <div className={styles.editorSurface}>
        <EditorContent editor={editor} />
      </div>

      {dialog === 1 ? (
        <DecisionDialog
          title="Add link"
          description={linkHint}
          confirmLabel="Add link"
          inputLabel="Link destination"
          inputPlaceholder="https://"
          inputMode="url"
          returnFocus={dialogReturnFocus.current}
          onCancel={() => setDialog(0)}
          onConfirm={(value) => {
            setDialog(0);
            setMessage("");
            const linked = editor.chain().focus().extendMarkRange("link").setLink({ href: value.trim() }).run();
            if (!linked) {
              setSaveState(6);
              setMessage(linkHint);
            }
          }}
        />
      ) : null}
      {dialog === 2 ? (
        <DecisionDialog
          title="Leave Edit?"
          description="Save first; local recovery may contain these changes."
          confirmLabel="Leave Edit"
          destructive
          returnFocus={dialogReturnFocus.current}
          onCancel={() => setDialog(0)}
          onConfirm={() => { setDialog(0); onCancel(); }}
        />
      ) : null}
    </section>
  );
}
