import React from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Wand2, Undo, Redo, GitCompare } from "lucide-react";
import { SpeechTextArea } from "@components/shared";
import { useToast } from "@context/ToastContext";

/**
 * Reusable InstructionsEditor component for editing and improving instructions/prompts
 * Supports AI-powered improvements with undo/redo functionality and diff comparison
 *
 * @param {Object} props
 * @param {string} props.instructions - Current instructions text
 * @param {number} props.instructionsRows - Number of rows for textarea
 * @param {boolean} props.isLoading - Global loading state (disables all actions)
 * @param {boolean} props.isImprovingPrompt - Whether AI is currently improving
 * @param {boolean} props.hasProviders - Whether any providers are configured
 * @param {string|null} props.previousInstructions - Previous version before improvement
 * @param {string|null} props.improvedInstructions - AI-improved version
 * @param {Function} props.onInstructionsChange - Change handler for textarea
 * @param {Function} props.onInstructionsFocus - Focus handler for textarea
 * @param {Function} props.onInstructionsBlur - Blur handler for textarea
 * @param {Function} props.onImprove - Handler for improve/generate button
 * @param {Function} props.onUndo - Handler for undo button
 * @param {Function} props.onRedo - Handler for redo button
 * @param {Function} props.onCompare - Handler for compare button
 * @param {string} [props.id="instructions"] - ID for textarea element
 * @param {string} [props.labelText="Instructions (*)"] - Label text for textarea
 * @param {string} [props.placeholder="Enter instructions..."] - Placeholder text
 * @param {React.Ref} [props.textAreaRef] - Ref for textarea element
 */
const InstructionsEditor = ({
  instructions,
  instructionsRows,
  isLoading,
  isImprovingPrompt,
  hasProviders,
  previousInstructions,
  improvedInstructions,
  onInstructionsChange,
  onInstructionsFocus,
  onInstructionsBlur,
  onImprove,
  onUndo,
  onRedo,
  onCompare,
  id = "instructions",
  labelText = "Instructions (*)",
  placeholder = "Enter instructions (system prompt) here...",
  textAreaRef = null,
}) => {
  const { showError } = useToast();
  const isGenerating = !instructions.trim();
  const isAIImproved = improvedInstructions !== null && instructions === improvedInstructions;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between clearForm">
        {isImprovingPrompt ? (
          <LoadingSpinner
            description={isGenerating ? "Generating instructions..." : "Improving instructions..."}
          />
        ) : (
          <div className="flex items-center gap-2">
            {previousInstructions !== null && instructions === previousInstructions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRedo}
                disabled={isLoading || isImprovingPrompt}
              >
                <Redo className="mr-2 h-4 w-4" />
                Redo
              </Button>
            )}
            {previousInstructions !== null &&
              improvedInstructions !== null &&
              instructions !== previousInstructions && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCompare}
                  disabled={isLoading || isImprovingPrompt}
                >
                  <GitCompare className="mr-2 h-4 w-4" />
                  Compare
                </Button>
              )}
            {previousInstructions !== null && instructions !== previousInstructions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onUndo}
                disabled={isLoading || isImprovingPrompt}
              >
                <Undo className="mr-2 h-4 w-4" />
                Undo
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onImprove}
              disabled={isLoading || isImprovingPrompt || !hasProviders}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              {isGenerating ? "Generate" : "Improve"}
            </Button>
          </div>
        )}
      </div>

      <SpeechTextArea
        ref={textAreaRef}
        id={id}
        labelText={labelText}
        placeholder={placeholder}
        rows={instructionsRows}
        value={instructions}
        onChange={onInstructionsChange}
        onFocus={onInstructionsFocus}
        onBlur={onInstructionsBlur}
        disabled={isLoading || isImprovingPrompt}
        decorator={
          isAIImproved ? (
            <Card className="mt-2 border-primary">
              <CardContent className="p-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">AI Generated</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    These instructions were created or improved by AI.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Use the Compare button to view the original version.
                  </p>
                  <Button
                    onClick={onCompare}
                    disabled={isLoading || isImprovingPrompt}
                    variant="outline"
                    size="sm"
                  >
                    <GitCompare className="mr-2 h-4 w-4" />
                    Compare
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : undefined
        }
        showError={showError}
      />
    </div>
  );
};

export default InstructionsEditor;
