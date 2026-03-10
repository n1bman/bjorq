// Force HMR invalidation v2
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[App] main.tsx loaded');
try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  console.error('[App] Failed to render:', err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'color:red;padding:2rem';
  pre.textContent = String(err);
  document.body.appendChild(pre);
}
