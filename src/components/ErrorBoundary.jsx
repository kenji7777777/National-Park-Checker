
// ── Error boundary: shows the real error instead of a blank white screen ──
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      const msg = (this.state.error && this.state.error.message) ? this.state.error.message : String(this.state.error);
      const stack = (this.state.error && this.state.error.stack) ? this.state.error.stack : "";
      return React.createElement(
        "div",
        { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a1410", color: "#e8b8b8", fontFamily: "Georgia, serif", padding: 24, textAlign: "center" } },
        React.createElement(
          "div",
          { style: { maxWidth: 480 } },
          React.createElement("div", { style: { fontSize: 28, marginBottom: 12 } }, "⚠️"),
          React.createElement("div", { style: { fontSize: 15, marginBottom: 10 } }, "The app hit an error while starting."),
          React.createElement("div", { style: { fontSize: 12, opacity: 0.85, marginBottom: 14, whiteSpace: "pre-wrap" } }, msg),
          React.createElement("div", { style: { fontSize: 10, opacity: 0.5, whiteSpace: "pre-wrap", textAlign: "left", maxHeight: 200, overflow: "auto" } }, stack)
        )
      );
    }
    return this.props.children;
  }
}
