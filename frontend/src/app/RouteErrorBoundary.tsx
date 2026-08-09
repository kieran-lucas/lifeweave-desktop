import { Component, createRef, type ErrorInfo, type ReactNode } from "react";

import * as styles from "./App.css";
import { PageFrame, PageHeader } from "./layout/PageFrame";

interface Props { destination: string; children: ReactNode; }
interface State { failed: boolean; }

/** Contains renderer faults to the active destination without exposing details. */
export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };
  private readonly heading = createRef<HTMLHeadingElement>();

  static getDerivedStateFromError(): State { return { failed: true }; }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("Destination render failed", { destination: this.props.destination });
    this.heading.current?.focus({ preventScroll: true });
  }

  override render() {
    if (this.state.failed) {
      return <PageFrame as="section" type="standard" className={styles.recovery} aria-labelledby="destination-recovery-heading">
        <PageHeader>
          <h1 ref={this.heading} className={styles.heading} id="destination-recovery-heading" tabIndex={-1}>This view could not be displayed</h1>
          <p className={styles.recoveryCopy} role="alert">Your saved data was not changed. Retry this view or choose another destination.</p>
        </PageHeader>
        <div><button className={styles.recoveryAction} type="button" onClick={() => this.setState({ failed: false })}>Retry view</button></div>
      </PageFrame>;
    }
    return this.props.children;
  }
}
