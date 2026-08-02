import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { destination: string; children: ReactNode; }
interface State { failed: boolean; }

/** Contains renderer faults to the active destination without exposing details. */
export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("Destination render failed", { destination: this.props.destination });
  }

  override render() {
    if (this.state.failed) {
      return <section aria-labelledby="destination-recovery-heading">
        <h1 id="destination-recovery-heading" tabIndex={-1}>This view could not be displayed</h1>
        <p role="alert">Your saved data was not changed. Retry this view or choose another destination.</p>
        <button type="button" onClick={() => this.setState({ failed: false })}>Retry view</button>
      </section>;
    }
    return this.props.children;
  }
}
