// Diagnostic Step 3d: inline cn (skip @/lib/utils import)
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={cn("p-8")} style={{ color: 'white', fontFamily: 'system-ui' }}>
          <h1>HomeTwin — Step 3d ✅</h1>
          <p>Inline cn (no @/lib/utils)</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
