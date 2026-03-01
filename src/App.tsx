// Diagnostic Step 3a: QueryClient + Tooltip + Router (no pages)
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
              <h1>HomeTwin — Step 3a ✅</h1>
              <p>QueryClient + Tooltip + Router</p>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
