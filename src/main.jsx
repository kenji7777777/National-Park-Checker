import { ErrorBoundary } from "./components/ErrorBoundary";
import { App } from "./App";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
window.__bootOk = true;
if (window.__bootTimer) clearTimeout(window.__bootTimer);
