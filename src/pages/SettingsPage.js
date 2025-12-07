import React, { useEffect, useCallback, useState } from "react";
import SettingsComponent from "@components/SettingsComponent/SettingsComponent";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Menu } from "lucide-react";
import { useSettings } from "@context/SettingsContext";
import { useToast } from "@context/ToastContext";
import { useConfirm } from "@context/ConfirmContext";
import { useLoading } from "@context/LoadingContext";
import { useNavigationPrompt, useFullBackupImport } from "@hooks";
import {
  exportToJsonFile,
  importFromJsonFile,
  fetchAndUpdateAllProviderModels,
} from "@utils/uiUtils";
import { STORAGE_KEYS } from "@utils/constants";
import {
  loadSessions,
  loadContexts,
  loadTools,
  loadAgents,
  loadMCPServers,
  loadKnowledgeBases,
  clearAllSessions,
  clearAllContexts,
  clearAllTools,
  clearAllAgents,
  clearAllMCPServers,
  clearAllKnowledgeBases,
  clearLocalStorage,
  clearOutputFromLocalStorage,
  restoreDefaultSettings,
  removeStorageItem,
} from "@utils/storageUtils";
import {
  getExposedServerConfig,
  saveExposedServerConfig,
  stopExposedServer,
  DEFAULT_MCP_SERVER_PORT,
} from "@core/MCP";

const SHOW_IMPORT_SETTINGS = false;

