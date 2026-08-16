import { Fragment, useEffect, useState } from "react";
import type { Element as HastElement, RootContent } from "hast";
import * as styles from "./BasicLeafDocument.css";

/**
 * Fenced code, highlighted from the language the document stored.
 *
 * The engine is loaded once for the whole app and only when a document actually contains
 * code, and it is asked for a token tree rather than markup: the tree is turned into React
 * elements here, so no HTML string is ever handed to the DOM and no raw-markup escape
 * hatch or inline style is needed to colour a token. Highlighting is presentation only —
 * the stored source is what is rendered, character for character.
 */
type Engine = {
  listLanguages: () => string[];
  highlight: (language: string, value: string) => { children: RootContent[] };
};

let engine: Promise<Engine> | null = null;

export function loadHighlighter(): Promise<Engine> {
  engine ??= import("lowlight").then(({ common, createLowlight }) => createLowlight(common) as Engine);
  return engine;
}

// Beyond this the cost of tokenizing outweighs the benefit, and a Reader that stalls on a
// long file is a worse outcome than one that shows it in a single colour.
const MAX_HIGHLIGHTED = 40_000;

function toElements(nodes: RootContent[]): React.ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === "text") return <Fragment key={index}>{node.value}</Fragment>;
    // The engine only ever emits `span` elements carrying class names. Anything else is
    // not rendered rather than trusted, so the token tree cannot become a markup channel.
    if (node.type !== "element" || (node as HastElement).tagName !== "span") return null;
    const element = node as HastElement;
    const names = element.properties?.className;
    const className = Array.isArray(names) ? names.filter(name => typeof name === "string").join(" ") : undefined;
    return <span key={index} className={className}>{toElements(element.children as RootContent[])}</span>;
  });
}

export function CodeView({ source, language }: { source: string; language?: string | undefined }) {
  const [tokens, setTokens] = useState<React.ReactNode[]>();

  useEffect(() => {
    let active = true;
    setTokens(undefined);
    if (!language || source.length > MAX_HIGHLIGHTED) return;
    void loadHighlighter()
      .then(highlighter => {
        if (!active) return;
        // An unrecognized language is not an error: the document keeps whatever the author
        // wrote in the info string, and code in an unknown dialect still has to be shown.
        if (!highlighter.listLanguages().includes(language)) return;
        setTokens(toElements(highlighter.highlight(language, source).children));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [source, language]);

  return (
    <pre className={styles.codeBlock} data-language={language}>
      <code className={language ? `language-${language}` : undefined}>{tokens ?? source}</code>
    </pre>
  );
}
