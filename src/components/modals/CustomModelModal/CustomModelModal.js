import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
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
import { useHasFormChanges } from "@hooks";

const DEFAULT_MODEL_DATA = {
  id: "",
  text: "",
  contextLength: null,
  supportsTools: true,
  supportsVision: false,
  supportsJsonOutput: true,
};

const CustomModelModal = ({ isOpen, onClose, editingModel, onSave, existingModels = [] }) => {
  const [modelData, setModelData] = useState(DEFAULT_MODEL_DATA);
  const [initialModelData, setInitialModelData] = useState(DEFAULT_MODEL_DATA);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens or editing model changes
  useEffect(() => {
    if (isOpen) {
      if (editingModel) {
        const editData = {
          id: editingModel.id || "",
          text: editingModel.text || "",
          contextLength: editingModel.contextLength || null,
          supportsTools: editingModel.supportsTools ?? true,
          supportsVision: editingModel.supportsVision ?? false,
          supportsJsonOutput: editingModel.supportsJsonOutput ?? true,
        };
        setModelData(editData);
        setInitialModelData(editData);
      } else {
        setModelData(DEFAULT_MODEL_DATA);
        setInitialModelData(DEFAULT_MODEL_DATA);
      }
      setErrors({});
    }
  }, [isOpen, editingModel]);

  // Track form changes
  const hasFormChanges = useHasFormChanges(modelData, initialModelData, {
    editMode: !!editingModel,
  });

  // Check if model is valid (for enabling save button without showing errors)
  const isModelValid = useMemo(() => {
    // Model ID is required
    if (!modelData.id?.trim()) {
      return false;
    }
    // Check for duplicate model ID (excluding current model if editing)
    const isDuplicate = existingModels.some(
      (m) => m.id === modelData.id.trim() && (!editingModel || m.id !== editingModel.id)
    );
    if (isDuplicate) {
      return false;
    }
    // Display name is required
    if (!modelData.text?.trim()) {
      return false;
    }
    // Context length must be valid if provided
    if (modelData.contextLength !== null) {
      if (typeof modelData.contextLength !== "number" || isNaN(modelData.contextLength)) {
        return false;
      }
      if (modelData.contextLength <= 0) {
        return false;
      }
    }
    return true;
  }, [modelData, existingModels, editingModel]);

  const validateForm = () => {
    const newErrors = {};

    // Model ID is required
    if (!modelData.id?.trim()) {
      newErrors.id = "Model ID is required";
    } else {
      // Check for duplicate model ID (excluding current model if editing)
      const isDuplicate = existingModels.some(
        (m) => m.id === modelData.id.trim() && (!editingModel || m.id !== editingModel.id)
      );
      if (isDuplicate) {
        newErrors.id = "A model with this ID already exists";
      }
    }

    // Display name is required
    if (!modelData.text?.trim()) {
      newErrors.text = "Display name is required";
    }

    // Context length must be a valid positive number if provided
    if (modelData.contextLength !== null) {
      if (typeof modelData.contextLength !== "number" || isNaN(modelData.contextLength)) {
        newErrors.contextLength = "Context length must be a valid number";
      } else if (modelData.contextLength <= 0) {
        newErrors.contextLength = "Context length must be a positive number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const savedModel = {
      ...modelData,
      id: modelData.id.trim(),
      text: modelData.text.trim(),
      isCustom: true, // Mark as custom model
    };

    onSave(savedModel, !!editingModel);
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setModelData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  // Render modal in .rpi container to avoid z-index issues with parent modal
  const portalContainer = document.querySelector(".rpi") || document.body;

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] customModelAdd" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{editingModel ? "Edit Custom Model" : "Add Custom Model"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-model-id">Model ID *</Label>
            <Input
              id="custom-model-id"
              placeholder="e.g., gpt-4-custom or my-local-model"
              value={modelData.id}
              onChange={(e) => handleFieldChange("id", e.target.value)}
              autoFocus
            />
            <p className="text-sm text-muted-foreground">The unique identifier used when calling the API</p>
            {errors.id && <p className="text-sm text-destructive">{errors.id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-model-text">Display Name *</Label>
            <Input
              id="custom-model-text"
              placeholder="e.g., My Custom GPT-4"
              value={modelData.text}
              onChange={(e) => handleFieldChange("text", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">Human-readable name shown in model selection</p>
            {errors.text && <p className="text-sm text-destructive">{errors.text}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-model-context-length">Context Length (tokens)</Label>
            <Input
              id="custom-model-context-length"
              type="number"
              placeholder="e.g., 8192"
              value={modelData.contextLength || ""}
              onChange={(e) => handleFieldChange("contextLength", e.target.value ? parseInt(e.target.value) : null)}
              min={1}
              step={1024}
            />
            <p className="text-sm text-muted-foreground">Maximum number of tokens the model can process (leave empty if unknown)</p>
            {errors.contextLength && <p className="text-sm text-destructive">{errors.contextLength}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-model-supports-tools">Supports Tools</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="custom-model-supports-tools"
                  checked={modelData.supportsTools}
                  onCheckedChange={(checked) => handleFieldChange("supportsTools", checked)}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-model-supports-vision">Supports Vision</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="custom-model-supports-vision"
                  checked={modelData.supportsVision}
                  onCheckedChange={(checked) => handleFieldChange("supportsVision", checked)}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-model-supports-json">JSON Output</Label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">No</span>
                <Switch
                  id="custom-model-supports-json"
                  checked={modelData.supportsJsonOutput}
                  onCheckedChange={(checked) => handleFieldChange("supportsJsonOutput", checked)}
                />
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isModelValid || !hasFormChanges}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return ReactDOM.createPortal(modalContent, portalContainer);
};

export default CustomModelModal;
