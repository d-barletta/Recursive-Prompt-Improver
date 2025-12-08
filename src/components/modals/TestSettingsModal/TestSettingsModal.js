import React, { useState, useEffect, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Image as ImageIcon, X } from "lucide-react";
import { CHECK_TYPE_ITEMS, CHECK_TYPES, DEFAULT_CHECK_TYPES } from "@utils/constants";
import { useSettings } from "@context/SettingsContext";
import { useHasFormChanges } from "@hooks";
import {
  getAllAvailableModels,
  getAllAvailableEmbeddings,
  isJsonSchemaValid,
} from "@utils/uiUtils";
import JsonSchemaEditor from "@components/shared/JsonSchemaEditor";
import { inferJsonSchemaFromString } from "@utils/schemaUtils";
import { AdvancedSelect } from "@components/shared";
import UploadModal from "@components/modals/UploadModal";
import { resizeImage } from "@utils/fileUtils";
import { openHtmlPreview } from "@utils/internalBrowser";
import { useToast } from "@context/ToastContext";

const TestSettingsModal = ({
  open,
  onClose,
  testIndex,
  contexts,
  availableKnowledgeBases,
  selectedContext,
  selectedCheckTypes,
  selectedModel,
  selectedEmbeddingModel,
  selectedJsonSchema,
  selectedUseJsonSchema,
  selectedJsonSchemaStrict,
  selectedToolsCalled,
  selectedKnowledgeBases,
  selectedImages,
  availableTools,
  testOutput,
  coreModel,
  defaultEmbeddingModel,
  onContextChange,
  onCheckTypesChange,
  onModelChange,
  onEmbeddingModelChange,
  onJsonSchemaChange,
  onUseJsonSchemaChange,
  onJsonSchemaStrictChange,
  onToolsCalledChange,
  onKnowledgeBasesChange,
  onImagesChange,
}) => {
  const { settings } = useSettings();
  const { showSuccess, showError } = useToast();
  const [tempContext, setTempContext] = useState(selectedContext);
  const [tempCheckTypes, setTempCheckTypes] = useState(selectedCheckTypes || DEFAULT_CHECK_TYPES);
  const [tempModel, setTempModel] = useState(selectedModel);
  const [tempEmbeddingModel, setTempEmbeddingModel] = useState(selectedEmbeddingModel);
  const [tempUseJsonSchema, setTempUseJsonSchema] = useState(selectedUseJsonSchema || false);
  const [tempJsonSchema, setTempJsonSchema] = useState(selectedJsonSchema || "");
  const [tempJsonSchemaStrict, setTempJsonSchemaStrict] = useState(
    selectedJsonSchemaStrict || false
  );
  const [tempToolsCalled, setTempToolsCalled] = useState(selectedToolsCalled || []);
  const [tempKnowledgeBases, setTempKnowledgeBases] = useState(selectedKnowledgeBases || []);
  const [tempImages, setTempImages] = useState(selectedImages || []);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);

  // Get the display name for the core model dropdown
  const coreModelDisplayName = useMemo(() => {
    if (!coreModel || !coreModel.text) {
      return "Use core model";
    }
    return coreModel.text;
  }, [coreModel]);

  // Get the display name for the default embedding model dropdown
  const defaultEmbeddingDisplayName = useMemo(() => {
    if (!defaultEmbeddingModel || !defaultEmbeddingModel.text) {
      return "Default embeddings model";
    }
    return defaultEmbeddingModel.text;
  }, [defaultEmbeddingModel]);

  // Get available models from all configured providers - memoized to prevent unnecessary recalculation
  const availableModels = useMemo(
    () => getAllAvailableModels(settings.providers),
    [settings.providers]
  );
  const availableEmbeddings = useMemo(
    () => getAllAvailableEmbeddings(settings.providers),
    [settings.providers]
  );

  // Create default model item (for "use core model" option) with capabilities from actual model
  const defaultModelItem = useMemo(() => {
    // Find the actual model in availableModels to get its capabilities
    const actualModel = availableModels.find(
      (model) => model.id === coreModel?.id && model.providerId === coreModel?.providerId
    );
    return {
      id: "default",
      text: coreModelDisplayName,
      providerId: coreModel?.providerId,
      providerName: coreModel?.providerName,
      // Copy capabilities from the actual model if found
      contextLength: actualModel?.contextLength ?? null,
      supportsTools: actualModel?.supportsTools ?? false,
      supportsVision: actualModel?.supportsVision ?? false,
      supportsJsonOutput: actualModel?.supportsJsonOutput ?? false,
    };
  }, [
    coreModelDisplayName,
    coreModel?.id,
    coreModel?.providerId,
    coreModel?.providerName,
    availableModels,
  ]);

  // Create default embedding item (for "use default embedding" option)
  const defaultEmbeddingItem = useMemo(
    () => ({
      id: "default",
      text: defaultEmbeddingDisplayName,
      providerId: defaultEmbeddingModel?.providerId,
      providerName: defaultEmbeddingModel?.providerName,
    }),
    [
      defaultEmbeddingDisplayName,
      defaultEmbeddingModel?.providerId,
      defaultEmbeddingModel?.providerName,
    ]
  );

  // Build model items list with default at the start, excluding the core model from available list
  const modelItems = useMemo(() => {
    // Filter out the core model from available models to avoid duplication
    const filteredModels = availableModels.filter(
      (model) => !(model.id === coreModel?.id && model.providerId === coreModel?.providerId)
    );
    return [defaultModelItem, ...filteredModels];
  }, [defaultModelItem, availableModels, coreModel?.id, coreModel?.providerId]);

  // Build embedding items list with default at the start, excluding the default embedding from available list
  const embeddingItems = useMemo(() => {
    // Filter out the default embedding model from available embeddings to avoid duplication
    const filteredEmbeddings = availableEmbeddings.filter(
      (model) =>
        !(
          model.id === defaultEmbeddingModel?.id &&
          model.providerId === defaultEmbeddingModel?.providerId
        )
    );
    return [defaultEmbeddingItem, ...filteredEmbeddings];
  }, [
    defaultEmbeddingItem,
    availableEmbeddings,
    defaultEmbeddingModel?.id,
    defaultEmbeddingModel?.providerId,
  ]);

  // Get selected model item from items list (ensures same reference)
  const selectedModelItem = useMemo(() => {
    if (!tempModel) return defaultModelItem;
    // Find the matching item in the list
    const found = modelItems.find(
      (item) => item.id === tempModel.id && item.providerId === tempModel.providerId
    );
    return found || tempModel;
  }, [tempModel, modelItems, defaultModelItem]);

  // Get selected embedding item from items list (ensures same reference)
  const selectedEmbeddingItem = useMemo(() => {
    if (!tempEmbeddingModel) return defaultEmbeddingItem;
    // Find the matching item in the list
    const found = embeddingItems.find(
      (item) =>
        item.id === tempEmbeddingModel.id && item.providerId === tempEmbeddingModel.providerId
    );
    return found || tempEmbeddingModel;
  }, [tempEmbeddingModel, embeddingItems, defaultEmbeddingItem]);

  // Check if any tools are available
  const hasAvailableTools = availableTools && availableTools.length > 0;

  // Memoize check type items with disabled state
  const checkTypeItemsWithDisabled = useMemo(
    () =>
      CHECK_TYPE_ITEMS.map((item) => ({
        ...item,
        disabled:
          item.id === CHECK_TYPES.EQUALITY.id ||
          (item.id === CHECK_TYPES.TOOLS_CALL.id && !hasAvailableTools),
      })),
    [hasAvailableTools]
  );

  useEffect(() => {
    if (open) {
      setTempContext(selectedContext);
      // Ensure checkTypes are unique and include equality
      const uniqueCheckTypes = [...new Set(selectedCheckTypes || DEFAULT_CHECK_TYPES)];
      if (!uniqueCheckTypes.includes(CHECK_TYPES.EQUALITY.id)) {
        uniqueCheckTypes.push(CHECK_TYPES.EQUALITY.id);
      }
      setTempCheckTypes(uniqueCheckTypes);
      setTempModel(selectedModel);
      setTempEmbeddingModel(selectedEmbeddingModel);
      setTempUseJsonSchema(selectedUseJsonSchema || false);
      setTempJsonSchema(selectedJsonSchema || "");
      setTempJsonSchemaStrict(selectedJsonSchemaStrict || false);
      setTempToolsCalled(selectedToolsCalled || []);
      setTempKnowledgeBases(selectedKnowledgeBases || []);
      setTempImages(selectedImages || []);
    }
  }, [
    open,
    selectedContext,
    selectedCheckTypes,
    selectedModel,
    selectedEmbeddingModel,
    selectedUseJsonSchema,
    selectedJsonSchema,
    selectedJsonSchemaStrict,
    selectedToolsCalled,
    selectedKnowledgeBases,
    selectedImages,
  ]);

  // Auto-infer JSON schema from test output when toggle is enabled and schema is empty
  useEffect(() => {
    // Only infer if:
    // 1. Modal is open
    // 2. JSON check type is enabled
    // 3. Use JSON schema is toggled on
    // 4. Current schema is empty
    // 5. Test output is available
    // 6. Initial schema was also empty (to avoid overwriting user's schema)
    const isJsonCheckEnabled = tempCheckTypes.includes(CHECK_TYPES.JSON_VALID.id);
    const initialSchemaEmpty = !selectedJsonSchema || !selectedJsonSchema.trim();

    if (
      open &&
      isJsonCheckEnabled &&
      tempUseJsonSchema &&
      !tempJsonSchema.trim() &&
      testOutput &&
      initialSchemaEmpty
    ) {
      const inferredSchema = inferJsonSchemaFromString(testOutput);
      if (inferredSchema) {
        setTempJsonSchema(inferredSchema);
      }
    }
  }, [open, tempUseJsonSchema, tempCheckTypes, testOutput, selectedJsonSchema]);

  // Prepare initial and current data for comparison
  const currentData = useMemo(
    () => ({
      context: tempContext,
      checkTypes: tempCheckTypes.sort(),
      model: tempModel,
      embeddingModel: tempEmbeddingModel,
      useJsonSchema: tempUseJsonSchema,
      jsonSchema: tempJsonSchema,
      jsonSchemaStrict: tempJsonSchemaStrict,
      toolsCalled: tempToolsCalled,
      knowledgeBases: tempKnowledgeBases,
      images: tempImages,
    }),
    [
      tempContext,
      tempCheckTypes,
      tempModel,
      tempEmbeddingModel,
      tempUseJsonSchema,
      tempJsonSchema,
      tempJsonSchemaStrict,
      tempToolsCalled,
      tempKnowledgeBases,
      tempImages,
    ]
  );

  const initialData = useMemo(
    () => ({
      context: selectedContext,
      checkTypes: (selectedCheckTypes || DEFAULT_CHECK_TYPES).sort(),
      model: selectedModel,
      embeddingModel: selectedEmbeddingModel,
      useJsonSchema: selectedUseJsonSchema || false,
      jsonSchema: selectedJsonSchema || "",
      jsonSchemaStrict: selectedJsonSchemaStrict || false,
      toolsCalled: selectedToolsCalled || [],
      knowledgeBases: selectedKnowledgeBases || [],
      images: selectedImages || [],
    }),
    [
      selectedContext,
      selectedCheckTypes,
      selectedModel,
      selectedEmbeddingModel,
      selectedUseJsonSchema,
      selectedJsonSchema,
      selectedJsonSchemaStrict,
      selectedToolsCalled,
      selectedKnowledgeBases,
      selectedImages,
    ]
  );

  // Custom comparator for complex field comparisons
  const customComparator = (current, initial) => {
    // Check context changes
    if (!current.context && !initial.context) {
      // Both null, no change
    } else if (!current.context || !initial.context) {
      return true; // One is null, changed
    } else if (current.context.id !== initial.context.id) {
      return true;
    }

    // Check checkTypes (already sorted)
    if (JSON.stringify(current.checkTypes) !== JSON.stringify(initial.checkTypes)) {
      return true;
    }

    // Check model changes
    if (!current.model && !initial.model) {
      // Both null, no change
    } else if (!current.model || !initial.model) {
      return true;
    } else if (current.model.id !== initial.model.id) {
      return true;
    }

    // Check embedding model changes
    if (!current.embeddingModel && !initial.embeddingModel) {
      // Both null, no change
    } else if (!current.embeddingModel || !initial.embeddingModel) {
      return true;
    } else if (current.embeddingModel.id !== initial.embeddingModel.id) {
      return true;
    }

    // Check JSON schema settings
    if (
      current.useJsonSchema !== initial.useJsonSchema ||
      current.jsonSchema !== initial.jsonSchema ||
      current.jsonSchemaStrict !== initial.jsonSchemaStrict
    ) {
      return true;
    }

    // Check tools called with custom sorting
    const sortTools = (tools) =>
      [...tools].sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : String(a.id || "");
        const idB = typeof b.id === "number" ? b.id : String(b.id || "");
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

    if (
      JSON.stringify(sortTools(current.toolsCalled)) !==
      JSON.stringify(sortTools(initial.toolsCalled))
    ) {
      return true;
    }

    // Check knowledge bases with custom sorting
    const sortKBs = (kbs) =>
      [...kbs].sort((a, b) => {
        const idA = typeof a.id === "number" ? a.id : String(a.id || "");
        const idB = typeof b.id === "number" ? b.id : String(b.id || "");
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

    if (
      JSON.stringify(sortKBs(current.knowledgeBases)) !==
      JSON.stringify(sortKBs(initial.knowledgeBases))
    ) {
      return true;
    }

    // Check images with custom sorting
    const sortImages = (imgs) =>
      [...(imgs || [])].sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      });

    if (
      JSON.stringify(sortImages(current.images).map((i) => i.name)) !==
      JSON.stringify(sortImages(initial.images).map((i) => i.name))
    ) {
      return true;
    }

    return false;
  };

  // Check if any settings have changed using hook
  const hasChanges = useHasFormChanges(currentData, initialData, {
    editMode: true, // Always check for changes in this modal
    customComparator,
  });

  const handleSubmit = () => {
    if (hasChanges) {
      onContextChange(testIndex, tempContext);
      onCheckTypesChange(testIndex, tempCheckTypes);
      onModelChange(testIndex, tempModel);
      onEmbeddingModelChange(testIndex, tempEmbeddingModel);
      onUseJsonSchemaChange(testIndex, tempUseJsonSchema);
      onJsonSchemaChange(testIndex, tempJsonSchema);
      onJsonSchemaStrictChange(testIndex, tempJsonSchemaStrict);
      onToolsCalledChange(testIndex, tempToolsCalled);
      onKnowledgeBasesChange(testIndex, tempKnowledgeBases);
      onImagesChange(testIndex, tempImages);
      onClose();
    }
  };

  const handleClose = () => {
    setTempContext(selectedContext);
    // Ensure checkTypes are unique and include equality
    const uniqueCheckTypes = [...new Set(selectedCheckTypes || DEFAULT_CHECK_TYPES)];
    if (!uniqueCheckTypes.includes(CHECK_TYPES.EQUALITY.id)) {
      uniqueCheckTypes.push(CHECK_TYPES.EQUALITY.id);
    }
    setTempCheckTypes(uniqueCheckTypes);
    setTempModel(selectedModel);
    setTempEmbeddingModel(selectedEmbeddingModel);
    setTempUseJsonSchema(selectedUseJsonSchema || false);
    setTempJsonSchema(selectedJsonSchema || "");
    setTempJsonSchemaStrict(selectedJsonSchemaStrict || false);
    setTempToolsCalled(selectedToolsCalled || []);
    setTempKnowledgeBases(selectedKnowledgeBases || []);
    setTempImages(selectedImages || []);
    onClose();
  };

  // Check if JSON check type is selected
  const isJsonCheckEnabled = tempCheckTypes.includes(CHECK_TYPES.JSON_VALID.id);

  // Check if Tools Call check type is selected
  const isToolsCallEnabled = tempCheckTypes.includes(CHECK_TYPES.TOOLS_CALL.id);

  // Image upload handlers
  const handleMediaUpload = async (files) => {
    try {
      const imagePromises = files.map(async (file) => {
        const { dataUrl, mimeType, width, height } = await resizeImage(file, 1024);
        return {
          name: file.name,
          dataUrl,
          mimeType,
          width,
          height,
        };
      });
      const newImages = await Promise.all(imagePromises);
      setTempImages((prev) => [...prev, ...newImages]);
      setShowMediaUploadModal(false);
      showSuccess(
        "Images attached",
        `${files.length} image${files.length > 1 ? "s" : ""} attached`
      );
    } catch (error) {
      console.error("Error processing images:", error);
      showError("Upload Error", error?.message || "Failed to process images");
    }
  };

  const handleRemoveImage = (imageIndex) => {
    setTempImages((prev) => prev.filter((_, idx) => idx !== imageIndex));
  };

  const handleImageClick = (image) => {
    const imageSrc = image.dataUrl || image.url;
    const imageAlt = image.name || "Image";
    const htmlContent = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; padding: 20px;">
        <img src="${imageSrc}" alt="${imageAlt}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
      </div>
    `;
    openHtmlPreview(htmlContent, { title: imageAlt, width: 1024, height: 768 });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
      > settings`}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      primaryButtonDisabled={!hasChanges || (isToolsCallEnabled && tempToolsCalled.length === 0)}
      onRequestSubmit={handleSubmit}
      hasScrollingContent
      size="lg"
      preventCloseOnClickOutside
    >
      {open && (
        <>
          <div className="min-height-23rem testSettingsModalBody">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Model and Embedding Model */}
              <Column lg={8} md={4} sm={4}>
                <div className="space-y-2">
                  <AdvancedSelect
                    id={`modelDropdown-test-${testIndex}`}
                    titleText="Test Model"
                    label="Select a model"
                    items={modelItems}
                    selectedItem={selectedModelItem}
                    columns={["providerName", "capabilities"]}
                    filterableColumns={["providerName"]}
                    itemToString={(item) => item?.text || coreModelDisplayName}
                    onChange={({ selectedItem }) => {
                      setTempModel(selectedItem.id === "default" ? null : selectedItem);
                    }}
                    helperText={"Model used for this specific test"}
                    disabled={availableModels.length === 0}
                    showProviderIcon
                  />
                </div>
              </div>
              <Column lg={8} md={4} sm={4}>
                <div className="space-y-2">
                  <AdvancedSelect
                    id={`embeddingModelDropdown-test-${testIndex}`}
                    titleText="Embeddings Model"
                    label="Select an embeddings model"
                    helperText={
                      isToolsCallEnabled
                        ? "Disabled when Tools Call check is enabled"
                        : "Embeddings model to check similarity"
                    }
                    items={embeddingItems}
                    selectedItem={selectedEmbeddingItem}
                    columns={["providerName"]}
                    filterableColumns={["providerName"]}
                    itemToString={(item) => item?.text || defaultEmbeddingDisplayName}
                    onChange={({ selectedItem }) => {
                      setTempEmbeddingModel(selectedItem.id === "default" ? null : selectedItem);
                    }}
                    disabled={isToolsCallEnabled || availableEmbeddings.length === 0}
                    showProviderIcon
                  />
                </div>
              </div>

              {/* Row 2: Context and Check Types */}
              <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                <div className="space-y-2">
                  <Dropdown
                    className="context-dropdown"
                    id={`contextDropdown-test-${testIndex}`}
                    titleText="Context"
                    label="Select a context"
                    items={[{ id: "none", name: "No context" }, ...contexts]}
                    selectedItem={tempContext || { id: "none", name: "No context" }}
                    itemToString={(item) => item?.name || "No context"}
                    disabled={!tempContext?.length}
                    onChange={({ selectedItem }) => {
                      setTempContext(selectedItem.id === "none" ? null : selectedItem);
                    }}
                    helperText={"Add some messages in the conversation"}
                  />
                </div>
              </div>

              {/* Knowledge Bases MultiSelect */}

              <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                <div className="space-y-2">
                  <MultiSelect
                    key={`knowledgeBasesMultiSelect-${testIndex}-${open}`}
                    id={`knowledgeBasesMultiSelect-test-${testIndex}`}
                    titleText="Knowledge Bases"
                    label="Select knowledge bases"
                    items={availableKnowledgeBases || []}
                    itemToString={(item) => item?.name || ""}
                    selectedItems={tempKnowledgeBases}
                    initialSelectedItems={tempKnowledgeBases}
                    disabled={!availableKnowledgeBases?.length}
                    onChange={({ selectedItems }) => {
                      setTempKnowledgeBases(selectedItems);
                    }}
                    helperText={"Include relevant context from knowledge bases"}
                  />
                </div>
              </div>

              {/* Test Input Images */}
              <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                <div className="space-y-2">
                  <div className="test-settings-images-section">
                    <div className="test-settings-images-header">
                      <label className="cds--label">
                        Test images{" "}
                        {selectedModelItem?.supportsVision ? "" : "(Require vision support)"}
                      </label>
                    </div>
                    <div className="test-settings-images-container">
                      <Button variant="ghost" size="icon"
                        kind="ghost"
                        size="sm"
                        label="Add images"
                        align="right"
                        onClick={() => setShowMediaUploadModal(true)}
                        className="test-settings-image-btn"
                        badgeCount={tempImages.length > 0 ? tempImages.length : undefined}
                        hasIconOnly
                        disabled={!selectedModelItem?.supportsVision}
                      >
                        <ImageIcon />
                      </IconButton>
                      {tempImages.length > 0 && (
                        <div className="test-settings-images-grid">
                          {tempImages.map((image, imgIndex) => (
                            <div key={imgIndex} className="test-settings-image-wrapper">
                              <img
                                src={image.dataUrl || image.url}
                                alt={image.name || `Image ${imgIndex + 1}`}
                                className="test-settings-image-preview"
                                onClick={() => handleImageClick(image)}
                              />
                              <button
                                type="button"
                                className="test-settings-image-remove"
                                onClick={() => handleRemoveImage(imgIndex)}
                                title="Remove image"
                              >
                                <Close size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="cds--form__helper-text">
                      {" "}
                      {selectedModelItem?.supportsVision
                        ? "Add images to include with test input"
                        : "Current model doesn't support vision, images will be ignored"}
                    </div>
                  </div>
                </div>
              </div>

              <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                <div className="space-y-2">
                  <MultiSelect
                    key={`checkTypesMultiSelect-${testIndex}-${open}`}
                    id={`checkTypesMultiSelect-test-${testIndex}`}
                    direction="top"
                    titleText="Output checks"
                    label="Checks to do on output"
                    items={checkTypeItemsWithDisabled}
                    itemToString={(item) => item?.label || ""}
                    selectedItems={checkTypeItemsWithDisabled.filter((item) =>
                      tempCheckTypes.includes(item.id)
                    )}
                    helperText={"Tools call check skips other checks"}
                    onChange={({ selectedItems }) => {
                      const checkTypeIds = selectedItems.map((item) => item.id);
                      // Ensure equality check is always included (only add if not already present)
                      if (!checkTypeIds.includes(CHECK_TYPES.EQUALITY.id)) {
                        checkTypeIds.push(CHECK_TYPES.EQUALITY.id);
                      }
                      // If tools call is selected but no tools available, remove it
                      const hasToolsCall = checkTypeIds.includes(CHECK_TYPES.TOOLS_CALL.id);
                      if (hasToolsCall && !hasAvailableTools) {
                        checkTypeIds.splice(checkTypeIds.indexOf(CHECK_TYPES.TOOLS_CALL.id), 1);
                      }

                      // Mutual exclusivity: TOOLS_CALL and JSON_VALID cannot coexist
                      const hasJsonValid = checkTypeIds.includes(CHECK_TYPES.JSON_VALID.id);
                      if (hasToolsCall && hasJsonValid) {
                        // Remove the one that was not just selected (keep the most recent selection)
                        const wasToolsCallSelected = selectedItems.some(
                          (item) => item.id === CHECK_TYPES.TOOLS_CALL.id
                        );
                        const wasJsonValidSelected = selectedItems.some(
                          (item) => item.id === CHECK_TYPES.JSON_VALID.id
                        );

                        // Determine which was added more recently by checking previous state
                        const hadToolsCall = tempCheckTypes.includes(CHECK_TYPES.TOOLS_CALL.id);
                        const hadJsonValid = tempCheckTypes.includes(CHECK_TYPES.JSON_VALID.id);

                        if (!hadToolsCall && hasToolsCall) {
                          // Tools call was just added, remove JSON valid
                          checkTypeIds.splice(checkTypeIds.indexOf(CHECK_TYPES.JSON_VALID.id), 1);
                        } else if (!hadJsonValid && hasJsonValid) {
                          // JSON valid was just added, remove tools call
                          checkTypeIds.splice(checkTypeIds.indexOf(CHECK_TYPES.TOOLS_CALL.id), 1);
                        }
                      }

                      // Clear tempToolsCalled if tools call is deselected
                      if (!checkTypeIds.includes(CHECK_TYPES.TOOLS_CALL.id)) {
                        setTempToolsCalled([]);
                      }

                      // Remove duplicates
                      const uniqueCheckTypes = [...new Set(checkTypeIds)];
                      setTempCheckTypes(uniqueCheckTypes);
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Tools Called MultiSelect (only show when Tools Call check is enabled) */}
              {isToolsCallEnabled && hasAvailableTools && (
                <Column lg={16} md={8} sm={4} className="margin-top-1rem">
                  <div className="space-y-2">
                    <MultiSelect
                      key={`toolsCalledMultiSelect-${testIndex}-${open}`}
                      id={`toolsCalledMultiSelect-test-${testIndex}`}
                      direction="top"
                      titleText="Tools to verify (*)"
                      label="Select tools that must be called"
                      items={availableTools}
                      itemToString={(item) => item?.name || ""}
                      selectedItems={tempToolsCalled}
                      initialSelectedItems={tempToolsCalled}
                      onChange={({ selectedItems }) => {
                        setTempToolsCalled(selectedItems);
                      }}
                      invalid={isToolsCallEnabled && tempToolsCalled.length === 0}
                      invalidText="At least one tool must be selected when 'Tools call' check is enabled"
                    />
                  </div>
                </div>
              )}

              {/* Row 3b: Expected Parameters for each selected tool (only show when tools are selected) */}
              {isToolsCallEnabled && tempToolsCalled.length > 0 && (
                <Column lg={16} md={8} sm={4} className="margin-top-1rem">
                  <div className="space-y-2">
                    <label className="cds--label margin-bottom-half">
                      Expected Tool Parameters (optional)
                    </label>
                    <Accordion>
                      {tempToolsCalled.map((tool, toolIndex) => {
                        // Parse the tool's parameter schema to extract properties
                        let schemaProperties = {};
                        try {
                          if (tool.parameters && typeof tool.parameters === "object") {
                            if (tool.parameters.properties) {
                              schemaProperties = tool.parameters.properties;
                            }
                          }
                        } catch (e) {
                          // Invalid schema, no properties
                        }

                        const hasSchema = Object.keys(schemaProperties).length > 0;

                        return (
                          <AccordionItem
                            key={`tool-${tool.id}-${toolIndex}`}
                            title={
                              <div>
                                <strong>{tool.name}</strong>
                                {!hasSchema && (
                                  <span className="form-text-italic-secondary-inline">
                                    (no schema defined)
                                  </span>
                                )}
                              </div>
                            }
                            open={false}
                          >
                            {hasSchema ? (
                              <div className="padding-0-1rem">
                                <p className="margin-bottom-1rem form-helper-text-secondary">
                                  Specify the expected parameter values for this tool. Leave empty
                                  if you don't want to verify specific values.
                                </p>
                                <div className="flex-gap-1rem">
                                  {Object.entries(schemaProperties).map(
                                    ([paramName, paramSchema]) => {
                                      const paramType = paramSchema.type || "string";
                                      const paramDescription = paramSchema.description || "";
                                      // Get current value for this parameter
                                      const currentValue = tool.expectedParams?.[paramName] || "";
                                      return (
                                        <div key={paramName} className="margin-bottom-1rem">
                                          <Input
                                            id={`tool-${tool.id}-param-${paramName}`}
                                            label={`${paramName} (${paramType})`}
                                            placeholder={
                                              paramDescription ||
                                              `Enter expected value for ${paramName}`
                                            }
                                            value={currentValue}
                                            onChange={(e) => {
                                              // Update the expectedParams for this tool
                                              const updatedToolsCalled = [...tempToolsCalled];
                                              const toolToUpdate = updatedToolsCalled[toolIndex];
                                              if (!toolToUpdate.expectedParams) {
                                                toolToUpdate.expectedParams = {};
                                              }
                                              toolToUpdate.expectedParams[paramName] =
                                                e.target.value;
                                              setTempToolsCalled(updatedToolsCalled);
                                            }}
                                          />
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="padding-1rem form-text-italic-secondary">
                                This tool has no parameter schema defined. Expected parameters
                                cannot be specified.
                              </div>
                            )}
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </div>
              )}

              {/* Row 4: Use JSON Schema and Strict toggles (only show when JSON check is enabled) */}
              {isJsonCheckEnabled && (
                <>
                  <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                    <div className="space-y-2">
                      <Switch
                        id={`useJsonSchemaToggle-test-${testIndex}`}
                        label="Use JSON schema"
                        labelA="Off"
                        labelB="On"
                        checked={tempUseJsonSchema}
                        onCheckedChange={(checked) => setTempUseJsonSchema(checked)}
                      />
                    </div>
                  </div>
                  {tempUseJsonSchema && (
                    <Column lg={8} md={4} sm={4} className="margin-top-1rem">
                      <div className="space-y-2">
                        <Switch
                          id={`jsonSchemaStrictToggle-test-${testIndex}`}
                          label="Strict mode"
                          labelA="Additional fields allowed in JSON"
                          labelB="JSON strictly follows schema"
                          checked={tempJsonSchemaStrict}
                          onCheckedChange={(checked) => setTempJsonSchemaStrict(checked)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Row 5: JSON Schema textarea (only show when Use JSON Schema is enabled) */}
              {isJsonCheckEnabled && tempUseJsonSchema && (
                <Column lg={16} md={8} sm={4} className="margin-top-1rem">
                  <div className="space-y-2">
                    <label className="cds--label">JSON Schema</label>
                    <JsonSchemaEditor
                      value={tempJsonSchema}
                      onChange={(value) => setTempJsonSchema(value)}
                      height="150px"
                      placeholder='Enter JSON schema here... e.g. {"type": "object", "properties": {...}}'
                      showValidation={true}
                      invalid={tempUseJsonSchema && !isJsonSchemaValid(tempJsonSchema)}
                      invalidText={
                        !tempJsonSchema.trim()
                          ? "JSON schema is required when 'Use JSON schema' is enabled"
                          : "Invalid JSON schema format"
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Modal for images */}
          <UploadModal
            open={showMediaUploadModal}
            onClose={() => setShowMediaUploadModal(false)}
            onUpload={handleMediaUpload}
            options={{
              title: "Add Test Input Images",
              description:
                "Upload images to include with the test input. Images will be resized to max 1024px.",
              accept: ".jpg,.jpeg,.png,.gif,.webp",
              multiple: true,
            }}
          />
        </>
      )}
    </Dialog>
  );
};

export default TestSettingsModal;
