import React, { useState, useEffect } from "react";
import { useSettings } from "@context/SettingsContext";
import { useToast } from "@context/ToastContext";
import { useLoading } from "@context/LoadingContext";
import { useConfirm } from "@context/ConfirmContext";
import { API_PROVIDERS, DEFAULT_VALUES } from "@utils/constants";
import { getAvailableModels, getAvailableEmbeddings } from "@utils/uiUtils";
import ProviderModal from "../modals/ProviderModal";
import { getInitialProviderFormData } from "../modals/ProviderModal/ProviderModal.utils";
import ProvidersSection from "./ProvidersSection";
import EnvironmentVariablesSection from "./EnvironmentVariablesSection";
import GlobalSettingsSection from "./GlobalSettingsSection";
import {
  validateEnvVarKey,
  prepareProviderRows,
  PROVIDER_TABLE_HEADERS,
} from "./SettingsComponent.utils";

const SettingsComponent = ({ onAddProvider, restoreDefaultSettings }) => {
  const { settings, updateSettings, updateAndSaveSettings, saveSettings, hasUnsavedChanges } =
    useSettings();
  const { showSuccess, showError } = useToast();
  const { isLoading } = useLoading();
  const { confirm } = useConfirm();

  // Check if global settings are at default values
  const areGlobalSettingsAtDefault = () => {
    return (
      settings.max_tokens === DEFAULT_VALUES.MAX_TOKENS &&
      settings.temperature === DEFAULT_VALUES.TEMPERATURE &&
      settings.time_limit === DEFAULT_VALUES.TIME_LIMIT &&
      settings.maxToolIterations === DEFAULT_VALUES.MAX_TOOL_ITERATIONS
    );
  };

  // Local state for managing provider modal
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [providerFormData, setProviderFormData] = useState({
    id: "",
    name: "",
    apiKey: "",
    selectedModel: null,
    selectedEmbeddingModel: null,
    projectId: "",
    watsonxUrl: null,
    ollamaUrl: "",
    availableModels: null,
    availableEmbeddings: null,
  });

  // Local state for managing environment variables
  const [showEnvVarForm, setShowEnvVarForm] = useState(false);
  const [editingEnvVarIndex, setEditingEnvVarIndex] = useState(null);
  const [envVarKey, setEnvVarKey] = useState("");
  const [envVarValue, setEnvVarValue] = useState("");
  const [envVarKeyError, setEnvVarKeyError] = useState("");

  // Provider handlers
  const handleAddProvider = () => {
    const defaultProvider = API_PROVIDERS[0];
    const availableModels = getAvailableModels(defaultProvider);
    const availableEmbeddings = getAvailableEmbeddings(defaultProvider);

    const initialFormData = getInitialProviderFormData(
      defaultProvider,
      availableModels,
      availableEmbeddings,
      DEFAULT_VALUES
    );

    setProviderFormData(initialFormData);
    setEditingProvider(null);
    setIsProviderModalOpen(true);
  };

  const handleEditProvider = (provider) => {
    setProviderFormData({ ...provider });
    setEditingProvider(provider);
    setIsProviderModalOpen(true);
  };

  const handleDeleteProvider = async (provider) => {
    const confirmed = await confirm({
      title: "Delete Provider",
      body: `Are you sure you want to delete the provider "${provider.name}"? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    const filteredProviders = settings.providers.filter(
      (p) => !(p.id === provider.id && p.name === provider.name && p.apiKey === provider.apiKey)
    );

    const isDefaultDeleted =
      settings.defaultProviderId === provider.id &&
      settings.providers.find(
        (p) => p.id === provider.id && p.name === provider.name && p.apiKey === provider.apiKey
      );

    const newDefaultId =
      isDefaultDeleted && filteredProviders.length > 0
        ? filteredProviders[0].id
        : settings.defaultProviderId;

    updateSettings({
      providers: filteredProviders,
      defaultProviderId: newDefaultId,
    });

    showSuccess(
      "Provider deleted",
      `The provider "${provider.name}" has been deleted successfully.`
    );
  };

  const handleSaveProvider = async (updatedProviders, providerFormData) => {
    const newDefaultId = settings.defaultProviderId || providerFormData.id;

    await updateAndSaveSettings({
      providers: updatedProviders,
      defaultProviderId: newDefaultId,
    });

    showSuccess(
      editingProvider ? "Provider updated" : "Provider added",
      `The provider "${providerFormData.name}" has been ${editingProvider ? "updated" : "added"} successfully.`
    );
  };

  const handleDefaultProviderChange = (provider) => {
    updateSettings({ defaultProviderId: provider.id });
  };

  // Environment variable handlers
  const handleAddEnvVar = () => {
    setShowEnvVarForm(true);
    setEditingEnvVarIndex(null);
    setEnvVarKey("");
    setEnvVarValue("");
    setEnvVarKeyError("");
  };

  const handleEditEnvVar = (index) => {
    const envVar = settings.environmentVariables[index];
    setShowEnvVarForm(true);
    setEditingEnvVarIndex(index);
    setEnvVarKey(envVar.key);
    setEnvVarValue(envVar.value);
    setEnvVarKeyError("");
  };

  const handleSaveEnvVar = () => {
    const error = validateEnvVarKey(envVarKey, editingEnvVarIndex, settings.environmentVariables);
    if (error) {
      setEnvVarKeyError(error);
      return;
    }

    const newEnvVars = [...(settings.environmentVariables || [])];
    if (editingEnvVarIndex !== null) {
      newEnvVars[editingEnvVarIndex] = { key: envVarKey, value: envVarValue };
    } else {
      newEnvVars.push({ key: envVarKey, value: envVarValue });
    }

    updateSettings({ environmentVariables: newEnvVars });
    setShowEnvVarForm(false);
    setEditingEnvVarIndex(null);
    setEnvVarKey("");
    setEnvVarValue("");
    setEnvVarKeyError("");
  };

  const handleCancelEnvVar = () => {
    setShowEnvVarForm(false);
    setEditingEnvVarIndex(null);
    setEnvVarKey("");
    setEnvVarValue("");
    setEnvVarKeyError("");
  };

  const handleDeleteEnvVar = async (index) => {
    const envVar = settings.environmentVariables[index];
    const confirmed = await confirm({
      title: "Delete Environment Variable",
      body: `Are you sure you want to delete the environment variable "${envVar.key}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    const newEnvVars = settings.environmentVariables.filter((_, i) => i !== index);
    updateSettings({ environmentVariables: newEnvVars });
  };

  const handleEnvVarKeyChange = (e) => {
    setEnvVarKey(e.target.value);
    setEnvVarKeyError("");
  };

  const handleEnvVarValueChange = (e) => {
    setEnvVarValue(e.target.value);
  };

  // Global settings handlers
  const handleMaxTokensChange = (e, { value }) => {
    updateSettings({ max_tokens: value });
  };

  const handleTimeLimitChange = (e, { value }) => {
    updateSettings({ time_limit: value });
  };

  const handleTemperatureChange = (e, { value }) => {
    updateSettings({ temperature: value });
  };

  const handleMaxToolIterationsChange = (e, { value }) => {
    updateSettings({ maxToolIterations: value });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const success = await saveSettings();
    if (success) {
      showSuccess("Settings saved", "Your settings have been saved successfully.");
    } else {
      showError("Save failed", "Failed to save settings. Please try again.");
    }
  };

  // Prepare provider rows for table
  const rows = prepareProviderRows(settings.providers, settings.defaultProviderId, API_PROVIDERS);

  // Expose the handleAddProvider to parent via prop
  useEffect(() => {
    if (onAddProvider) {
      onAddProvider(() => () => handleAddProvider());
    }
  }, [onAddProvider]);

  if (settings?.default) {
    return <></>;
  }

  return (
    <>
      <form onSubmit={handleSaveSettings} className="space-y-8">
        <div className="space-y-6">
          {/* Providers Section */}
          <ProvidersSection
            rows={rows}
            headers={PROVIDER_TABLE_HEADERS}
            settings={settings}
            onEditProvider={handleEditProvider}
            onDeleteProvider={handleDeleteProvider}
            onDefaultProviderChange={handleDefaultProviderChange}
          />

          {/* Environment Variables Section */}
          <EnvironmentVariablesSection
            environmentVariables={settings.environmentVariables}
            showEnvVarForm={showEnvVarForm}
            editingEnvVarIndex={editingEnvVarIndex}
            envVarKey={envVarKey}
            envVarValue={envVarValue}
            envVarKeyError={envVarKeyError}
            onAddEnvVar={handleAddEnvVar}
            onEditEnvVar={handleEditEnvVar}
            onDeleteEnvVar={handleDeleteEnvVar}
            onSaveEnvVar={handleSaveEnvVar}
            onCancelEnvVar={handleCancelEnvVar}
            onEnvVarKeyChange={handleEnvVarKeyChange}
            onEnvVarValueChange={handleEnvVarValueChange}
          />

          {/* Global Settings Section */}
          <GlobalSettingsSection
            settings={settings}
            isLoading={isLoading}
            hasUnsavedChanges={hasUnsavedChanges()}
            areGlobalSettingsAtDefault={areGlobalSettingsAtDefault()}
            onMaxTokensChange={handleMaxTokensChange}
            onTimeLimitChange={handleTimeLimitChange}
            onTemperatureChange={handleTemperatureChange}
            onMaxToolIterationsChange={handleMaxToolIterationsChange}
            onSaveSettings={handleSaveSettings}
            onRestoreDefaultSettings={restoreDefaultSettings}
          />
        </div>
      </form>

      {/* Provider Modal */}
      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        editingProvider={editingProvider}
        initialProviderFormData={providerFormData}
        providers={settings.providers}
        onSave={handleSaveProvider}
        showSuccess={showSuccess}
        showError={showError}
      />
    </>
  );
};

export default SettingsComponent;
