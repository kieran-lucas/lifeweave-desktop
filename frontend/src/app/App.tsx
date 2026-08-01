import * as styles from "./App.css";

export function App() {
  return (
    <main className={styles.shell}>
      <section className={styles.panel} aria-labelledby="setup-title">
        <p className={styles.eyebrow}>Lifeweave Desktop</p>
        <h1 id="setup-title">Foundation setup</h1>
        <p>
          The repository is ready for the source-preserving Foundation Proof.
          Product features have not been implemented.
        </p>
      </section>
    </main>
  );
}
