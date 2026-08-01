import { useEffect, useState } from "react";

import { healthCheck } from "../ipc/commands";
import { FoundationScreen } from "../features/foundation/FoundationScreen";
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
      {ipcStatus === "loading" && (
        <p aria-live="polite">Connecting to application core…</p>
      )}
      {ipcStatus === "error" && (
        <p role="alert">Application core unavailable.</p>
      )}
      {ipcStatus === "ready" && <FoundationScreen />}
    </main>
  );
}
