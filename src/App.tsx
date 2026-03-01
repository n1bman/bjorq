// Diagnostic Step 2f: shadcn tooltip wrapper with cn
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const App = () => (
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className={cn("text-white p-8 font-sans")}>
            <h1>HomeTwin — Step 2f ✅</h1>
            <p>shadcn TooltipProvider + cn()</p>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
