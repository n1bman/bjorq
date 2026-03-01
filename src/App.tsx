// Diagnostic Step 3e: Test @/lib/utils after cache bust
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={cn("p-8")} style={{ color: 'white', fontFamily: 'system-ui' }}>
          <h1>HomeTwin — Step 3e ✅</h1>
          <p>@/lib/utils after cache bust</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
