import { Fragment, useEffect, useState } from "react";
import { getDocumentAsset } from "../../../ipc/commands";
import type { BasicLeafMark, BasicLeafNode } from "./schema";
import { safeLink } from "./schema";
import { headingIdForSourceIndex } from "./outline";
import * as styles from "./BasicLeafDocument.css";
import { LoadingRow } from "../../../design-system/primitives/States";

function AssetImage({ assetId, alt }: { assetId: string; alt: string }) {
  const [source, setSource] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void getDocumentAsset({ asset_id: assetId }).then(result => {
      if (!active) return;
      objectUrl = URL.createObjectURL(new Blob([new Uint8Array(result.bytes)], { type: result.asset.mime }));
      setSource(objectUrl);
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [assetId]);
  if (failed) return <div className={styles.missing} role="img" aria-label={`Missing image: ${alt || "Untitled image"}`}>Image unavailable. Open Edit to repair or remove it.</div>;
  if (!source) return <LoadingRow label="Loading image…" />;
  return <img className={styles.image} src={source} alt={alt} loading="lazy" decoding="async" />;
}

function marked(text: React.ReactNode, marks: BasicLeafMark[] = []) {
  return marks.reduce<React.ReactNode>((child, mark, index) => {
    if (mark.type === "bold") return <strong key={index}>{child}</strong>;
    if (mark.type === "italic") return <em key={index}>{child}</em>;
    const href = safeLink(mark.attrs?.href);
    return href ? <a key={index} href={href} target="_blank" rel="noreferrer">{child}</a> : <span key={index}>{child}</span>;
  }, text);
}

function render(node: BasicLeafNode, key: number | string): React.ReactNode {
  const children = node.content?.map((child, index) => render(child, index));
  switch (node.type) {
    case "text": return <Fragment key={key}>{marked(node.text ?? "", node.marks)}</Fragment>;
    case "paragraph": return <p key={key}>{children}</p>;
    case "heading": { const level = Number(node.attrs?.level ?? 2); return level === 1 ? <h1 key={key}>{children}</h1> : level === 3 ? <h3 key={key}>{children}</h3> : <h2 key={key}>{children}</h2>; }
    case "bulletList": return <ul key={key}>{children}</ul>;
    case "orderedList": return <ol key={key}>{children}</ol>;
    case "listItem": return <li key={key}>{children}</li>;
    case "blockquote": return <blockquote key={key}>{children}</blockquote>;
    case "callout": return <aside key={key} aria-label={`${String(node.attrs?.variant ?? "note")} callout`}>{children}</aside>;
    case "codeBlock": return <pre key={key}><code>{node.content?.map(child => child.text ?? "").join("")}</code></pre>;
    case "hardBreak": return <br key={key} />;
    case "image": return <AssetImage key={key} assetId={String(node.attrs?.assetId ?? "")} alt={String(node.attrs?.alt ?? "")} />;
    case "table": return <table className={styles.table} key={key}><tbody>{children}</tbody></table>;
    case "tableRow": return <tr key={key}>{children}</tr>;
    case "tableHeader": return <th key={key}>{children}</th>;
    case "tableCell": return <td key={key}>{children}</td>;
    default: return <div className={styles.missing} key={key}>Unsupported content can be repaired in Edit mode.</div>;
  }
}

function renderTopLevel(node: BasicLeafNode, index: number): React.ReactNode {
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    const id = headingIdForSourceIndex(index);
    const children = node.content?.map((child, i) => render(child, i));
    return level === 1
      ? <h1 key={index} id={id} tabIndex={-1}>{children}</h1>
      : level === 3
      ? <h3 key={index} id={id} tabIndex={-1}>{children}</h3>
      : <h2 key={index} id={id} tabIndex={-1}>{children}</h2>;
  }
  return render(node, index);
}

export function StaticDocument({ document }: { document: BasicLeafNode }) {
  return <article className={styles.article} aria-label="Leaf document">
    {document.content?.map((node, index) => renderTopLevel(node, index))}
  </article>;
}
