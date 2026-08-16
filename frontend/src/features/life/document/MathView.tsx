import { useEffect, useRef, useState } from "react";
import * as styles from "./BasicLeafDocument.css";

/**
 * A formula typeset from the TeX the document stores.
 *
 * The engine builds real DOM nodes and sets their geometry through the CSSOM, so nothing
 * here needs an HTML string or an inline style attribute — both of which the app's content
 * security policy refuses. `trust` stays off, which is what disables the macros that can
 * emit a link or load a resource (`\href`, `\url`, `\includegraphics`); a formula can
 * therefore never become a navigation or network surface.
 */
type Engine = {
  render: (tex: string, element: HTMLElement, options: Record<string, unknown>) => void;
};

let engine: Promise<Engine> | null = null;

export function loadMathEngine(): Promise<Engine> {
  engine ??= Promise.all([import("katex"), import("katex/dist/katex.min.css")]).then(
    ([module]) => ((module as { default?: Engine }).default ?? module) as Engine,
  );
  return engine;
}

export function MathView({ source, display }: { source: string; display: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void loadMathEngine()
      .then(katex => {
        const element = host.current;
        if (!active || !element) return;
        katex.render(source, element, {
          displayMode: display,
          throwOnError: false,
          trust: false,
          strict: "ignore",
          output: "html",
          // `maxSize` is `Infinity` by default, so `\rule{500em}{500em}` renders at its
          // stated size and pushes the rest of the document off the screen. Ten ems is far
          // larger than any real formula element and still bounded by the page.
          maxSize: 10,
          // The default is already 1000, but a bound this important should be stated rather
          // than inherited: a recursive macro must stop expanding whatever the library's
          // future default becomes.
          maxExpand: 1000,
        });
      })
      // A formula that cannot be typeset must not take the document down with it: the
      // source is already on the page as the fallback, so there is nothing left to do.
      .catch(() => active && setFailed(true));
    return () => { active = false; };
  }, [source, display]);

  const className = display ? styles.mathBlockView : styles.mathInlineView;
  return (
    <span className={className} data-failed={failed ? "" : undefined}>
      <span ref={host} aria-hidden={failed ? undefined : "true"} />
      {/* The source stays in the accessibility tree and in any copy of the page, so the
          formula is never only a picture. */}
      <span className={styles.mathSourceFallback}>{display ? `$$${source}$$` : `$${source}$`}</span>
    </span>
  );
}