const SettingsPage = () => {
  // Get settings, updateSettings, and saveSettings
  const {
    settings,
    updateSettings,
    updateAndSaveSettings,
    hasUnsavedChanges,
    saveSettings,
    resetSettings,
  } = useSettings();
  // Get toast functions
  const { showSuccess, showError } = useToast();
  // Get confirm function
  const { confirm } = useConfirm();
  // Get global loading functions
  const { showGlobalLoading, hideGlobalLoading } = useLoading();
  // Get full backup import function
  const { importFullBackup } = useFullBackupImport();
  // Store reference to handleAddProvider from SettingsComponent
  const [handleAddProvider, setHandleAddProvider] = useState(null);

  // Handle navigation when there are unsaved changes
  const handleNavigation = useCallback(async () => {
    const confirmed = await confirm({
      title: "Unsaved Changes",
      body: "You have unsaved changes. Do you want to save them before leaving?",
      confirmText: "Save and Leave",
      cancelText: "Leave Without Saving",
      variant: "warning",
    });

    if (confirmed) {
      // User wants to save
      const success = await saveSettings();
      if (success) {
        showSuccess("Settings saved", "Your settings have been saved successfully.");
        return { proceed: true };
      } else {
        showError("Save failed", "Failed to save settings. Please try again.");
        return { proceed: false };
      }
    } else {
      // User wants to leave without saving
      resetSettings();
      return { proceed: true };
    }
  }, [confirm, saveSettings, resetSettings, showSuccess, showError]);

  // Use custom navigation prompt hook
  useNavigationPrompt(hasUnsavedChanges(), handleNavigation);

  // Handle browser refresh/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = ""; // Modern browsers require this
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleExportFullBackup = async () => {
    // Show confirmation dialog with warning about sensitive data
    const confirmed = await confirm({
      title: "Export Full Backup",
      body: "⚠️ Warning: This export will include ALL data including API keys and other sensitive information. Make sure to store the exported file securely. Do you want to continue?",
      confirmText: "Export",
      cancelText: "Cancel",
      variant: "warning",
    });

    if (!confirmed) {
      return; // User cancelled the export
    }

    // Create a full backup object with all data
    const fullBackup = {
      sessions: await loadSessions(),
      contexts: await loadContexts(),
      tools: await loadTools(),
      agents: await loadAgents(),
      mcpServers: await loadMCPServers(),
      mcpServerConfig: await getExposedServerConfig(),
      knowledgeBases: await loadKnowledgeBases(),
      settings: {
        providers: settings.providers,
        defaultProviderId: settings.defaultProviderId,
        max_tokens: settings.max_tokens,
        time_limit: settings.time_limit,
        temperature: settings.temperature,
        maxToolIterations: settings.maxToolIterations,
        environmentVariables: settings.environmentVariables,
      },
    };

    // Create a filename with date and time
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const filename = `RPI-full-backup-${dateStr}-${timeStr}`;

    try {
      const success = await exportToJsonFile(fullBackup, filename);

      if (success) {
        showSuccess(
          "Full backup exported",
          "All sessions, conversations, tools, agents, knowledge bases, MCP servers, MCP exposure config, and settings have been exported (API keys included)"
        );
      }
    } catch (error) {
      showError("Export failed", "Failed to export full backup");
    }
  };

  const handleImportFullBackup = async () => {
    // Show confirmation dialog first
    const confirmed = await confirm({
      title: "Import",
      body: "This will merge the imported data with your existing data. If sessions, conversations, tools, or agents have the same ID, they will be overridden by the imported data. Do you want to continue?",
      confirmText: "Import",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return; // User cancelled the import
    }

    importFullBackup({
      onStart: () => {
        showGlobalLoading("Importing backup...");
      },
      onSuccess: ({ successCount, failCount }) => {
        const modelFetchMessage =
          successCount > 0
            ? ` Models refetched for ${successCount} provider(s).${failCount > 0 ? ` Failed for ${failCount} provider(s).` : ""}`
            : "";

        showSuccess(
          "Full backup imported",
          `Sessions, conversations, tools, agents, knowledge bases, MCP servers, MCP exposure config, and settings have been merged and saved successfully.${modelFetchMessage}`
        );
      },
      onError: (error) => {
        showError("Import Error", error || "Failed to import backup");
      },
      onComplete: () => {
        hideGlobalLoading();
      },
    });
  };

  const handleExportSettings = async () => {
    // Show confirmation dialog with info about data
    const confirmed = await confirm({
      title: "Export Settings",
      body: "⚠️ Warning: This will export your provider configurations and global settings INCLUDING API keys. Make sure to store the exported file securely. Do you want to continue?",
      confirmText: "Export",
      cancelText: "Cancel",
      variant: "warning",
    });

    if (!confirmed) {
      return;
    } // User cancelled the export

    // Export all settings including API keys
    const settingsToExport = {
      providers: settings.providers,
      defaultProviderId: settings.defaultProviderId,
      max_tokens: settings.max_tokens,
      time_limit: settings.time_limit,
      temperature: settings.temperature,
      maxToolIterations: settings.maxToolIterations,
      environmentVariables: settings.environmentVariables,
    };

    // Create a filename with date and time
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
    const filename = `RPI-settings-export-${dateStr}-${timeStr}`;

    try {
      const success = await exportToJsonFile(settingsToExport, filename);

      if (success) {
        showSuccess("Settings exported", "Settings have been exported including API keys");
      }
    } catch (error) {
      showError("Export failed", "Failed to export settings");
    }
  };

  const handleImportSettings = () => {
    importFromJsonFile(async (importedData) => {
      // Merge imported providers with existing ones, preserving API keys
      let mergedProviders = settings.providers || [];

      if (importedData.providers) {
        // For each imported provider, merge with existing or add new
        importedData.providers.forEach((importedProvider) => {
          const existingIndex = mergedProviders.findIndex(
            (p) => p.id === importedProvider.id && p.name === importedProvider.name
          );

          if (existingIndex >= 0) {
            // Merge with existing provider, keeping existing API key if imported one is empty
            mergedProviders[existingIndex] = {
              ...importedProvider,
              apiKey: importedProvider.apiKey || mergedProviders[existingIndex].apiKey,
            };
          } else {
            // Add new provider
            mergedProviders.push(importedProvider);
          }
        });
      }

      // Refetch models for all providers (merged list) if we have providers to fetch
      let updatedProviders = mergedProviders;
      let successCount = 0;
      let failCount = 0;

      if (mergedProviders && mergedProviders.length > 0) {
        const fetchResult = await fetchAndUpdateAllProviderModels(mergedProviders);
        updatedProviders = fetchResult.updatedProviders;
        successCount = fetchResult.successCount;
        failCount = fetchResult.failCount;
      }

      // Update settings with imported data and refetched models
      const newSettings = {
        providers: updatedProviders,
        defaultProviderId: importedData.defaultProviderId || settings.defaultProviderId,
        max_tokens: importedData.max_tokens || settings.max_tokens,
        time_limit: importedData.time_limit || settings.time_limit,
        temperature: importedData.temperature || settings.temperature,
        maxToolIterations: importedData.maxToolIterations || settings.maxToolIterations,
        environmentVariables:
          importedData.environmentVariables || settings.environmentVariables || [],
      };

      await updateAndSaveSettings(newSettings);

      const modelFetchMessage =
        successCount > 0
          ? ` Models refetched for ${successCount} provider(s).${failCount > 0 ? ` Failed for ${failCount} provider(s).` : ""}`
          : "";

      showSuccess(
        "Settings imported",
        `Settings have been imported successfully (existing API keys preserved).${modelFetchMessage}`
      );
    }, showError);
  };

  const handleDeleteAllData = async () => {
    // Show confirmation dialog with danger styling
    const confirmed = await confirm({
      title: "Delete All Data",
      body: "This will permanently delete ALL data including sessions, conversations, tools, agents, knowledge bases, form data, logs, instruction history, settings, and configured providers. This action cannot be undone. Are you sure you want to proceed?",
      confirmText: "Delete All Data",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return; // User cancelled the deletion
    }

    const confirmed2 = await confirm({
      title: "Delete All Data",
      body: "Are you really sure you want to proceed? This will delete EVERYTHING including all providers and settings.",
      confirmText: "Yes, Delete Everything",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed2) {
      return; // User cancelled the deletion
    }

    // Clear all data including settings and providers
    clearAllSessions();
    clearAllContexts();
    clearAllTools();
    clearAllAgents();
    clearAllMCPServers();
    clearAllKnowledgeBases();
    clearLocalStorage(); // Clear form data
    clearOutputFromLocalStorage(); // Clear logs

    // Clear all settings and providers by removing all storage keys
    await removeStorageItem(STORAGE_KEYS.PROVIDERS);
    await removeStorageItem(STORAGE_KEYS.DEFAULT_PROVIDER_ID);
    await removeStorageItem(STORAGE_KEYS.MAX_TOKENS);
    await removeStorageItem(STORAGE_KEYS.TEMPERATURE);
    await removeStorageItem(STORAGE_KEYS.TIME_LIMIT);
    await removeStorageItem(STORAGE_KEYS.MAX_TOOL_ITERATIONS);
    await removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    await removeStorageItem(STORAGE_KEYS.PREVIOUS_INSTRUCTIONS);
    await removeStorageItem(STORAGE_KEYS.IMPROVED_INSTRUCTIONS);
    await removeStorageItem(STORAGE_KEYS.ENVIRONMENT_VARIABLES);
    await removeStorageItem(STORAGE_KEYS.HAS_SEEN_WELCOME);

    // Stop exposed MCP server and reset its config
    await stopExposedServer();
    await saveExposedServerConfig({
      isActive: false,
      port: DEFAULT_MCP_SERVER_PORT,
      selectedItems: [],
    });

    // Reset settings state to clear any pending changes
    resetSettings();

    showSuccess(
      "All data deleted",
      "All data including sessions, conversations, tools, agents, knowledge bases, logs, instruction history, settings, and providers have been permanently deleted."
    );

    // Reload the page to reset the application state after a brief delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleRestoreDefaultSettings = async () => {
    // Show confirmation dialog with danger styling
    const confirmed = await confirm({
      title: "Restore Default Settings",
      body: "This will reset all settings to their default values except for your configured providers. Are you sure you want to proceed?",
      confirmText: "Restore Defaults",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return; // User cancelled the restoration
    }

    // Use the utility function to restore default settings
    const newSettings = await restoreDefaultSettings(settings);

    // Update settings in React state
    updateSettings(newSettings);

    // Use setTimeout to wait for React state update before saving
    setTimeout(async () => {
      await saveSettings();
    }, 0);

    showSuccess(
      "Settings restored",
      "All settings have been reset to their default values and saved (providers and API keys preserved)"
    );
  };

  return (
    <div>
      <div className="settingsPage">
        <h1 className="sectionTitle">Settings</h1>
        <div className="flex-center">
          <Button
            variant="ghost"
            onClick={() => handleAddProvider && handleAddProvider()}
            className="margin-right-1rem"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Provider
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportSettings}>
                Export settings
              </DropdownMenuItem>
              {SHOW_IMPORT_SETTINGS && (
                <DropdownMenuItem onClick={handleImportSettings}>
                  Import settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleExportFullBackup}>
                Export full backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleImportFullBackup}>
                Import
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteAllData} className="text-destructive">
                Delete all data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <SettingsComponent
        onAddProvider={setHandleAddProvider}
        restoreDefaultSettings={handleRestoreDefaultSettings}
      />
    </div>
  );
};

export default SettingsPage;
