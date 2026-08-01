import { useEffect, useState } from "react";

import { healthCheck } from "../ipc/commands";
import * as styles from "./App.css";

type IpcStatus = "loading" | "ready" | "error";

export function App() {
  const [ipcStatus, setIpcStatus] = useState<IpcStatus>("loading");

  useEffect(() => {
    healthCheck()
      .then(() => setIpcStatus("ready"))
      .catch(() => setIpcStatus("error"));
  }, []);

  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="setup-title">
        <p className={styles.eyebrow}>Lifeweave Desktop</p>
        <h1 id="setup-title">Foundation setup</h1>
        <p aria-live="polite">
          {ipcStatus === "loading" && "Connecting to application core…"}
          {ipcStatus === "ready" && "IPC ready. Product features not yet implemented."}
          {ipcStatus === "error" && "Application core unavailable."}
        </p>
      </section>
    </main>
  );
}
