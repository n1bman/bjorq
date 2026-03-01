// Diagnostic Step 2e: Test raw Radix import (no shadcn wrapper)
import { BrowserRouter, Routes, Route } from "react-router-dom";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const App = () => (
  <TooltipPrimitive.Provider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>HomeTwin — Step 2e ✅</h1>
            <p>Raw Radix TooltipProvider (no shadcn wrapper)</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </TooltipPrimitive.Provider>
);

export default App;
