import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, RotateCcw } from "lucide-react";
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
    <div className="space-y-6">
      <h5 className="settings-section-title--spaced text-lg font-semibold">Global Settings</h5>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="formItem space-y-2">
          <Label htmlFor="max_tokens">
            Max Tokens per call ({VALIDATION.MAX_TOKENS.MIN}-{VALIDATION.MAX_TOKENS.MAX})
          </Label>
          <Input
            id="max_tokens"
            type="number"
            min={VALIDATION.MAX_TOKENS.MIN}
            max={VALIDATION.MAX_TOKENS.MAX}
            value={settings.max_tokens}
            onChange={(e) => onMaxTokensChange(null, { value: parseInt(e.target.value) || VALIDATION.MAX_TOKENS.MIN })}
          />
        </div>

        <div className="formItem space-y-2">
          <Label htmlFor="time_limit">
            Time Limit (ms) per call ({VALIDATION.TIME_LIMIT.MIN}-{VALIDATION.TIME_LIMIT.MAX})
          </Label>
          <Input
            id="time_limit"
            type="number"
            min={VALIDATION.TIME_LIMIT.MIN}
            max={VALIDATION.TIME_LIMIT.MAX}
            value={settings.time_limit}
            onChange={(e) => onTimeLimitChange(null, { value: parseInt(e.target.value) || VALIDATION.TIME_LIMIT.MIN })}
          />
        </div>

        <div className="formItem space-y-2">
          <Label htmlFor="temperature">Temperature (0 = deterministic, 1 = creative)</Label>
          <Select
            value={String(settings.temperature)}
            onValueChange={(value) => onTemperatureChange(null, { value: parseFloat(value) })}
          >
            <SelectTrigger id="temperature">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1"].map((temp) => (
                <SelectItem key={temp} value={temp}>
                  {temp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="formItem space-y-2">
          <Label htmlFor="maxToolIterations">
            Max Iterations (chat) ({VALIDATION.MAX_TOOL_ITERATIONS.MIN}-{VALIDATION.MAX_TOOL_ITERATIONS.MAX})
          </Label>
          <Input
            id="maxToolIterations"
            type="number"
            min={VALIDATION.MAX_TOOL_ITERATIONS.MIN}
            max={VALIDATION.MAX_TOOL_ITERATIONS.MAX}
            step={VALIDATION.MAX_TOOL_ITERATIONS.STEP}
            value={settings.maxToolIterations}
            onChange={(e) => onMaxToolIterationsChange(null, { value: parseInt(e.target.value) || VALIDATION.MAX_TOOL_ITERATIONS.MIN })}
          />
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <Button
          type="submit"
          size="md"
          disabled={isLoading || !hasUnsavedChanges}
        >
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "A session is running" : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={onRestoreDefaultSettings}
          disabled={areGlobalSettingsAtDefault}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Restore default global settings
        </Button>
      </div>
    </div>
  );
};

export default GlobalSettingsSection;
