import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import { darkTheme } from "../../design-system/visual/darkTheme.css";
import { lightTheme } from "../../design-system/visual/lightTheme.css";
import { ControlGallery } from "./ControlGallery";
import { exposeForCapture } from "./instrumentation";
import * as s from "./prototype.css";
import { TodayPrototype, type LockState } from "./TodayPrototype";
// The gallery is only evidence if it loads what production loads: the contract on :root, the
// type layer, and the global control material.
import "../../design-system/global.css";
import "../../design-system/visual/globalType.css";
import "../../app/layout/layout.css";
import "./prototypeGlobal.css";

// Motion measurements are read by `task51-motion-lock-capture.e2e.ts` from the real WebView.
exposeForCapture();

/**
 * Task 51 prototype entry.
 *
 * Isolated from production by construction: this is a second Vite HTML entry, it imports no feature
 * module and no IPC adapter, and the production `index.html` graph never reaches it. Building the
 * production bundle therefore produces byte-identical output, which is what keeps the Task 49
 * performance budget meaningful while the prototype exists.
 *
 * The state switcher at the bottom is harness chrome for capturing the lock states, not part of the
 * design. It is excluded from every capture crop.
 */
const states: { id: LockState; label: string }[] = [
  { id: "populated", label: "1 Populated" },
  { id: "selected", label: "2 Selected + inspector" },
  { id: "dense", label: "3 Dense" },
  { id: "empty", label: "4 Empty" },
  { id: "timer", label: "5 Timer running" },
  { id: "dark-selected", label: "6 Dark" },
];

function Prototype() {
  const params = new URLSearchParams(location.search);
  /*
   * `?gallery` renders the control state matrix instead of the Today composition. It is the
   * evidence surface for ADR 0045 §40 — every primitive in every state, in both themes — and lives
   * behind the same excluded entry, so proving the system costs the shipped bundle nothing.
   */
  const initial = (params.get("state") as LockState) ?? "selected";
  const [state, setState] = useState<LockState>(states.some((item) => item.id === initial) ? initial : "selected");
  const dark = state === "dark-selected";

  // Placed after the hook, never before it: an early return above `useState` is a conditional hook.
  if (params.has("gallery")) {
    return (
      <div className={`${params.get("gallery") === "dark" ? darkTheme : lightTheme} ${s.fill}`}>
        <ControlGallery />
      </div>
    );
  }

  return (
    <div className={`${dark ? darkTheme : lightTheme} ${s.fill}`}>
      <TodayPrototype state={state} />
      <div className={s.harness} data-prototype-harness="">
        {states.map((item) => (
          <button
            key={item.id}
            type="button"
            className={s.harnessButton}
            aria-pressed={state === item.id}
            onClick={() => setState(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Prototype />
  </StrictMode>,
);
