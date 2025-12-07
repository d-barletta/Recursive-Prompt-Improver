import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { LoadingSpinner } from "@/components/ui/spinner";
import AppHeader from "./components/HeaderComponent";
import GlobalLoadingOverlay from "./components/shared/GlobalLoadingOverlay";
import RunPage from "./pages/RunPage";
import SettingsPage from "./pages/SettingsPage";
import SessionsPage from "./pages/SessionsPage";
import ContextsPage from "./pages/ContextsPage";
import ToolsPage from "./pages/ToolsPage";
import AgentsPage from "./pages/AgentsPage";
import MCPPage from "./pages/MCPPage";
import KnowledgePage from "./pages/KnowledgePage";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { PromptProvider } from "./context/PromptContext";
import { LoadingProvider } from "./context/LoadingContext";
import { KnowledgeProvider } from "./context/KnowledgeContext";
import { ThemeProvider } from "./context/ThemeContext";
import ConfirmModal from "./components/modals/ConfirmModal";
import WelcomeModal from "./components/modals/WelcomeModal/WelcomeModal";
import { registerToolExecutionHandler } from "@core/MCP";
import { getStorageItem, setStorageItem } from "@utils/storageUtils";
import { STORAGE_KEYS } from "@utils/constants";
import "./index.scss";

// Component that shows loader until app is ready
const AppContent = () => {
  const { isAppReady } = useSettings();
  const [showWelcome, setShowWelcome] = React.useState(false);

  React.useEffect(() => {
    const checkFirstTime = async () => {
      const hasSeenWelcome = await getStorageItem(STORAGE_KEYS.HAS_SEEN_WELCOME);
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
    };
    if (isAppReady) {
      checkFirstTime();
    }
  }, [isAppReady]);

  const handleCloseWelcome = async () => {
    await setStorageItem(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    setShowWelcome(false);
  };

  if (!isAppReady) {
    return (
      <div className="app-initial-loader">
        <LoadingSpinner description="Loading..." />
      </div>
    );
  }

  return (
    <>
      <GlobalLoadingOverlay />
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      <Router>
        <ToastProvider>
          <AppHeader />
          <main className="min-h-screen p-6">
            <Routes>
              <Route path="/" element={<RunPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/sessions" element={<SessionsPage />} />
              <Route path="/conversations" element={<ContextsPage />} />
              <Route path="/tools" element={<ToolsPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/mcp" element={<MCPPage />} />
            </Routes>
          </main>
          <ConfirmModal />
        </ToastProvider>
      </Router>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <div className="rpi dark">
      <ThemeProvider>
        <SettingsProvider>
          <ConfirmProvider>
            <PromptProvider>
              <LoadingProvider>
                <KnowledgeProvider>
                  <AppContent />
                </KnowledgeProvider>
              </LoadingProvider>
            </PromptProvider>
          </ConfirmProvider>
        </SettingsProvider>
      </ThemeProvider>
    </div>
  </React.StrictMode>
);

// Register MCP tool execution handler for Electron
// This allows the exposed MCP server to execute tools defined in the app
registerToolExecutionHandler();
