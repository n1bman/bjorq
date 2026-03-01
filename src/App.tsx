// Diagnostic Step 3c: cn() after tailwind-merge reinstall
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={cn("p-8")} style={{ color: 'white', fontFamily: 'system-ui' }}>
          <h1>HomeTwin — Step 3c ✅</h1>
          <p>cn() after reinstall</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
