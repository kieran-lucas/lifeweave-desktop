import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableCell, TableHeader, TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { ReaderDocumentView } from "../../../ipc/generated/ReaderDocumentView";
import { importDocumentAsset, saveReaderDocument, saveReaderDraft } from "../../../ipc/commands";
import { DecisionDialog } from "../../../app/layout/DialogSurface";
import { LoadingRow } from "../../../design-system/primitives/States";
import { operationId } from "./schema";
import { AssetImage, Callout, IngestionGateway, InlineMath, MathBlock } from "./extensions";
import type { IngestionNotice } from "./extensions";
import "./BasicLeafEditor.css";
import * as styles from "./BasicLeafDocument.css";

const BasicLeafToolbar = lazy(() => import("./BasicLeafToolbar"));

// Column alignment is part of the document, so the cell nodes have to carry it through
// the editor rather than losing it on the first save.
const alignAttribute = {
  align: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.textAlign || null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.align ? { style: `text-align: ${String(attributes.align)}` } : {},
  },
};
const AlignedCell = TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...alignAttribute }; } });
const AlignedHeader = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...alignAttribute }; } });

export const buildBasicLeafExtensions = (onNotice: IngestionNotice | null = null) => [
  // Underline is off because the canonical schema has no such mark and Markdown has no
  // syntax for one. Left on, StarterKit still bound Ctrl+U, and using it produced a
  // document the validator refused — reported to the author as a bare "Save failed" with
  // nothing naming the mark responsible.
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
  Link.configure({
    openOnClick: false,
    protocols: ["http", "https", "mailto"],
    isAllowedUri: (value) => /^(https?:\/\/|mailto:)[^\s]+$/i.test(value),
  }),
  AssetImage.configure({ allowBase64: false }),
  TableKit.configure({ tableCell: false, tableHeader: false }),
  AlignedCell,
  AlignedHeader,
  TaskList,
  TaskItem.configure({ nested: true }),
  Callout,
  InlineMath,
  MathBlock,
  IngestionGateway.configure({ onNotice }),
];

export const basicLeafExtensions = buildBasicLeafExtensions();

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
  /*
   * An ingestion diagnostic is not a save status and cannot share its state.
   * `markChanged` clears `message` on every edit, and the paste that produced the
   * diagnostic *is* an edit — so the warning was cleared by its own transaction and never
   * survived to be read. It is held separately and cleared only by the reader dismissing
   * it or by a later ingestion event replacing it, never by ordinary typing or by a save.
   */
  const [notice, setNotice] = useState("");
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

  // Held in a ref so the extension list stays stable: rebuilding it would rebuild the
  // editor and lose the document being edited.
  const noticeRef = useRef<IngestionNotice>((text: string) => setNotice(text));
  const extensions = useRef(buildBasicLeafExtensions((text: string) => noticeRef.current(text)));

  const editor = useEditor({
    extensions: extensions.current,
    content: initialContent.current,
    autofocus: false,
    editorProps,
    onUpdate: ({ editor: liveEditor }) => markChanged(liveEditor),
    shouldRerenderOnTransaction: false,
  });

  /**
   * `andLeave` separates the two callers.
   *
   * Save changes is an explicit end to the editing session, so it returns the author to the Reader
   * once the revision is committed. The three-second autosave commits the same way but must never
   * close the editor under the author's hands, so it leaves them where they are.
   *
   * Either way the editor is only left with nothing outstanding: a failed save, or an edit that
   * arrived while the save was in flight, keeps the author here with their work rather than
   * dropping them into the Reader believing everything was written.
   */
  const commit = (andLeave = false) => {
    if (!editor) return;
    clearTimers();
    const version = changeVersion.current;
    if (version <= committedVersion.current) {
      if (andLeave) onCancel();
      return;
    }
    const canonical = JSON.stringify(editor.getJSON());
    setSaveState(4);

    saveQueue.current = saveQueue.current.then(async () => {
      if (version <= committedVersion.current) {
        if (andLeave) onCancel();
        return;
      }
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
          if (andLeave) onCancel();
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
          <button className={styles.saveButton} disabled={!dirty || busy} onClick={() => commit(true)}>Save changes</button>
        </div>

        <Suspense fallback={null}><BasicLeafToolbar editor={editor} onLink={invoker=>openDialog(1,invoker)} onImage={addImage}/></Suspense>
      </div>

      {message && <p className={styles.editorAlert} role="alert">{message}</p>}
      {notice && (
        <div className={styles.editorNotice} role="status" aria-live="polite">
          <p>{notice}</p>
          <button type="button" className={styles.noticeDismiss} onClick={() => setNotice("")}>Dismiss</button>
        </div>
      )}
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
