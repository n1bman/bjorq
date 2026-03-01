// Diagnostic Step 2b: Test without Sonner (next-themes suspect)
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div style={{ color: 'white', padding: '2rem', fontFamily: 'system-ui' }}>
              <h1>HomeTwin — Step 2b OK ✅</h1>
              <p>Without Sonner. If this works, next-themes/sonner is the issue.</p>
            </div>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
