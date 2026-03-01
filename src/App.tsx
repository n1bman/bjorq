// Diagnostic Step 3b: Just QueryClient, no Tooltip
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
            <h1>HomeTwin — Step 3b ✅</h1>
            <p>QueryClient + Router only</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
