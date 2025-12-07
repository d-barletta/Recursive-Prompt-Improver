import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/spinner";
import { RotateCcw, Maximize, Minimize } from "lucide-react";
import { isImproveDisabled } from "@utils/uiUtils";
import { CORE } from "@core/MAIN";

const OutputSection = ({
  isLoading,
  isFullscreen,
  logs,
  currentIteration,
  iterations,
  improveMode,
  outputLog,
  onToggleFullscreen,
  showError,
  showInfo,
  clearOutputFromLocalStorage,
  clearLogs,
  logger,
}) => {
  return (
    <div id="outputcontainer" className="space-y-4">
      <div className="status-column">
        {isLoading ? (
          <div className="loadingAndAbortContainer flex items-center gap-4">
            <LoadingSpinner
              description={
                isImproveDisabled(improveMode)
                  ? "Testing..."
                  : currentIteration
                    ? `Running iteration ${currentIteration} of ${iterations}`
                    : "Starting..."
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  CORE.stop();
                  logger("⛔ Operation stopped by user");
                } catch (e) {
                  console.error(e);
                  showError("Stop failed", e?.message || String(e));
                }
              }}
            >
              Stop
            </Button>
          </div>
        ) : null}
      </div>

      <hr className="my-4" />

      <div className="formGroup space-y-4">
        <div className="outputActionsContainer flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clearLogs();
              clearOutputFromLocalStorage();
              showInfo("Logs cleared", "Output logs have been cleared");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Logs
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Maximize className="mr-2 h-4 w-4" />}
            {isFullscreen ? "Minimize" : "Maximize"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="output">Logs</Label>
          <Textarea
            ref={outputLog}
            id="output"
            className={`outputTextarea font-mono text-sm ${isFullscreen ? "isFullsceen" : ""}`}
            placeholder="Logging will appear here..."
            rows={8}
            value={logs}
            readOnly
          />
        </div>
      </div>
    </div>
  );
};

export default OutputSection;
