// Diagnostic Step 2d: Add TooltipProvider only
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>HomeTwin — Step 2d ✅</h1>
            <p>Router + TooltipProvider</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
