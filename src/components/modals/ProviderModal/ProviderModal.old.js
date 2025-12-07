import React, { useState, useEffect } from "react";
import {
  Modal,
  Grid,
  Column,
  Dropdown,
  TextInput,
  PasswordInput,
  Button,
  InlineLoading,
} from "@carbon/react";
import { Renew, Add, Edit, TrashCan } from "@carbon/react/icons";
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
  const handleProviderTypeChange = (item) => {
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
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      modalHeading={editingProvider ? "Edit Provider" : "Add New Provider"}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSaveProvider}
      primaryButtonDisabled={isFetchingModels || !isValidProvider || !hasFormChanges}
      className="providerModal"
      size="lg"
      preventCloseOnClickOutside
      selectorsFloatingMenus={[".customModelAdd"]}
    >
      <Grid style={{ gap: "1rem" }}>
        <Column lg={8} md={4} sm={4}>
          <Dropdown
            id="provider-type"
            titleText="Provider Type"
            label="Select a provider type"
            items={API_PROVIDERS}
            selectedItem={API_PROVIDERS.find((p) => p.id === providerFormData.id) || null}
            itemToString={(item) => item?.text || ""}
            itemToElement={(item) =>
              item ? (
                <span className="provider-dropdown-item">
                  <ProviderIcon providerId={item.id} size={16} />
                  {item.text}
                </span>
              ) : (
                ""
              )
            }
            renderSelectedItem={(item) =>
              item ? (
                <span className="provider-dropdown-item">
                  <ProviderIcon providerId={item.id} size={16} />
                  {item.text}
                </span>
              ) : (
                "Select a provider type"
              )
            }
            onChange={({ selectedItem }) => handleProviderTypeChange(selectedItem)}
            disabled={!!editingProvider}
          />
        </Column>

        <Column lg={8} md={4} sm={4}>
          <TextInput
            id="provider-name"
            labelText="Provider Name"
            placeholder="e.g., My OpenAI Account"
            value={providerFormData.name}
            onChange={(e) =>
              setProviderFormData({
                ...providerFormData,
                name: e.target.value,
              })
            }
          />
        </Column>

        {providerFormData.id !== "ollama" && providerFormData.id !== "lmstudio" && (
          <Column lg={16} md={8} sm={4}>
            <PasswordInput
              id="provider-apikey"
              labelText={`${providerFormData.name} API Key`}
              placeholder="Enter API key"
              value={providerFormData.apiKey}
              onChange={(e) =>
                setProviderFormData({
                  ...providerFormData,
                  apiKey: e.target.value,
                })
              }
            />
          </Column>
        )}

        {providerFormData.id === "watsonx" && (
          <>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="provider-projectid"
                labelText="WatsonX Project ID"
                placeholder="Enter project ID"
                value={providerFormData.projectId}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    projectId: e.target.value,
                  })
                }
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Dropdown
                id="provider-watsonxurl"
                titleText="WatsonX Region"
                label="Select a region"
                items={WATSONX_URLS}
                selectedItem={providerFormData.watsonxUrl || null}
                itemToString={(item) => item?.text || ""}
                onChange={({ selectedItem }) =>
                  setProviderFormData({
                    ...providerFormData,
                    watsonxUrl: selectedItem,
                  })
                }
              />
            </Column>
          </>
        )}

        {providerFormData.id === "ollama" && (
          <Column lg={16} md={8} sm={4}>
            <TextInput
              id="provider-ollamaurl"
              labelText="Ollama Server URL"
              placeholder="http://localhost:11434"
              value={providerFormData.ollamaUrl}
              onChange={(e) =>
                setProviderFormData({
                  ...providerFormData,
                  ollamaUrl: e.target.value,
                })
              }
            />
          </Column>
        )}

        {providerFormData.id === "lmstudio" && (
          <Column lg={16} md={8} sm={4}>
            <TextInput
              id="provider-lmstudiourl"
              labelText="LM Studio Server URL"
              placeholder="http://localhost:1234/v1"
              helperText="LM Studio runs a local OpenAI-compatible server (default port: 1234)"
              value={providerFormData.lmstudioUrl}
              onChange={(e) =>
                setProviderFormData({
                  ...providerFormData,
                  lmstudioUrl: e.target.value,
                })
              }
            />
          </Column>
        )}

        {providerFormData.id === "azure" && (
          <>
            <Column lg={16} md={8} sm={4}>
              <TextInput
                id="provider-azureendpoint"
                labelText="Azure OpenAI Endpoint"
                placeholder="https://your-resource.openai.azure.com"
                helperText="Your Azure OpenAI resource endpoint URL"
                value={providerFormData.azureEndpoint}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    azureEndpoint: e.target.value,
                  })
                }
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <TextInput
                id="provider-azureapiversion"
                labelText="API Version"
                placeholder="2024-02-15-preview"
                helperText="Azure OpenAI API version"
                value={providerFormData.azureApiVersion || "2024-02-15-preview"}
                onChange={(e) =>
                  setProviderFormData({
                    ...providerFormData,
                    azureApiVersion: e.target.value,
                  })
                }
              />
            </Column>
          </>
        )}

        {providerFormData.id === "openaicompat" && (
          <Column lg={16} md={8} sm={4}>
            <TextInput
              id="provider-openaicompaturl"
              labelText="OpenAI Compatible Endpoint URL"
              placeholder="http://localhost:8080/v1"
              helperText="The base URL of your OpenAI-compatible API (e.g., LocalAI, vLLM, text-generation-webui)"
              value={providerFormData.openaiCompatUrl}
              onChange={(e) =>
                setProviderFormData({
                  ...providerFormData,
                  openaiCompatUrl: e.target.value,
                })
              }
            />
          </Column>
        )}

        <Column lg={16} md={8} sm={4}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <Button
              kind="tertiary"
              size="sm"
              renderIcon={Renew}
              onClick={handleFetchModels}
              disabled={isFetchingModels}
            >
              {isFetchingModels ? "Fetching..." : "Fetch Available Models"}
            </Button>
            {isFetchingModels && <InlineLoading description="Fetching models..." />}
          </div>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <div className="model-dropdown-wrapper">
            <Dropdown
              id="provider-model"
              titleText="Default Model"
              label="Select a model"
              items={providerFormData.availableModels || []}
              selectedItem={providerFormData.selectedModel || null}
              itemToString={(item) =>
                item ? `${item.text}${item.isCustom ? " (Custom)" : ""}` : ""
              }
              itemToElement={(item) =>
                item ? (
                  <span className="model-dropdown-item">
                    <span className="model-dropdown-name">
                      {item.text}
                      {item.isCustom ? " (Custom)" : ""}
                    </span>
                    <CapabilityTags
                      supportsTools={item.supportsTools}
                      supportsVision={item.supportsVision}
                      supportsJsonOutput={item.supportsJsonOutput}
                      className="model-dropdown-tags"
                    />
                  </span>
                ) : null
              }
              disabled={isFetchingModels || !providerFormData?.availableModels?.length}
              onChange={({ selectedItem }) =>
                setProviderFormData({
                  ...providerFormData,
                  selectedModel: selectedItem,
                })
              }
            />
            {providerFormData.selectedModel &&
              !isFetchingModels &&
              providerFormData?.availableModels?.length && (
                <CapabilityTags
                  supportsTools={providerFormData.selectedModel.supportsTools}
                  supportsVision={providerFormData.selectedModel.supportsVision}
                  supportsJsonOutput={providerFormData.selectedModel.supportsJsonOutput}
                  className="model-selected-tags margin-top-0_65"
                />
              )}
          </div>
        </Column>

        <Column lg={8} md={4} sm={4}>
          <Dropdown
            id="provider-embedding"
            titleText="Default Embedding Model"
            label="Select an embedding model"
            items={providerFormData.availableEmbeddings || []}
            selectedItem={providerFormData.selectedEmbeddingModel || null}
            itemToString={(item) => item?.text || ""}
            disabled={isFetchingModels || !providerFormData?.availableEmbeddings?.length}
            onChange={({ selectedItem }) =>
              setProviderFormData({
                ...providerFormData,
                selectedEmbeddingModel: selectedItem,
              })
            }
          />
        </Column>

        {/* Custom Models Section */}
        <Column lg={16} md={8} sm={4}>
          <div className="custom-models-section">
            <div className="custom-models-header">
              <span className="custom-models-title">Custom Models</span>
              <Button
                kind="ghost"
                size="sm"
                renderIcon={Add}
                disabled={isFetchingModels || !providerFormData?.availableEmbeddings?.length}
                onClick={handleAddCustomModel}
              >
                Add Custom Model
              </Button>
            </div>
            {getCustomModels().length > 0 ? (
              <div className="custom-models-list">
                {getCustomModels().map((model) => (
                  <div key={model.id} className="custom-model-item">
                    <div className="custom-model-info">
                      <span className="custom-model-name">{model.text}</span>
                      <span className="custom-model-id">({model.id})</span>
                      <CapabilityTags
                        contextLength={model.contextLength}
                        supportsTools={model.supportsTools}
                        supportsVision={model.supportsVision}
                        supportsJsonOutput={model.supportsJsonOutput}
                        className="custom-model-tags"
                      />
                    </div>
                    <div className="custom-model-actions">
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={Edit}
                        iconDescription="Edit model"
                        onClick={() => handleEditCustomModel(model)}
                      />
                      <Button
                        kind="ghost"
                        size="sm"
                        hasIconOnly
                        renderIcon={TrashCan}
                        iconDescription="Delete model"
                        onClick={() => handleDeleteCustomModel(model)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <em className="custom-models-empty">
                No custom models added. Click "Add Custom Model" to add models manually.
              </em>
            )}
          </div>
        </Column>
      </Grid>

      {/* Custom Model Modal */}
      <CustomModelModal
        isOpen={isCustomModelModalOpen}
        onClose={() => setIsCustomModelModalOpen(false)}
        editingModel={editingCustomModel}
        onSave={handleSaveCustomModel}
        existingModels={getAllModels()}
      />
    </Modal>
  );
};

export default ProviderModal;
