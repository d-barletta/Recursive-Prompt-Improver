import React from "react";
import { Button, Column, Dropdown, NumberInput } from "@carbon/react";
import { Save, Reset } from "@carbon/react/icons";
import { VALIDATION } from "@utils/constants";

const GlobalSettingsSection = ({
  settings,
  isLoading,
  hasUnsavedChanges,
  areGlobalSettingsAtDefault,
  onMaxTokensChange,
  onTimeLimitChange,
  onTemperatureChange,
  onMaxToolIterationsChange,
  onRestoreDefaultSettings,
}) => {
  return (
    <>
      <Column lg={16} md={8} sm={4}>
        <h5 className="settings-section-title--spaced">Global Settings</h5>
      </Column>

      <Column lg={8} md={4} sm={4}>
        <NumberInput
          id="max_tokens"
          label={`Max Tokens per call (${VALIDATION.MAX_TOKENS.MIN}-${VALIDATION.MAX_TOKENS.MAX})`}
          min={VALIDATION.MAX_TOKENS.MIN}
          max={VALIDATION.MAX_TOKENS.MAX}
          value={settings.max_tokens}
          onChange={onMaxTokensChange}
          className="formItem"
        />
      </Column>
      <Column lg={8} md={4} sm={4}>
        <NumberInput
          id="time_limit"
          label={`Time Limit (ms) per call (${VALIDATION.TIME_LIMIT.MIN}-${VALIDATION.TIME_LIMIT.MAX})`}
          min={VALIDATION.TIME_LIMIT.MIN}
          max={VALIDATION.TIME_LIMIT.MAX}
          value={settings.time_limit}
          onChange={onTimeLimitChange}
          className="formItem"
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        <Dropdown
          id="temperature"
          titleText="Temperature (0 = deterministic, 1 = creative)"
          items={["0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1"]}
          itemToString={(item) => (item === null || item === undefined ? "" : String(item))}
          selectedItem={String(settings.temperature)}
          onChange={({ selectedItem }) =>
            onTemperatureChange(null, { value: parseFloat(selectedItem) })
          }
          direction="top"
          className="formItem"
        />
      </Column>

      <Column lg={8} md={4} sm={4}>
        <NumberInput
          id="maxToolIterations"
          label={`Max Iterations (chat) (${VALIDATION.MAX_TOOL_ITERATIONS.MIN}-${VALIDATION.MAX_TOOL_ITERATIONS.MAX})`}
          min={VALIDATION.MAX_TOOL_ITERATIONS.MIN}
          max={VALIDATION.MAX_TOOL_ITERATIONS.MAX}
          step={VALIDATION.MAX_TOOL_ITERATIONS.STEP}
          value={settings.maxToolIterations}
          onChange={onMaxToolIterationsChange}
          className="formItem"
        />
      </Column>

      {/* Action Buttons */}

      <Column lg={16} md={16} sm={16} className="flex-gap-1rem-margin-top">
        <Button
          type="submit"
          size="md"
          renderIcon={Save}
          kind="primary"
          disabled={isLoading || !hasUnsavedChanges}
        >
          {isLoading ? "A session is running" : "Save"}
        </Button>
        <Button
          kind="ghost"
          size="md"
          renderIcon={Reset}
          onClick={onRestoreDefaultSettings}
          disabled={areGlobalSettingsAtDefault}
        >
          {"Restore default global settings"}
        </Button>
      </Column>
    </>
  );
};

export default GlobalSettingsSection;
