import { Fragment, useRef, useState } from "react";

import { DecisionDialog } from "../../app/layout/DialogSurface";
import * as leafStyles from "../life/document/BasicLeafDocument.css";
import * as styles from "./PlanContentEditor.css";

type InlinePart = { kind: "text" | "bold" | "italic" | "code" | "link"; value: string; href?: string };

function safeHref(value: string) {
  return /^(https?:\/\/|mailto:)[^\s]+$/i.test(value) ? value : null;
}

function inlineParts(value: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const token = /(\*\*[^*\n]+\*\*|_[^_\n]+_|`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\))/g;
  let cursor = 0;
  for (const match of value.matchAll(token)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: "text", value: value.slice(cursor, index) });
    const raw = match[0];
    if (raw.startsWith("**")) parts.push({ kind: "bold", value: raw.slice(2, -2) });
    else if (raw.startsWith("_")) parts.push({ kind: "italic", value: raw.slice(1, -1) });
    else if (raw.startsWith("`")) parts.push({ kind: "code", value: raw.slice(1, -1) });
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      const href = safeHref(link?.[2] ?? "");
      parts.push(href ? { kind: "link", value: link?.[1] ?? "", href } : { kind: "text", value: raw });
    }
    cursor = index + raw.length;
  }
  if (cursor < value.length) parts.push({ kind: "text", value: value.slice(cursor) });
  return parts;
}

function InlineMarkdown({ value }: { value: string }) {
  return inlineParts(value).map((part, index) => {
    if (part.kind === "bold") return <strong key={index}>{part.value}</strong>;
    if (part.kind === "italic") return <em key={index}>{part.value}</em>;
    if (part.kind === "code") return <code key={index}>{part.value}</code>;
    if (part.kind === "link") return <a key={index} href={part.href} target="_blank" rel="noreferrer">{part.value}</a>;
    return <Fragment key={index}>{part.value}</Fragment>;
  });
}

function cells(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) { index += 1; continue; }
    if (/^```/.test(line)) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index] ?? "")) content.push(lines[index++] ?? "");
      index += 1;
      nodes.push(<pre key={nodes.length}><code>{content.join("\n")}</code></pre>);
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const body = <InlineMarkdown value={heading[2] ?? ""} />;
      nodes.push(heading[1]?.length === 1 ? <h1 key={nodes.length}>{body}</h1> : heading[1]?.length === 3 ? <h3 key={nodes.length}>{body}</h3> : <h2 key={nodes.length}>{body}</h2>);
      index += 1;
      continue;
    }
    if (line.includes("|") && /^\s*\|?\s*:?-+/.test(lines[index + 1] ?? "")) {
      const rows = [cells(line)];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|")) rows.push(cells(lines[index++] ?? ""));
      nodes.push(<table key={nodes.length}><thead><tr>{rows[0]?.map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown value={cell} /></th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineMarkdown value={cell} /></td>)}</tr>)}</tbody></table>);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) items.push((lines[index++] ?? "").replace(/^\s*[-*]\s+/, ""));
      nodes.push(<ul key={nodes.length}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) items.push((lines[index++] ?? "").replace(/^\s*\d+\.\s+/, ""));
      nodes.push(<ol key={nodes.length}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</ol>);
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) quote.push((lines[index++] ?? "").replace(/^>\s?/, ""));
      nodes.push(<blockquote key={nodes.length}><InlineMarkdown value={quote.join(" ")} /></blockquote>);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && (lines[index] ?? "").trim() && !/^(#{1,3})\s|^```|^\s*[-*]\s+|^\s*\d+\.\s+|^>\s?/.test(lines[index] ?? "")) paragraph.push(lines[index++] ?? "");
    nodes.push(<p key={nodes.length}><InlineMarkdown value={paragraph.join("\n")} /></p>);
  }
  return <article className={styles.preview} aria-label="Plan content preview">{nodes}</article>;
}

