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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Play, Wand2 } from "lucide-react";
import Ajv from "ajv";
import { saveTool } from "@utils/storageUtils";
import { useToast } from "@context/ToastContext";
import { useLoading } from "@context/LoadingContext";
import { useHasFormChanges, useDynamicRows } from "@hooks";
import { CORE } from "@core/MAIN";
import CodeEditor from "@components/shared/CodeEditor";
import JsonSchemaEditor from "@components/shared/JsonSchemaEditor";
import TestFunctionModal from "@components/modals/TestFunctionModal";
import {
  extractFunctionBody,
  generateFunctionSignature,
  getDefaultFunctionBody,
  validateFunctionBody,
} from "@utils/toolUtils";
import { validateToolName, isValidJson } from "./ToolModal.utils";
import { useSettings } from "@context/SettingsContext";

const ToolModal = ({ isOpen, onClose, editMode = false, initialTool = null, onSave }) => {
  const { showError, showSuccess } = useToast();
  const { isLoading } = useLoading();
  const { settings } = useSettings();

  const [currentTool, setCurrentTool] = useState(
    initialTool || {
      type: "function",
      name: "",
      description: "",
      parameters: "{}",
      functionBody: "",
    }
  );
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isMagicFilling, setIsMagicFilling] = useState(false);
  const [hasUserEditedFunction, setHasUserEditedFunction] = useState(false);
  const [hasAutoTriggeredMagic, setHasAutoTriggeredMagic] = useState(false);
  const [shouldCheckAutoTrigger, setShouldCheckAutoTrigger] = useState(false);
  const [functionBodyValidation, setFunctionBodyValidation] = useState({
    valid: true,
    error: null,
  });

  // Dynamic rows for description field
  const description = useDynamicRows(1, 3);

  // Reset form when modal opens with new tool
  useEffect(() => {
    if (initialTool) {
      // Extract body from functionCode if it exists
      let body = initialTool.functionBody || "";
      if (!body && initialTool.functionCode) {
        // Extract body from full function code
        const match = initialTool.functionCode.match(/^[^{]*\{([\s\S]*)\}[^}]*$/);
        body = match && match[1] ? match[1].trim() : "";
      }

      setCurrentTool({
        ...initialTool,
        parameters:
          typeof initialTool.parameters === "string"
            ? initialTool.parameters
            : JSON.stringify(initialTool.parameters || {}, null, 2),
        functionBody: body || getDefaultFunctionBody(initialTool.parameters || "{}"),
      });
      setHasUserEditedFunction(!!body); // If there's existing body, consider it as edited
      setHasAutoTriggeredMagic(false); // Reset auto-trigger flag when modal opens
      setShouldCheckAutoTrigger(false); // Reset check flag

      // Validate initial function body
      const initialBody = body || getDefaultFunctionBody(initialTool.parameters || "{}");
      if (initialBody && initialBody.trim()) {
        const validation = validateFunctionBody(initialBody);
        setFunctionBodyValidation(validation);
      }
    } else {
      const defaultBody = getDefaultFunctionBody("{}");
      setCurrentTool({
        type: "function",
        name: "",
        description: "",
        parameters: "{}",
        functionBody: defaultBody,
      });
      setHasUserEditedFunction(false); // New tool, no edits yet
      setHasAutoTriggeredMagic(false); // Reset auto-trigger flag when modal opens
      setShouldCheckAutoTrigger(false); // Reset check flag

      // Validate default function body
      if (defaultBody && defaultBody.trim()) {
        const validation = validateFunctionBody(defaultBody);
        setFunctionBodyValidation(validation);
      }
    }
  }, [initialTool, isOpen]);

  // Auto-trigger magic fill when conditions are met (after description blur)
  useEffect(() => {
    // Check if we should auto-trigger
    const shouldAutoTrigger =
      shouldCheckAutoTrigger && // Only check after description blur
      !hasAutoTriggeredMagic && // Haven't triggered automatically yet
      !hasUserEditedFunction && // User hasn't manually edited the function
      currentTool.name.trim() && // Name is provided
      !validateToolName(currentTool.name) && // Name is valid
      currentTool.description.trim() && // Description is provided
      (currentTool.parameters === "{}" || currentTool.parameters === "") && // Schema is empty
      !isMagicFilling; // Not currently filling

    if (shouldAutoTrigger) {
      setHasAutoTriggeredMagic(true); // Mark as triggered to prevent loops
      handleMagicFill();
    }
  }, [
    shouldCheckAutoTrigger,
    currentTool.name,
    currentTool.description,
    currentTool.parameters,
    hasUserEditedFunction,
    hasAutoTriggeredMagic,
    isMagicFilling,
  ]);

  // Memoize the function signature based on name and parameters
  const functionSignature = useMemo(() => {
    if (!currentTool.name) return "";
    return generateFunctionSignature(currentTool.name, currentTool.parameters);
  }, [currentTool.name, currentTool.parameters]);

  // Reconstruct full function code from signature and body for saving/testing
  const fullFunctionCode = useMemo(() => {
    if (!functionSignature) return "";
    return `${functionSignature}\n${currentTool.functionBody}\n}`;
  }, [functionSignature, currentTool.functionBody]);

  const handleInputChange = (e) => {
    setCurrentTool((prevTool) => ({
      ...prevTool,
      [e.target.name]: e.target.value,
    }));
  };

  const handleParametersChange = (value) => {
    setCurrentTool((prevTool) => ({
      ...prevTool,
      parameters: value,
    }));
  };

  const handleFunctionBodyChange = (body) => {
    setHasUserEditedFunction(true); // Mark that user has manually edited the function
    setCurrentTool((prevTool) => ({
      ...prevTool,
      functionBody: body,
    }));

    // Validate function body syntax in real-time
    if (body && body.trim()) {
      const validation = validateFunctionBody(body);
      setFunctionBodyValidation(validation);
    } else {
      // Empty body is invalid
      setFunctionBodyValidation({ valid: false, error: "Function body is required" });
    }
  };

  // Check if form is valid
  const isFormValid = useMemo(() => {
    // Name is required and must be valid
    if (!currentTool.name.trim() || validateToolName(currentTool.name)) return false;
    // Parameters must be valid JSON
    if (!isValidJson(currentTool.parameters)) return false;
    // Function body is required and must be valid
    if (!currentTool.functionBody.trim()) return false;
    if (!functionBodyValidation.valid) return false;
    //valid
    return true;
  }, [currentTool.name, currentTool.parameters, currentTool.functionBody, functionBodyValidation]);

  // Prepare initial data for comparison
  const initialToolNormalized = useMemo(() => {
    if (!initialTool) return null;

    // Extract initial body if needed
    let initialBody = initialTool.functionBody || "";
    if (!initialBody && initialTool.functionCode) {
      const match = initialTool.functionCode.match(/^[^{]*\{([\s\S]*)\}[^}]*$/);
      initialBody = match && match[1] ? match[1].trim() : "";
    }

    const initialParams =
      typeof initialTool.parameters === "string"
        ? initialTool.parameters
        : JSON.stringify(initialTool.parameters || {}, null, 2);

    return {
      name: initialTool.name,
      description: initialTool.description || "",
      parameters: initialParams,
      functionBody: initialBody,
    };
  }, [initialTool]);

  // Check if anything changed in edit mode using hook
  const hasChanges = useHasFormChanges(
    {
      name: currentTool.name,
      description: currentTool.description,
      parameters: currentTool.parameters,
      functionBody: currentTool.functionBody,
    },
    initialToolNormalized,
    { editMode }
  );

  // Button should be enabled if form is valid AND (not in edit mode OR has changes)
  const isSubmitEnabled = isFormValid && (!editMode || hasChanges);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!currentTool.name.trim()) {
      showError("Validation Error", "Tool name is required");
      return;
    }

    // Validate tool name format
    const nameError = validateToolName(currentTool.name);
    if (nameError) {
      showError("Validation Error", nameError);
      return;
    }

    // Validate parameters JSON
    let parsedParameters = {};
    if (currentTool.parameters.trim()) {
      try {
        parsedParameters = JSON.parse(currentTool.parameters);
        if (
          parsedParameters === null ||
          typeof parsedParameters !== "object" ||
          Array.isArray(parsedParameters)
        ) {
          showError("Validation Error", "Parameters must be a JSON object (not null or array)");
          return;
        }

        // Validate that parameters are a valid JSON Schema
        const ajv = new Ajv({
          strict: false,
          validateSchema: false, // Don't validate the meta-schema
          allowUnionTypes: true,
        });
        try {
          ajv.compile(parsedParameters);
        } catch (schemaError) {
          showError(
            "Validation Error",
            "Parameters must be a valid JSON Schema. Error: " + schemaError.message
          );
          return;
        }
      } catch (err) {
        showError("Validation Error", "Parameters must be valid JSON. Error: " + err.message);
        return;
      }
    }

    // Validate function body is required
    if (!currentTool.functionBody || !currentTool.functionBody.trim()) {
      showError("Validation Error", "Function body is required");
      return;
    }

    // Save tool with full function code
    const toolToSave = {
      ...currentTool,
      parameters: parsedParameters,
      functionCode: fullFunctionCode,
      functionBody: currentTool.functionBody, // Also save body separately for easier editing
    };
    const updatedTools = await saveTool(toolToSave);

    // Call the onSave callback with the updated tools
    if (onSave) onSave(updatedTools);

    // Close the modal
    onClose();
  };

  const handleMagicFill = async () => {
    // magic fill functionality
    setIsMagicFilling(true);
    try {
      const schema = await CORE.generateSchema(currentTool.name, currentTool.description);
      const stringSchema = JSON.stringify(schema, null, 2);
      handleParametersChange(stringSchema);
      showSuccess("Schema Generation completed", `Schema generated successfully`, 2000);

      const genFunction = await CORE.generateFunction(
        currentTool.name,
        currentTool.description,
        stringSchema,
        generateFunctionSignature(currentTool.name, stringSchema)
      );
      // Extract only the function body from the generated function
      const extractedBody = extractFunctionBody(genFunction);
      const autoGenComment = `/*** AI generated code - Test it before use ***/\n\n`;
      handleFunctionBodyChange(autoGenComment + extractedBody);
      showSuccess("Function generation completed", `Function generated successfully`, 2000);
    } catch (error) {
      console.log(error);
      if (error.name === "AbortError") {
        showError("Operation stopped", "Generation has been aborted");
      } else {
        const errorMessage =
          typeof error === "string" ? error : error?.message || "An error occurred";
        showError("Generation failed", errorMessage);
      }
    } finally {
      setIsMagicFilling(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Tool" : "Create Tool"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="tool-name">Name (*)</Label>
                <Input
                  id="tool-name"
                  placeholder="Enter tool name (e.g., myTool, get_data, calculate_sum)"
                  value={currentTool.name}
                  name="name"
                  onChange={handleInputChange}
                  required
                  disabled={isMagicFilling}
                  className={
                    currentTool.name.trim() !== "" && validateToolName(currentTool.name) !== null
                      ? "border-destructive"
                      : ""
                  }
                />
                {currentTool.name.trim() !== "" && validateToolName(currentTool.name) !== null && (
                  <p className="text-xs text-destructive mt-1">{validateToolName(currentTool.name)}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  1-64 characters, must start with a letter, can contain letters, numbers, hyphens, and underscores
                </p>
              </div>
              <div className="w-36">
                <Label htmlFor="tool-type">Type</Label>
                <Input
                  id="tool-type"
                  value={currentTool.type}
                  name="type"
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label htmlFor="tool-description">Description</Label>
                {isMagicFilling ? (
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">Generating...</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMagicFill}
                    disabled={
                      !currentTool.name.trim() ||
                      validateToolName(currentTool.name) !== null ||
                      !currentTool.description.trim() ||
                      !settings.providers?.length
                    }
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto generate
                  </Button>
                )}
              </div>
              <Textarea
                id="tool-description"
                placeholder="Enter a description of what this tool does, this could be used to autogenerate schema and function template"
                value={currentTool.description}
                name="description"
                onChange={handleInputChange}
                rows={description.rows}
                disabled={isMagicFilling || !currentTool.name.trim()}
                onFocus={description.onFocus}
                onBlur={() => {
                  description.onBlur();
                  setShouldCheckAutoTrigger(true); // Trigger auto-fill check after description blur
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Parameters (JSON Schema object, optional)</Label>
              <JsonSchemaEditor
                value={currentTool?.parameters || ""}
                onChange={handleParametersChange}
                height="120px"
                disabled={isMagicFilling || !currentTool.name.trim()}
                placeholder='Enter JSON schema here... e.g. {"type": "object", "properties": {...}}'
                showValidation={true}
                helperText="Enter a valid JSON Schema object defining the function parameters. Leave as {} for no parameters."
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label>Function</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTestModalOpen(true)}
                  disabled={
                    !fullFunctionCode ||
                    !fullFunctionCode.trim() ||
                    isMagicFilling ||
                    (!functionBodyValidation.valid && currentTool.functionBody.trim())
                  }
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test Function
                </Button>
              </div>

              {/* Function (Read-only Signature) */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Function (Signature auto-generated)
                </Label>
                <CodeEditor
                  value={functionSignature}
                  onChange={() => {}} // Read-only, no-op
                  readOnly={true}
                  disabled={true}
                  showLineNumbers={false}
                  height="30px"
                />
              </div>
              {/* Function Body (Editable) */}
              <div
                className={
                  !functionBodyValidation.valid && currentTool.functionBody.trim()
                    ? "border-2 border-destructive rounded"
                    : ""
                }
              >
                <CodeEditor
                  className={"borderBottom-0 borderTop-0"}
                  value={currentTool.functionBody}
                  onChange={handleFunctionBodyChange}
                  disabled={isMagicFilling || !currentTool.name.trim()}
                  envVariables={settings.environmentVariables}
                />
              </div>
              {/* Closing brace (Read-only) */}
              <div>
                <CodeEditor
                  value="}"
                  onChange={() => {}} // Read-only, no-op
                  readOnly={true}
                  disabled={true}
                  showLineNumbers={false}
                  height="30px"
                />
              </div>

              <div className="text-xs text-muted-foreground mt-2">
                {!functionBodyValidation.valid && currentTool.functionBody.trim() ? (
                  <div className="text-destructive">{functionBodyValidation.error}</div>
                ) : (
                  <>
                    Edit the function body above. The signature is auto generated from the schema. Use
                    env.VARIABLE_NAME to access environment variables.
                  </>
                )}
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isLoading || isMagicFilling}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !isSubmitEnabled || isMagicFilling}
            >
              {isLoading ? "Session is running..." : editMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Function Modal - Outside parent modal to avoid nesting issues */}
      <TestFunctionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        functionCode={fullFunctionCode}
        parametersSchema={(() => {
          try {
            return JSON.parse(currentTool.parameters);
          } catch {
            return {};
          }
        })()}
      />
    </>
  );
};

export default ToolModal;
