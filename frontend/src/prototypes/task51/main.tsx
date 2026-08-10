import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import { lightTheme } from "../../design-system/visual/lightTheme.css";
import { ControlGallery } from "./ControlGallery";
import { exposeForCapture } from "./instrumentation";
import * as s from "./prototype.css";
import { TodayPrototype, type LockState } from "./TodayPrototype";
import "../../design-system/global.css";
import "../../design-system/visual/globalType.css";
import "../../app/layout/layout.css";
import "./prototypeGlobal.css";

exposeForCapture();

const states: { id: LockState; label: string }[] = [
  { id: "populated", label: "1 Populated" },
  { id: "selected", label: "2 Selected + inspector" },
  { id: "dense", label: "3 Dense" },
  { id: "empty", label: "4 Empty" },
  { id: "timer", label: "5 Timer running" },
];

function Prototype() {
  const params = new URLSearchParams(location.search);
  const initial = (params.get("state") as LockState) ?? "selected";
  const [state, setState] = useState<LockState>(states.some((item) => item.id === initial) ? initial : "selected");

  if (params.has("gallery")) {
    return (
      <div className={`${lightTheme} ${s.fill}`}>
        <ControlGallery />
      </div>
    );
  }

  return (
    <div className={`${lightTheme} ${s.fill}`}>
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