export default function PlanContentEditor({ value, editing, onChange }: { value: string; editing: boolean; onChange: (value: string) => void }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [linkDialog, setLinkDialog] = useState(false);
  const linkReturnFocus = useRef<HTMLElement | null>(null);

  const replaceSelection = (before: string, after = before, fallback = "text", linePrefix = false) => {
    const field = textarea.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const replacement = linePrefix
      ? selected.split("\n").map((line) => `${before}${line}`).join("\n")
      : `${before}${selected}${after}`;
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    requestAnimationFrame(() => {
      field.focus();
      const selectionStart = linePrefix ? start : start + before.length;
      field.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  };

  if (!editing) {
    return value.trim() ? <MarkdownPreview value={value} /> : <p className={styles.placeholder}>Define the outcome that makes this plan worth doing.</p>;
  }

  const tool = (label: string, text: string, action: () => void) => (
    <button type="button" className={leafStyles.toolbarButton} aria-label={label} onClick={action}>{text}</button>
  );

  return (
    <div className={styles.shell}>
      <div className={`${leafStyles.editorChrome} ${styles.toolbarChrome}`} data-plan-editor-toolbar>
        <div className={leafStyles.toolbar} role="toolbar" aria-label="Plan Markdown formatting">
          <div className={leafStyles.toolbarGroup}>
            <button type="button" className={leafStyles.toolbarButton} aria-pressed={mode === "write"} onClick={() => setMode("write")}>Write</button>
            <button type="button" className={leafStyles.toolbarButton} aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
          </div>
          {mode === "write" && <>
            <div className={leafStyles.toolbarGroup}>
              {tool("Bold", "B", () => replaceSelection("**", "**"))}
              {tool("Italic", "I", () => replaceSelection("_", "_"))}
            </div>
            <div className={leafStyles.toolbarGroup}>
              {tool("Heading 1", "H1", () => replaceSelection("# ", "", "Heading", true))}
              {tool("Heading 2", "H2", () => replaceSelection("## ", "", "Heading", true))}
              {tool("Heading 3", "H3", () => replaceSelection("### ", "", "Heading", true))}
            </div>
            <div className={leafStyles.toolbarGroup}>
              {tool("Bullets", "Bullets", () => replaceSelection("- ", "", "List item", true))}
              {tool("Numbers", "Numbers", () => replaceSelection("1. ", "", "List item", true))}
              {tool("Quote", "Quote", () => replaceSelection("> ", "", "Quote", true))}
              {tool("Code", "Code", () => replaceSelection("```\n", "\n```", "code"))}
            </div>
            <div className={leafStyles.toolbarGroup}>
              {tool("Link", "Link", () => {
                const field = textarea.current;
                if (!field) return;
                selection.current = { start: field.selectionStart, end: field.selectionEnd };
                linkReturnFocus.current = field;
                setLinkDialog(true);
              })}
              {tool("Table", "Table", () => replaceSelection("| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |", "", ""))}
            </div>
          </>}
        </div>
      </div>

      <div className={styles.surface} data-editing="true">
        {mode === "write" ? (
          <textarea ref={textarea} className={styles.textarea} aria-label="Plan content" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write the outcome in Markdown…" />
        ) : (
          <MarkdownPreview value={value} />
        )}
      </div>

      {linkDialog && (
        <DecisionDialog
          title="Add link"
          description="Use a complete HTTPS, HTTP, or mailto address."
          confirmLabel="Add link"
          inputLabel="Link destination"
          inputPlaceholder="https://"
          inputMode="url"
          returnFocus={linkReturnFocus.current}
          onCancel={() => setLinkDialog(false)}
          onConfirm={(href) => {
            const safe = safeHref(href.trim());
            if (!safe) return;
            const { start, end } = selection.current;
            const label = value.slice(start, end) || "link";
            onChange(`${value.slice(0, start)}[${label}](${safe})${value.slice(end)}`);
            setLinkDialog(false);
          }}
        />
      )}
    </div>
  );
}
