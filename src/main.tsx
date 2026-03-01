// Force HMR invalidation v2
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[App] main.tsx loaded');
try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  console.error('[App] Failed to render:', err);
  document.body.innerHTML = `<pre style="color:red;padding:2rem">${err}</pre>`;
}
