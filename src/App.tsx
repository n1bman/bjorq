// Diagnostic Step 2g: Just cn import test
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={cn("p-8 font-sans")} style={{ color: 'white' }}>
          <h1>HomeTwin — Step 2g ✅</h1>
          <p>cn() only, no Radix</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
