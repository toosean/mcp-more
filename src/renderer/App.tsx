import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateOverlay } from "@/components/ui/update-overlay";
import { UpdateAvailableOverlay } from "@/components/ui/update-available-overlay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Layout from "./components/layout/Layout";
import Market from "./pages/Market";
import Browse from "./pages/Browse";
import Installed from "./pages/Installed";
import Settings from "./pages/Settings";
import MCPDetail from "./pages/MCPDetail";
import NotFound from "./pages/NotFound";
import { useUpdater } from "./hooks/use-updater";

const queryClient = new QueryClient();

const App = () => {
  const updater = useUpdater();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout><Market /></Layout>} />
              <Route path="/browse" element={<Layout><Browse /></Layout>} />
              <Route path="/installed" element={<Layout><Installed /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              <Route path="/mcp/:org/:id" element={<Layout><MCPDetail /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
          <UpdateOverlay
            isVisible={updater.isVisible}
            progress={updater.progress}
            version={updater.updateInfo?.version}
            onCancel={updater.cancelDownload}
          />
          <UpdateAvailableOverlay
            isVisible={updater.isUpdateAvailable}
            updateInfo={updater.availableUpdateInfo}
            onDownload={updater.confirmDownload}
            onLater={updater.dismissUpdate}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
