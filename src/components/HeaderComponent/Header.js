import React, { useState, useEffect, useMemo, memo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, AlertTriangle, Wifi, Loader2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoading } from "@context/LoadingContext";
import { useSettings } from "@context/SettingsContext";
import { useKnowledge } from "@context/KnowledgeContext";
import { useTheme } from "@context/ThemeContext";
import { getExposedServerStatus, getExposedServerConfig } from "@core/MCP";

// Separate component for Knowledge menu item to isolate re-renders
const KnowledgeMenuItem = memo(({ isCurrentPage }) => {
  const { isAnyIndexing } = useKnowledge();
  return (
    <Link
      to="/knowledge"
      className={cn(
        "text-sm font-medium transition-colors hover:text-primary px-4 py-2 flex items-center gap-2",
        isCurrentPage ? "text-primary" : "text-muted-foreground"
      )}
    >
      {isAnyIndexing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Indexing
        </>
      ) : (
        "Knowledge"
      )}
    </Link>
  );
});

// Separate component for Knowledge side nav item
const KnowledgeSideNavItem = memo(() => {
  const { isAnyIndexing } = useKnowledge();
  return (
    <Link to="/knowledge" className="text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 py-2">
      {isAnyIndexing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Indexing
        </>
      ) : (
        "Knowledge"
      )}
    </Link>
  );
});

const AppHeader = () => {
  const location = useLocation();
  const { isLoading } = useLoading();
  const { settings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const [mcpServerStatus, setMcpServerStatus] = useState({ isRunning: false, port: null });

  const hasNoProviders = !settings.providers || settings.providers.length === 0;

  // Poll MCP server status
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const status = await getExposedServerStatus();
        if (status.isRunning) {
          const config = await getExposedServerConfig();
          const newPort = config.port;
          const newToolCount = config.selectedItems?.length || 0;
          setMcpServerStatus((prev) => {
            if (prev.isRunning && prev.port === newPort && prev.toolCount === newToolCount) {
              return prev; // No change, return same reference
            }
            return { isRunning: true, port: newPort, toolCount: newToolCount };
          });
        } else {
          setMcpServerStatus((prev) => {
            if (!prev.isRunning) return prev; // Already not running
            return { isRunning: false, port: null, toolCount: 0 };
          });
        }
      } catch {
        setMcpServerStatus((prev) => {
          if (!prev.isRunning) return prev;
          return { isRunning: false, port: null, toolCount: 0 };
        });
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const mcpIndicator = useMemo(() => {
    if (!mcpServerStatus.isRunning) return null;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="mcp-server-indicator attention-pulse">
              <Wifi className="h-3 w-3 text-white" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            MCP Server on port {mcpServerStatus.port} ({mcpServerStatus.toolCount} tool{mcpServerStatus.toolCount !== 1 ? "s" : ""})
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [mcpServerStatus.isRunning, mcpServerStatus.port, mcpServerStatus.toolCount]);

  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Sheet open={isSideNavOpen} onOpenChange={setIsSideNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                className="text-lg font-semibold flex items-center gap-2"
                onClick={() => setIsSideNavOpen(false)}
              >
                RPI
              </Link>
              <div className="flex flex-col gap-2">
                <Link to="/" className="py-2" onClick={() => setIsSideNavOpen(false)}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running
                    </span>
                  ) : (
                    "Run"
                  )}
                </Link>
                <Link to="/agents" className="py-2" onClick={() => setIsSideNavOpen(false)}>
                  Agents
                </Link>
                <Link to="/conversations" className="py-2" onClick={() => setIsSideNavOpen(false)}>
                  Conversations
                </Link>
                <Link to="/tools" className="py-2" onClick={() => setIsSideNavOpen(false)}>
                  Tools
                </Link>
                <KnowledgeSideNavItem />
                <Link to="/mcp" className="py-2 flex items-center gap-2" onClick={() => setIsSideNavOpen(false)}>
                  {mcpIndicator}
                  MCP
                </Link>
                <Link to="/settings" className="py-2 flex items-center gap-2" onClick={() => setIsSideNavOpen(false)}>
                  {hasNoProviders && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  Settings
                </Link>
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="w-full justify-start"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        Dark Mode
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">RPI</span>
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-2 md:text-sm lg:gap-4 md:flex-1">
          <Link
            to="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2 flex items-center gap-2",
              (location.pathname === "/" || location.pathname === "/sessions") ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running
              </>
            ) : (
              "Run"
            )}
          </Link>
          <Link
            to="/agents"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2",
              location.pathname === "/agents" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Agents
          </Link>
          <Link
            to="/conversations"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2",
              location.pathname === "/conversations" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Conversations
          </Link>
          <KnowledgeMenuItem isCurrentPage={location.pathname === "/knowledge"} />
          <Link
            to="/tools"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2",
              location.pathname === "/tools" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Tools
          </Link>
          <Link
            to="/mcp"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2 flex items-center gap-2",
              location.pathname === "/mcp" ? "text-primary" : "text-muted-foreground"
            )}
          >
            {mcpIndicator}
            MCP
          </Link>
          <Link
            to="/settings"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary px-4 py-2 flex items-center gap-2",
              location.pathname === "/settings" ? "text-primary" : "text-muted-foreground"
            )}
          >
            {hasNoProviders && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            Settings
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
