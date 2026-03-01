// Diagnostic Step 2i: Test tailwind-merge after reinstall
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { twMerge } from "tailwind-merge";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div className={twMerge("p-8 text-white font-sans")}>
          <h1>HomeTwin — Step 2i ✅</h1>
          <p>tailwind-merge reinstalled</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
