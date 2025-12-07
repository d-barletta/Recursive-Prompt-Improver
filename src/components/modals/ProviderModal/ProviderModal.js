import React, { useState, useEffect, useMemo } from "react";
import { Plus, RotateCw, Edit, Trash2 } from "lucide-react";
import { API_PROVIDERS, WATSONX_URLS } from "@utils/constants";
import {
  getAvailableModels,
  getAvailableEmbeddings,
  fetchAndUpdateProviderModels,
} from "@utils/uiUtils";
import {
  validateProviderName,
  isDuplicateProviderName,
  updateProvidersArray,
  isProviderValid,
} from "./ProviderModal.utils";
import { useHasFormChanges } from "@hooks";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";
import { CapabilityTags } from "@components/shared";
import CustomModelModal from "../CustomModelModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

const ProviderModal = ({
  isOpen,
  onClose,
  editingProvider,
  initialProviderFormData,
  providers,
  onSave,
  showSuccess,
  showError,
}) => {
  const [providerFormData, setProviderFormData] = useState(initialProviderFormData);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  // Custom model modal state
  const [isCustomModelModalOpen, setIsCustomModelModalOpen] = useState(false);
  const [editingCustomModel, setEditingCustomModel] = useState(null);

  // Update form data when initial data changes (e.g., when opening modal)
  useEffect(() => {
    if (isOpen) {
      setProviderFormData(initialProviderFormData);
    }
  }, [isOpen, initialProviderFormData]);

  // Track if form has changes from initial state
  const hasFormChanges = useHasFormChanges(providerFormData, initialProviderFormData, {
    editMode: !!editingProvider,
  });

  // Check if provider configuration is valid for saving
  const isValidProvider = isProviderValid(providerFormData, providers, editingProvider);

  // Handle fetching available models from provider
  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    try {
      const updatedProvider = await fetchAndUpdateProviderModels(providerFormData);

      setProviderFormData(updatedProvider);

      showSuccess(
        "Models fetched",
        `Successfully fetched ${updatedProvider.availableModels.length} model(s) and ${updatedProvider.availableEmbeddings.length} embedding model(s).`
      );
    } catch (error) {
      showError("Failed to fetch models", `Error: ${error.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Handle provider type change in modal
  const handleProviderTypeChange = (itemId) => {
    const item = API_PROVIDERS.find(p => p.id === itemId);
    if (!item) return;
    
    const availableModels = getAvailableModels(item);
    const availableEmbeddings = getAvailableEmbeddings(item);

    setProviderFormData({
      ...providerFormData,
      id: item.id,
      name: item.text,
      selectedModel: availableModels[0],
      selectedEmbeddingModel: availableEmbeddings[0] || null,
      availableModels: null,
      availableEmbeddings: null,
      customModels: [], // Reset custom models when changing provider type
    });
  };

  // Custom model handlers
  const handleAddCustomModel = () => {
    setEditingCustomModel(null);
    setIsCustomModelModalOpen(true);
  };

  const handleEditCustomModel = (model) => {
    setEditingCustomModel(model);
    setIsCustomModelModalOpen(true);
  };

  const handleDeleteCustomModel = (modelToDelete) => {
    const updatedCustomModels = (providerFormData.customModels || []).filter(
      (m) => m.id !== modelToDelete.id
    );

    // Update available models list
    const updatedAvailableModels = (providerFormData.availableModels || []).filter(
      (m) => m.id !== modelToDelete.id
    );

    // If the deleted model was selected, clear the selection
    const newSelectedModel =
      providerFormData.selectedModel?.id === modelToDelete.id
        ? updatedAvailableModels[0] || null
        : providerFormData.selectedModel;

    setProviderFormData({
      ...providerFormData,
      customModels: updatedCustomModels,
      availableModels: updatedAvailableModels,
      selectedModel: newSelectedModel,
    });
  };

  const handleSaveCustomModel = (model, isEdit) => {
    let updatedCustomModels;
    let updatedAvailableModels;

    if (isEdit) {
      // Update existing model
      updatedCustomModels = (providerFormData.customModels || []).map((m) =>
        m.id === editingCustomModel.id ? model : m
      );
      updatedAvailableModels = (providerFormData.availableModels || []).map((m) =>
        m.id === editingCustomModel.id ? model : m
      );
    } else {
      // Add new model
      updatedCustomModels = [...(providerFormData.customModels || []), model];
      updatedAvailableModels = [...(providerFormData.availableModels || []), model];
    }

    setProviderFormData({
      ...providerFormData,
      customModels: updatedCustomModels,
      availableModels: updatedAvailableModels,
    });
  };

  // Get all models including custom ones for the dropdown
  const getAllModels = () => {
    return providerFormData.availableModels || [];
  };

  // Get only custom models for display in the list
  const getCustomModels = () => {
    return providerFormData.customModels || [];
  };

  // Handle saving provider from modal
  const handleSaveProvider = () => {
    // Validate that provider name is not empty
    const nameError = validateProviderName(providerFormData.name);
    if (nameError) {
      showError("Invalid provider name", nameError);
      return;
    }

    // Check if provider name is unique
    if (isDuplicateProviderName(providers, providerFormData.name, editingProvider)) {
      showError(
        "Duplicate provider name",
        `A provider with the name "${providerFormData.name}" already exists. Please choose a different name.`
      );
      return;
    }

    const updatedProviders = updateProvidersArray(providers, providerFormData, editingProvider);

    onSave(updatedProviders, providerFormData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingProvider ? "Edit Provider" : "Add New Provider"}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Provider Type */}
          <div className="grid gap-2">
            <Label htmlFor="provider-type">Provider Type</Label>
            <Select
              value={providerFormData.id}
              onValueChange={handleProviderTypeChange}
              disabled={!!editingProvider}
            >
              <SelectTrigger id="provider-type">
                <SelectValue>
                  {providerFormData.id ? (
                    <span className="flex items-center gap-2">
                      <ProviderIcon providerId={providerFormData.id} size={16} />
                      {API_PROVIDERS.find(p => p.id === providerFormData.id)?.text}
                    </span>
                  ) : (
                    "Select a provider type"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {API_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex items-center gap-2">
                      <ProviderIcon providerId={item.id} size={16} />
                      {item.text}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Name */}
          <div className="grid gap-2">
            <Label htmlFor="provider-name">Provider Name</Label>
            <Input
              id="provider-name"
              placeholder="e.g., My OpenAI Account"
              value={providerFormData.name}
              onChange={(e) =>
                setProviderFormData({
                  ...providerFormData,
                  name: e.target.value,
                })
              }
            />
          </div>

          {/* API Key (for non-local providers) */}
          {providerFormData.id !== "ollama" && providerFormData.id !== "lmstudio" && (
            <div className="grid gap-2">
              <Label htmlFor="provider-apikey">{providerFormData.name} API Key</Label>
              <Input
                id="provider-apikey"
                type="password"
                placeholder="Enter API key"
                value={providerFormData.apiKey}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    apiKey: e.target.value,
                  })
                }
              />
            </div>
          )}

          {/* WatsonX specific fields */}
          {providerFormData.id === "watsonx" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="provider-projectid">WatsonX Project ID</Label>
                <Input
                  id="provider-projectid"
                  placeholder="Enter project ID"
                  value={providerFormData.projectId}
                  onChange={(e) =>
                    setProviderFormData({
                      ...providerFormData,
                      projectId: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider-watsonxurl">WatsonX Region</Label>
                <Select
                  value={providerFormData.watsonxUrl?.id}
                  onValueChange={(val) =>
                    setProviderFormData({
                      ...providerFormData,
                      watsonxUrl: WATSONX_URLS.find(u => u.id === val),
                    })
                  }
                >
                  <SelectTrigger id="provider-watsonxurl">
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {WATSONX_URLS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Ollama URL */}
          {providerFormData.id === "ollama" && (
            <div className="grid gap-2">
              <Label htmlFor="provider-ollamaurl">Ollama Server URL</Label>
              <Input
                id="provider-ollamaurl"
                placeholder="http://localhost:11434"
                value={providerFormData.ollamaUrl}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    ollamaUrl: e.target.value,
                  })
                }
              />
            </div>
          )}

          {/* LM Studio URL */}
          {providerFormData.id === "lmstudio" && (
            <div className="grid gap-2">
              <Label htmlFor="provider-lmstudiourl">LM Studio Server URL</Label>
              <Input
                id="provider-lmstudiourl"
                placeholder="http://localhost:1234/v1"
                value={providerFormData.lmstudioUrl}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    lmstudioUrl: e.target.value,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                LM Studio runs a local OpenAI-compatible server (default port: 1234)
              </p>
            </div>
          )}

          {/* Azure specific fields */}
          {providerFormData.id === "azure" && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="provider-azureendpoint">Azure OpenAI Endpoint</Label>
                <Input
                  id="provider-azureendpoint"
                  placeholder="https://your-resource.openai.azure.com"
                  value={providerFormData.azureEndpoint}
                  onChange={(e) =>
                    setProviderFormData({
                      ...providerFormData,
                      azureEndpoint: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Your Azure OpenAI resource endpoint URL
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="provider-azureapiversion">API Version</Label>
                <Input
                  id="provider-azureapiversion"
                  placeholder="2024-02-15-preview"
                  value={providerFormData.azureApiVersion || "2024-02-15-preview"}
                  onChange={(e) =>
                    setProviderFormData({
                      ...providerFormData,
                      azureApiVersion: e.target.value,
                    })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Azure OpenAI API version
                </p>
              </div>
            </div>
          )}

          {/* OpenAI Compatible URL */}
          {providerFormData.id === "openaicompat" && (
            <div className="grid gap-2">
              <Label htmlFor="provider-openaicompaturl">OpenAI Compatible Endpoint URL</Label>
              <Input
                id="provider-openaicompaturl"
                placeholder="http://localhost:8080/v1"
                value={providerFormData.openaiCompatUrl}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    openaiCompatUrl: e.target.value,
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                The base URL of your OpenAI-compatible API (e.g., LocalAI, vLLM, text-generation-webui)
              </p>
            </div>
          )}

          {/* Fetch Models Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchModels}
              disabled={isFetchingModels}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              {isFetchingModels ? "Fetching..." : "Fetch Available Models"}
            </Button>
            {isFetchingModels && <Spinner className="h-5 w-5" description="Fetching models..." />}
          </div>

          {/* Default Model */}
          <div className="grid gap-2">
            <Label htmlFor="provider-model">Default Model</Label>
            <Select
              value={providerFormData.selectedModel?.id}
              onValueChange={(val) => {
                const model = (providerFormData.availableModels || []).find(m => m.id === val);
                setProviderFormData({
                  ...providerFormData,
                  selectedModel: model,
                });
              }}
              disabled={isFetchingModels || !providerFormData?.availableModels?.length}
            >
              <SelectTrigger id="provider-model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {(providerFormData.availableModels || []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{item.text}{item.isCustom ? " (Custom)" : ""}</span>
                      <CapabilityTags
                        supportsTools={item.supportsTools}
                        supportsVision={item.supportsVision}
                        supportsJsonOutput={item.supportsJsonOutput}
                        className="ml-2"
                      />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {providerFormData.selectedModel &&
              !isFetchingModels &&
              providerFormData?.availableModels?.length && (
                <CapabilityTags
                  supportsTools={providerFormData.selectedModel.supportsTools}
                  supportsVision={providerFormData.selectedModel.supportsVision}
                  supportsJsonOutput={providerFormData.selectedModel.supportsJsonOutput}
                  className="mt-1"
                />
              )}
          </div>

          {/* Default Embedding Model */}
          <div className="grid gap-2">
            <Label htmlFor="provider-embedding">Default Embedding Model</Label>
            <Select
              value={providerFormData.selectedEmbeddingModel?.id}
              onValueChange={(val) => {
                const model = (providerFormData.availableEmbeddings || []).find(m => m.id === val);
                setProviderFormData({
                  ...providerFormData,
                  selectedEmbeddingModel: model,
                });
              }}
              disabled={isFetchingModels || !providerFormData?.availableEmbeddings?.length}
            >
              <SelectTrigger id="provider-embedding">
                <SelectValue placeholder="Select an embedding model" />
              </SelectTrigger>
              <SelectContent>
                {(providerFormData.availableEmbeddings || []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Models Section */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Custom Models</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCustomModel}
                disabled={isFetchingModels || !providerFormData?.availableEmbeddings?.length}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Model
              </Button>
            </div>
            {getCustomModels().length > 0 ? (
              <div className="space-y-2">
                {getCustomModels().map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.text}</span>
                        <span className="text-sm text-muted-foreground">({model.id})</span>
                      </div>
                      <CapabilityTags
                        contextLength={model.contextLength}
                        supportsTools={model.supportsTools}
                        supportsVision={model.supportsVision}
                        supportsJsonOutput={model.supportsJsonOutput}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCustomModel(model)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCustomModel(model)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No custom models added. Click "Add Custom Model" to add models manually.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveProvider}
            disabled={isFetchingModels || !isValidProvider || !hasFormChanges}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Custom Model Modal */}
      <CustomModelModal
        isOpen={isCustomModelModalOpen}
        onClose={() => setIsCustomModelModalOpen(false)}
        editingModel={editingCustomModel}
        onSave={handleSaveCustomModel}
        existingModels={getAllModels()}
      />
    </Dialog>
  );
};

export default ProviderModal;
