import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import * as styles from "./WindowChrome.css";

export function WindowChrome() {
  const appWindow = useMemo(getCurrentWindow, []);
  const [maximized, setMaximized] = useState(true);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    const syncMaximized = () => {
      void appWindow.isMaximized().then((value) => {
        if (active) setMaximized(value);
      });
    };
    syncMaximized();
    void appWindow.onResized(syncMaximized).then((removeListener) => {
      if (active) unlisten = removeListener;
      else removeListener();
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [appWindow]);

  const toggleMaximize = () => {
    void appWindow.toggleMaximize().then(() => appWindow.isMaximized()).then(setMaximized);
  };

  return (
    <header className={styles.chrome} aria-label="Window controls">
      <div
        className={styles.dragRegion}
        data-tauri-drag-region
        onDoubleClick={toggleMaximize}
      />
      <div className={styles.controls}>
        <button type="button" className={styles.control} aria-label="Minimize window" title="Minimize" onClick={() => void appWindow.minimize()}>
          <svg className={styles.glyph} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12" /></svg>
        </button>
        <button type="button" className={styles.control} aria-label={maximized ? "Restore window" : "Maximize window"} title={maximized ? "Restore" : "Maximize"} onClick={toggleMaximize}>
          <svg className={styles.glyph} viewBox="0 0 20 20" aria-hidden="true">
            {maximized ? <><path d="M7 5h8v8" /><path d="M5 7h8v8H5z" /></> : <rect x="4" y="4" width="12" height="12" rx="1.5" />}
          </svg>
        </button>
        <button type="button" className={`${styles.control} ${styles.closeControl}`} aria-label="Close window" title="Close" onClick={() => void appWindow.close()}>
          <svg className={styles.glyph} viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
      </div>
    </header>
  );
}
