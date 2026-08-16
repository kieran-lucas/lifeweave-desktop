import { createElement, useEffect, useMemo, useState } from "react";
import { DEFAULT_LIMITS, sanitizeSvg } from "./svgSanitizer";
import type { SafeSvgNode } from "./svgSanitizer";
import * as styles from "./BasicLeafDocument.css";

/**
 * A Mermaid diagram, drawn from the source the document stores.
 *
 * The canonical value is unchanged by any of this: it is still a `codeBlock` whose language
 * is `mermaid`, holding the text the author wrote. Nothing rendered from it is persisted,
 * and the picture is rebuilt from that text on every read.
 *
 * The engine's markup never reaches the page. It is parsed inert and rebuilt through the
 * allowlist in `svgSanitizer`, which is the boundary this feature rests on — the engine's
 * own `securityLevel` is a second lock, not the door.
 */
type Engine = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
};

/** Beyond this the source is not worth handing to the engine at all. */
export const MAX_DIAGRAM_SOURCE = 8_000;

let engine: Promise<Engine> | null = null;

export function loadDiagramEngine(): Promise<Engine> {
  engine ??= import("mermaid").then(module => {
    const mermaid = ((module as { default?: Engine }).default ?? module) as Engine;
    // Configured once for the application rather than per diagram: re-initializing per
    // block re-parses the whole configuration and resets the engine's id counters.
    mermaid.initialize({
      startOnLoad: false,
      // Encodes HTML in labels and disables click handlers at the source, before the
      // sanitizer ever sees the output.
      securityLevel: "strict",
      // No HTML labels means no `foreignObject`, so the picture stays pure geometry.
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      // Bounded well below the library defaults of 50 000 and 500.
      maxTextSize: MAX_DIAGRAM_SOURCE,
      maxEdges: 200,
      // The engine must not put its own error picture into the document; this component
      // owns what a failure looks like.
      suppressErrorRendering: true,
      deterministicIds: true,
      fontFamily: "inherit",
    });
    return mermaid;
  });
  return engine;
}

/** Turn the sanitized tree into elements. Nothing here can introduce markup. */
function toElements(nodes: SafeSvgNode[]): React.ReactNode[] {
  return nodes.map((node, index) => {
    if (node.kind === "text") return node.text;
    const { tag, attrs, style, children } = node;
    const props: Record<string, unknown> = { key: index };
    for (const [name, value] of Object.entries(attrs)) props[name] = value;
    if (Object.keys(style).length > 0) props.style = style;
    // The root carries the diagram's own sizing; it is replaced so the picture scales to
    // the column instead of dictating the page's width.
    if (tag === "svg") {
      props.width = "100%";
      props.height = undefined;
      props.className = styles.diagramSvg;
    }
    // `createElement` with a string tag is the only place a name from the engine becomes an
    // element, and it can only ever produce that element — never markup.
    return createElement(tag, props, children.length > 0 ? toElements(children) : undefined);
  });
}

type State =
  | { phase: "rendering" }
  | { phase: "ready"; nodes: SafeSvgNode[] }
  | { phase: "failed"; reason: string };

export function MermaidView({ source }: { source: string }) {
  const [state, setState] = useState<State>({ phase: "rendering" });
  // Every render of a document would otherwise re-run the engine for every diagram in it.
  const trimmed = useMemo(() => source.trim(), [source]);

  useEffect(() => {
    let active = true;
    setState({ phase: "rendering" });

    if (trimmed.length === 0 || trimmed.length > MAX_DIAGRAM_SOURCE) {
      setState({ phase: "failed", reason: "diagram source is outside the size this Reader draws" });
      return;
    }

    void loadDiagramEngine()
      .then(async mermaid => {
        // A stale result — the source changed, or the Reader moved on — is discarded before
        // the engine is even asked, and again before anything is shown.
        if (!active) return;
        const id = `lw-diagram-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, trimmed);
        if (!active) return;
        const result = sanitizeSvg(svg, DEFAULT_LIMITS);
        if (!active) return;
        setState(result.ok
          ? { phase: "ready", nodes: [result.root] }
          : { phase: "failed", reason: result.reason });
      })
      // An invalid diagram is an ordinary outcome, not a crash: the document keeps every
      // other block and this one shows the text the author wrote.
      .catch(() => active && setState({ phase: "failed", reason: "diagram could not be drawn" }));

    return () => { active = false; };
  }, [trimmed]);

  if (state.phase === "ready") {
    return (
      <figure className={styles.diagram} aria-label="Diagram">
        {toElements(state.nodes)}
        {/* The source stays with the picture, so a diagram is never only a picture and can
            always be copied back out. */}
        <figcaption>
          <details>
            <summary>Diagram source</summary>
            <pre className={styles.codeBlock}><code>{source}</code></pre>
          </details>
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={styles.diagram} data-state={state.phase}>
      {state.phase === "failed" && <figcaption role="status">{state.reason}; its source is below.</figcaption>}
      <pre className={styles.codeBlock} data-language="mermaid"><code>{source}</code></pre>
    </figure>
  );
}
