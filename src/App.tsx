// Diagnostic Step 2h: Test clsx alone
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { clsx } from "clsx";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={clsx("p-8")} style={{ color: 'white', fontFamily: 'system-ui' }}>
          <h1>HomeTwin — Step 2h ✅</h1>
          <p>clsx only</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
