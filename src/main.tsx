import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable React DevTools in production
if (import.meta.env.PROD) {
  const devToolsHook = (window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: Record<string, unknown> }).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (typeof devToolsHook === 'object' && devToolsHook !== null) {
    for (const [key, value] of Object.entries(devToolsHook)) {
      devToolsHook[key] = typeof value === 'function' ? () => {} : null;
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
