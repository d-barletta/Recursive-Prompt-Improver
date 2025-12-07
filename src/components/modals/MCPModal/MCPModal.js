import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/spinner";
import { saveMCPServer, loadMCPServers } from "@utils/storageUtils";
import { useToast } from "@context/ToastContext";
import { useSettings } from "@context/SettingsContext";
import { useHasFormChanges } from "@hooks";
import * as MCP from "@core/MCP";
import CodeEditor from "@components/shared/CodeEditor";
import { Link, CheckCircle, XCircle } from "lucide-react";

const MCPModal = ({ isOpen, onClose, editMode = false, initialServer = null, onSave }) => {
  const { showError, showSuccess } = useToast();
  const { settings } = useSettings();

  const [currentServer, setCurrentServer] = useState(
    initialServer || {
      name: "",
      url: "",
      headers: "{}",
    }
  );

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [hasTestedSuccessfully, setHasTestedSuccessfully] = useState(false);

  // Reset form when modal opens with new server
  useEffect(() => {
    if (initialServer) {
      setCurrentServer({
        ...initialServer,
        headers:
          typeof initialServer.headers === "string"
            ? initialServer.headers
            : JSON.stringify(initialServer.headers || {}, null, 2),
      });
      setHasTestedSuccessfully(false);
      setTestResult(null);
    } else {
      setCurrentServer({
        name: "",
        url: "",
        headers: "{}",
      });
      setHasTestedSuccessfully(false);
      setTestResult(null);
    }
  }, [initialServer, isOpen]);

  // Track form changes
  const hasChanges = useHasFormChanges(currentServer, initialServer);

  // Validate form
  const isFormValid = () => {
    if (!currentServer.name.trim()) {
      return false;
    }
    if (!currentServer.url.trim()) {
      return false;
    }
    // Validate headers JSON
    try {
      JSON.parse(currentServer.headers);
    } catch (e) {
      return false;
    }
    return true;
  };

  // Handle field changes
  const handleChange = (field, value) => {
    setCurrentServer((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Reset test result when connection params change
    if (field === "url" || field === "headers") {
      setHasTestedSuccessfully(false);
      setTestResult(null);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!currentServer.url.trim()) {
      showError("Validation Error", "URL is required");
      return;
    }

    let headers = {};
    try {
      headers = JSON.parse(currentServer.headers);
    } catch (e) {
      showError("Validation Error", "Headers must be valid JSON");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await MCP.testConnection({
        url: currentServer.url,
        headers,
      });

      setTestResult(result);
      setHasTestedSuccessfully(result.success);

      if (result.success) {
        showSuccess(
          "Connection successful",
          `Connected to MCP server. Found ${result.toolCount} tools.`
        );
      } else {
        showError("Connection failed", result.error);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setTestResult({
        success: false,
        error: error.message || "Connection test failed",
      });
      setHasTestedSuccessfully(false);
      showError("Connection test failed", error.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!isFormValid()) {
      showError("Validation Error", "Please fill in all required fields with valid values");
      return;
    }

    // if (!hasTestedSuccessfully && !editMode) {
    //   showError("Connection not tested", "Please test the connection successfully before saving");
    //   return;
    // }

    try {
      // Check for duplicate server name
      const existingServers = await loadMCPServers();
      const isDuplicate = existingServers.some(
        (server) =>
          server.name.toLowerCase() === currentServer.name.trim().toLowerCase() &&
          server.id !== currentServer.id
      );

      if (isDuplicate) {
        showError(
          "Duplicate server name",
          "An MCP server with this name already exists. Please choose a different name."
        );
        return;
      }

      let headers = {};
      try {
        headers = JSON.parse(currentServer.headers);
      } catch (e) {
        showError("Validation Error", "Headers must be valid JSON");
        return;
      }

      const serverToSave = {
        id: currentServer.id,
        name: currentServer.name.trim(),
        url: currentServer.url.trim(),
        headers,
        status: hasTestedSuccessfully ? "connected" : "disconnected",
        toolCount: testResult?.toolCount || 0,
        lastError: testResult?.error || null,
      };

      const updatedServers = await saveMCPServer(serverToSave);
      onSave(updatedServers);
      handleClose();
    } catch (error) {
      console.error("Error saving MCP server:", error);
      showError("Save failed", error.message);
    }
  };

  // Handle close
  const handleClose = () => {
    setCurrentServer({
      name: "",
      url: "",
      headers: "{}",
    });
    setTestResult(null);
    setHasTestedSuccessfully(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]" onInteractOutside={(e) => hasChanges && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit MCP Server" : "New MCP Server"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-name">Name (*)</Label>
            <Input
              id="mcp-name"
              placeholder="My MCP Server"
              value={currentServer.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
            {!currentServer.name.trim() && currentServer.name !== "" && (
              <p className="text-sm text-destructive">Name is required</p>
            )}
            <p className="text-sm text-muted-foreground">Must be unique</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mcp-url">Server URL (*)</Label>
            <div className="code-editor-wrapper">
              <CodeEditor
                value={currentServer.url}
                onChange={(value) => handleChange("url", value)}
                height="32px"
                showLineNumbers={false}
                envVariables={settings.environmentVariables}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              You can use environment variables like env.VAR_NAME
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mcp-headers">Headers (JSON)</Label>
            <div className="code-editor-wrapper">
              <CodeEditor
                value={currentServer.headers}
                onChange={(value) => handleChange("headers", value)}
                language="json"
                placeholder='{"Authorization": "env.API_KEY"}'
                height="150px"
                envVariables={settings.environmentVariables}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Optional headers as valid JSON. Use env.VAR_NAME inside quoted strings, e.g.{" "}
              {`{"Authorization": "Bearer env.API_KEY"}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !currentServer.url.trim()}
              >
                <Link className="mr-2 h-4 w-4" />
                {isTesting ? "Testing..." : "Test Connection"}
              </Button>
              {isTesting && <LoadingSpinner description="Testing connection..." />}
              {testResult && !isTesting && (
                <>
                  {testResult.success ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Connected ({testResult.toolCount} tools)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-4 w-4" />
                      <span className="text-sm">{testResult.error}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid()}>
            {editMode ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MCPModal;
