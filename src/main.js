import { h, Fragment } from "./react.js";
import { App } from "./App.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { VersionBanner } from "./components/VersionBanner.js";

ReactDOM.createRoot(document.getElementById('root')).render(
  h(Fragment, null, h(VersionBanner), h(ErrorBoundary, null, h(App)))
);
