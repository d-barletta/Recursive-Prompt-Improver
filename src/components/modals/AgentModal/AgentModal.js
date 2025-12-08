import React, { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@context/SettingsContext";
import { useToast } from "@context/ToastContext";
import { usePrompt } from "@context/PromptContext";
import { useDynamicRows, useHasFormChanges } from "@hooks";
import {
  getAllAvailableModels,
  isJsonSchemaValid,
  validateAgentName,
  combineToolsAndAgents,
} from "@utils/uiUtils";
import {
  getToolsWithDisabledState,
  formatModelWithProvider,
} from "@components/FormComponent/FormComponent.utils";
import { loadTools, loadAgents, loadAllMCPTools } from "@utils/storageUtils";
import {
  savePreviousInstructions,
  saveImprovedInstructions,
  clearImprovedInstructions,
  clearInstructionHistory,
} from "@utils/storageUtils";
import { CORE } from "@core/MAIN";
import JsonSchemaEditor from "@components/shared/JsonSchemaEditor";
import InstructionsEditor from "@components/shared/InstructionsEditor";
import DiffModal from "@components/modals/DiffModal";
import { AdvancedMultiselect, AdvancedSelect } from "@components/shared";

const AgentModal = ({ isOpen, onClose, editMode, initialAgent, onSave }) => {
  const { settings } = useSettings();
  const { showSuccess, showError, showInfo } = useToast();
  const { prompt } = usePrompt();
  const instructionsRef = useRef(null);

  const [agent, setAgent] = useState({
    name: "",
    instructions: "",
    description: "",
    selectedTools: [],
    coreModel: null,
    useJsonOutput: false,
    useJsonSchema: false,
    jsonSchema: "",
    jsonSchemaStrict: false,
    chatMessages: [],
  });
  const [tools, setTools] = useState([]);
  const [agents, setAgents] = useState([]);
  const [existingAgents, setExistingAgents] = useState([]);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [previousInstructions, setPreviousInstructions] = useState(null);
  const [improvedInstructions, setImprovedInstructions] = useState(null);
  const [nameError, setNameError] = useState("");
  const [jsonSchemaError, setJsonSchemaError] = useState("");
  const [initialAgentState, setInitialAgentState] = useState(null);

  const allAvailableModels = getAllAvailableModels(settings.providers);
  const instructionsDynamicRows = useDynamicRows(4, 10);

  // Check if form has changes from initial state
  const hasChanges = useHasFormChanges(agent, initialAgentState, {
    editMode,
    ignoreFields: ["chatMessages"], // Ignore chat history in comparison
  });

  // Combine tools and agents, excluding current agent (to prevent self-reference)
  const combinedToolsAndAgents = combineToolsAndAgents(tools, agents, agent.id);

  useEffect(() => {
    if (isOpen) {
      Promise.all([loadTools(), loadAgents(), loadAllMCPTools()]).then(
        ([loadedTools, loadedAgents, loadedMCPTools]) => {
          // Combine all tools including MCP tools
          const allTools = [...loadedTools, ...loadedMCPTools];
          setTools(allTools);
          setAgents(loadedAgents);

          // When editing, match selectedTools by ID to ensure proper MultiSelect state and fresh references
          if (editMode && initialAgent) {
            // Combine tools and agents to find matches (include MCP tools)
            const combinedAvailable = combineToolsAndAgents(
              allTools,
              loadedAgents,
              initialAgent.id
            );

            // Match selected tools by ID from storage (fresh references)
            const selectedToolIds = new Set((initialAgent.selectedTools || []).map((t) => t.id));
            const matchedTools = combinedAvailable.filter((tool) => selectedToolIds.has(tool.id));

            // Set agent with fresh tool references
            setAgent({
              id: initialAgent.id,
              name: initialAgent.name || "",
              instructions: initialAgent.instructions || "",
              description: initialAgent.description || "",
              selectedTools: matchedTools, // Use fresh matched tools, not stale initialAgent.selectedTools
              coreModel: initialAgent.coreModel || null,
              useJsonOutput: initialAgent.useJsonOutput || false,
              useJsonSchema: initialAgent.useJsonSchema || false,
              jsonSchema: initialAgent.jsonSchema || "",
              jsonSchemaStrict: initialAgent.jsonSchemaStrict || false,
              chatMessages: initialAgent.chatMessages || [],
            });
            setInitialAgentState({
              id: initialAgent.id,
              name: initialAgent.name || "",
              instructions: initialAgent.instructions || "",
              description: initialAgent.description || "",
              selectedTools: matchedTools, // Use fresh matched tools
              coreModel: initialAgent.coreModel || null,
              useJsonOutput: initialAgent.useJsonOutput || false,
              useJsonSchema: initialAgent.useJsonSchema || false,
              jsonSchema: initialAgent.jsonSchema || "",
              jsonSchemaStrict: initialAgent.jsonSchemaStrict || false,
              chatMessages: initialAgent.chatMessages || [],
            });
          } else {
            // Create mode - use default provider's model
            const defaultProvider = settings.providers?.find(
              (p) => p.id === settings.defaultProviderId
            );
            const provider = defaultProvider || settings.providers?.[0];
            const defaultModel = provider?.selectedModel
              ? {
                  ...provider.selectedModel,
                  providerId: provider.id,
                  providerName: provider.name,
                  text: `${provider.selectedModel.text} (${provider.name})`,
                  originalText: provider.selectedModel.text,
                }
              : null;

            setAgent({
              name: "",
              instructions: "",
              description: "",
              selectedTools: [],
              coreModel: defaultModel,
              useJsonOutput: false,
              useJsonSchema: false,
              jsonSchema: "",
              jsonSchemaStrict: false,
              chatMessages: [],
            });
            setInitialAgentState(null); // No initial state in create mode
          }
        }
      );

      loadAgents().then(setExistingAgents);

      // Clear instruction history when modal opens to avoid showing stale improve/compare buttons
      // Each modal session should have its own instruction improvement history
      clearInstructionHistory().then(() => {
        setPreviousInstructions(null);
        setImprovedInstructions(null);
      });

      setNameError("");
    }
  }, [isOpen, editMode, initialAgent, settings.providers, settings.defaultProviderId]);

  const handleChange = (field, value) => {
    setAgent((prev) => ({ ...prev, [field]: value }));
    if (field === "name") {
      // Validate name in real-time
      const error = validateAgentName(value, existingAgents, agent.id);
      setNameError(error || "");
    }
    if (field === "jsonSchema") {
      // Validate JSON schema
      if (value.trim()) {
        const isValid = isJsonSchemaValid(value);
        if (!isValid) {
          setJsonSchemaError("Invalid JSON schema format");
        } else {
          setJsonSchemaError("");
        }
      } else {
        setJsonSchemaError("");
      }
    }
    if (field === "useJsonOutput" && !value) {
      // Clear error when JSON output is disabled
      setJsonSchemaError("");
    }
    if (field === "useJsonSchema" && !value) {
      // Clear error when JSON schema is disabled
      setJsonSchemaError("");
    }
  };

  const handleImprovePrompt = async () => {
    const isGenerating = !agent.instructions.trim();

    const feedback = await prompt({
      title: isGenerating ? "Generate Instructions" : "Improve Instructions",
      body: isGenerating
        ? "Describe what you want the agent to do:"
        : "Provide feedback or requirements to improve the current agent:",
      placeholder: isGenerating
        ? "Example: Create a prompt that helps users write professional emails"
        : "Example: Make it more concise, add error handling instructions, etc.",
      confirmText: isGenerating ? "Generate" : "Improve",
      className: "improve-prompt-modal",
      cancelText: "Cancel",
      initialValue: "",
      rows: 6,
    });

    if (feedback) {
      setIsImprovingPrompt(true);
      try {
        // Save current instructions before improving
        const previous = agent.instructions;
        setPreviousInstructions(previous);
        await savePreviousInstructions(previous);
        setImprovedInstructions(null);
        await clearImprovedInstructions();

        const res = await CORE.improvePromptByFeedback(agent.instructions, feedback, true);
        const summary = res?.summary;
        const final = res?.improvedPrompt;
        if (final) {
          setImprovedInstructions(final);
          await saveImprovedInstructions(final);
          setAgent((prev) => ({
            ...prev,
            instructions: final || prev.instructions,
            // Auto-populate description if empty and summary is available
            description: prev.description?.trim() ? prev.description : summary || prev.description,
          }));
          showSuccess(
            "Completed",
            isGenerating
              ? "Agent instructions generated based on your description"
              : "Agent instructions improved based on your feedback",
            4000
          );
        }
      } catch (error) {
        console.log(error);
        setPreviousInstructions(null);
        setImprovedInstructions(null);
        await clearInstructionHistory();
        if (error.name === "AbortError") {
          showError(
            "Operation stopped",
            isGenerating ? "Generation has been aborted" : "Improving has been aborted"
          );
        } else {
          const errorMessage =
            typeof error === "string" ? error : error?.message || "An error occurred";
          showError("Processing failed", errorMessage);
        }
      }
      setIsImprovingPrompt(false);
    }
  };

  const handleUndoImprove = () => {
    if (previousInstructions !== null) {
      setAgent((prev) => ({ ...prev, instructions: previousInstructions }));
      showInfo("Restored", "Previous agent instructions have been restored");
    }
  };

  const handleRedoImprove = () => {
    if (improvedInstructions !== null) {
      setAgent((prev) => ({ ...prev, instructions: improvedInstructions }));
      showInfo("Restored", "Improved agent instructions have been restored");
    }
  };

  const handleCompare = () => {
    setIsDiffModalOpen(true);
  };

  const handleSave = async () => {
    // Validate agent name
    const nameValidationError = validateAgentName(agent.name, existingAgents, agent.id);
    if (nameValidationError) {
      setNameError(nameValidationError);
      showError("Validation Error", nameValidationError);
      return;
    }

    if (!agent.instructions.trim()) {
      showError("Validation Error", "Agent instructions are required");
      return;
    }

    if (!agent.coreModel) {
      showError("Validation Error", "Agent model is required");
      return;
    }

    // Validate JSON schema if schema validation is enabled
    if (agent.useJsonSchema) {
      if (!agent.jsonSchema.trim()) {
        setJsonSchemaError("JSON schema is required when 'JSON schema' is enabled");
        showError("Validation Error", "JSON schema is required when 'JSON schema' is enabled");
        return;
      }
      if (!isJsonSchemaValid(agent.jsonSchema)) {
        setJsonSchemaError("Invalid JSON schema format");
        showError("Validation Error", "Invalid JSON schema format");
        return;
      }
    }

    await onSave(agent);
    onClose();
  };

  const toolsWithDisabledState = getToolsWithDisabledState(
    combinedToolsAndAgents,
    agent.selectedTools
  );

  const isFormValid = () => {
    if (!agent.name?.trim()) return false;
    const nameValidationError = validateAgentName(agent.name, existingAgents, agent.id);
    if (nameValidationError) return false;
    if (!agent.instructions?.trim()) return false;
    if (!agent.coreModel) return false;
    // JSON schema validation (only if JSON schema is enabled)
    if (agent.useJsonOutput && agent.useJsonSchema) {
      if (!agent.jsonSchema?.trim()) return false;
      if (!isJsonSchemaValid(agent.jsonSchema)) return false;
    }
    return true;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Agent" : "Create Agent"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agent-name">Agent Name (*)</Label>
                <Input
                  id="agent-name"
                  placeholder="Enter a unique name for this agent"
                  value={agent.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className={nameError ? "border-destructive" : ""}
                  required
                />
                {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  1-64 characters, must start with a letter, can contain letters, numbers, hyphens, and underscores
                </p>
              </div>
              <div>
                <AdvancedSelect
                  id="agent-model"
                  titleText="Model (*)"
                  label="Select a model"
                  items={allAvailableModels.map((model) =>
                    formatModelWithProvider(model, settings.providers)
                  )}
                  columns={["providerName", "capabilities"]}
                  filterableColumns={["providerName"]}
                  itemToString={(item) => (item ? item.text : "")}
                  selectedItem={
                    agent.coreModel
                      ? formatModelWithProvider(agent.coreModel, settings.providers)
                      : null
                  }
                  onChange={({ selectedItem }) => handleChange("coreModel", selectedItem)}
                  disabled={allAvailableModels.length === 0}
                  showProviderIcon
                />
              </div>
            </div>

            <InstructionsEditor
              instructions={agent.instructions}
              instructionsRows={instructionsDynamicRows.rows}
              isLoading={false}
              isImprovingPrompt={isImprovingPrompt}
              hasProviders={!!settings?.providers?.length}
              previousInstructions={previousInstructions}
              improvedInstructions={improvedInstructions}
              onInstructionsChange={(e) => handleChange("instructions", e.target.value)}
              onInstructionsFocus={instructionsDynamicRows.onFocus}
              onInstructionsBlur={instructionsDynamicRows.onBlur}
              onImprove={handleImprovePrompt}
              onUndo={handleUndoImprove}
              onRedo={handleRedoImprove}
              onCompare={handleCompare}
              id="agent-instructions"
              labelText="Instructions (*)"
              placeholder="Enter instructions for the agent"
              textAreaRef={instructionsRef}
            />

            <div>
              <Label htmlFor="agent-description">Description</Label>
              <Textarea
                id="agent-description"
                placeholder="Enter a brief description of what this agent does (optional)"
                value={agent.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={1}
                disabled={isImprovingPrompt}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <AdvancedMultiselect
                  id="agent-tools"
                  titleText="Tools & Agents"
                  label="Select tools and agents"
                  items={toolsWithDisabledState}
                  direction="top"
                  columns={["type", "origin"]}
                  filterableColumns={["type", "origin"]}
                  itemToString={(item) => {
                    if (!item) return "";
                    // Show type suffix for agents and MCP tools
                    let suffix = "";
                    if (item.isAgent) {
                      suffix = " (Agent)";
                    } else if (item.isMCP) {
                      suffix = ` (MCP: ${item.mcpServerName})`;
                    }
                    return `${item.name}${suffix}`;
                  }}
                  selectedItems={agent.selectedTools}
                  onChange={({ selectedItems }) => handleChange("selectedTools", selectedItems)}
                  disabled={toolsWithDisabledState.length === 0}
                  sortItems={(items) =>
                    items.sort((a, b) => {
                      if (a.disabled && !b.disabled) return 1;
                      if (!a.disabled && b.disabled) return -1;
                      return a.name.localeCompare(b.name);
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  id="agent-json-output-toggle"
                  checked={agent.useJsonOutput}
                  onCheckedChange={(checked) => handleChange("useJsonOutput", checked)}
                />
                <Label htmlFor="agent-json-output-toggle">JSON output</Label>
              </div>
            </div>

            {agent.useJsonOutput && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="agent-json-schema-toggle"
                      checked={agent.useJsonSchema}
                      onCheckedChange={(checked) => handleChange("useJsonSchema", checked)}
                    />
                    <Label htmlFor="agent-json-schema-toggle">JSON schema</Label>
                  </div>
                  {agent.useJsonSchema && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="agent-json-strict-toggle"
                        checked={agent.jsonSchemaStrict}
                        onCheckedChange={(checked) => handleChange("jsonSchemaStrict", checked)}
                      />
                      <Label htmlFor="agent-json-strict-toggle">Strict mode</Label>
                      <span className="text-xs text-muted-foreground">
                        {agent.jsonSchemaStrict
                          ? "JSON strictly follows schema"
                          : "Additional fields allowed in JSON"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {agent.useJsonOutput && agent.useJsonSchema && (
              <div className="space-y-2">
                <Label>JSON Schema (*)</Label>
                <JsonSchemaEditor
                  value={agent.jsonSchema}
                  onChange={(value) => handleChange("jsonSchema", value)}
                  height="150px"
                  placeholder='Enter JSON schema here... e.g. {"type": "object", "properties": {...}}'
                  showValidation={true}
                  invalid={agent.jsonSchema && !isJsonSchemaValid(agent.jsonSchema)}
                  invalidText={
                    !agent.jsonSchema?.trim()?.length
                      ? "JSON schema is required when 'Use JSON schema' is enabled"
                      : jsonSchemaError
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid() || !hasChanges || isImprovingPrompt}
            >
              {editMode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title="Improved Instructions Diff"
        oldValue={previousInstructions || ""}
        newValue={improvedInstructions || ""}
      />
    </>
  );
};

export default AgentModal;
