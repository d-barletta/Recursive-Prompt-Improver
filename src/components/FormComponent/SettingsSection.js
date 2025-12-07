import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isImproveDisabled } from "@utils/uiUtils";
import { getToolsWithDisabledState } from "./FormComponent.utils";
import { MODEL_ITEMS } from "@utils/constants";
import { AdvancedMultiselect, AdvancedSelect } from "@components/shared";

const SettingsSection = ({
  tools,
  selectedTools,
  allAvailableModels,
  coreModel,
  iterations,
  improveMode,
  isLoading,
  onToolsChange,
  onModelChange,
  onIterationsChange,
  onImproveModeToggle,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="formGroup space-y-2">
        <AdvancedMultiselect
          direction="top"
          id="formTools"
          titleText="Tools & Agents"
          label="Select tools and agents"
          items={getToolsWithDisabledState(tools, selectedTools)}
          selectedItems={selectedTools}
          columns={["type", "origin"]}
          filterableColumns={["type", "origin"]}
          showProviderIcon
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
          onChange={({ selectedItems }) => onToolsChange(selectedItems)}
          disabled={isLoading || !tools?.length}
          sortItems={(items) =>
            items.sort((a, b) => {
              if (a.disabled && !b.disabled) return 1;
              if (!a.disabled && b.disabled) return -1;
              return a.name.localeCompare(b.name);
            })
          }
        />
      </div>

      <div className="formGroup space-y-2">
        <AdvancedSelect
          id="coreModel"
          titleText="Core Model"
          label="Select a model"
          items={allAvailableModels.length > 0 ? allAvailableModels : MODEL_ITEMS}
          selectedItem={coreModel}
          columns={["providerName", "capabilities"]}
          filterableColumns={["providerName"]}
          itemToString={(item) => (item ? item.text : "")}
          onChange={({ selectedItem }) => onModelChange(selectedItem)}
          disabled={isLoading || allAvailableModels.length === 0}
          showProviderIcon
        />
      </div>

      <div className="formGroup space-y-2">
        <Label htmlFor="iterations">Improver iterations</Label>
        <Input
          id="iterations"
          type="number"
          min={1}
          max={100}
          value={!isImproveDisabled(improveMode) ? iterations : 1}
          onChange={(e) => onIterationsChange(parseInt(e.target.value) || 1)}
          disabled={isLoading || isImproveDisabled(improveMode)}
        />
      </div>

      <div className="formGroup space-y-2">
        <Label htmlFor="improveMode">Improve Mode</Label>
        <div className="flex items-center space-x-2 pt-2">
          <span className="text-sm text-muted-foreground">Test only</span>
          <Switch
            id="improveMode"
            checked={!isImproveDisabled(improveMode)}
            onCheckedChange={onImproveModeToggle}
            disabled={isLoading}
          />
          <span className="text-sm text-muted-foreground">Improve and test</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
