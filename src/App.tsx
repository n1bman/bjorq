// Diagnostic Step 2c: Bare minimum - just router, no UI libs
import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
          <h1>HomeTwin — Step 2c ✅</h1>
          <p>Just React Router. No UI libs.</p>
        </div>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;
