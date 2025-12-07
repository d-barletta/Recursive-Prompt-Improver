import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Play, Bot, MessageSquare, RotateCcw } from "lucide-react";
import { isImproveDisabled, isFormValid, truncateText } from "@utils/uiUtils";

const ActionsSection = ({
  settings,
  formData,
  isLoading,
  isImprovingPrompt,
  fillingOutputIndex,
  error,
  onChat,
  onSaveAsAgent,
  onClearForm,
  onNavigate,
}) => {
  if (isLoading) return null;

  return (
    <div className="button-column space-y-4">
      {isFormValid(settings, formData) ? (
        <Button
          type="submit"
          variant="default"
          size="md"
          disabled={
            isLoading ||
            !isFormValid(settings, formData) ||
            isImprovingPrompt ||
            fillingOutputIndex !== null
          }
        >
          <Play className="mr-2 h-4 w-4" />
          {isLoading
            ? "Running..."
            : isImproveDisabled(formData?.improveMode)
              ? "Test only"
              : "Improve and Test"}
        </Button>
      ) : (
        <>
          {error?.length ? (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <h4 className="font-semibold text-destructive">Error</h4>
              <p className="text-sm text-destructive">{truncateText(error, 200)}</p>
            </div>
          ) : !settings.providers?.length ? (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Provider Required</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">Please add at least one provider.</p>
              <Button size="sm" variant="outline" onClick={() => onNavigate("/settings")}>
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Important</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">Fill in all required fields to test</p>
            </div>
          )}
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="md"
            disabled={isLoading || isImprovingPrompt || fillingOutputIndex !== null}
          >
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={onChat}
            disabled={!settings?.providers?.length || !formData.instructions?.length}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSaveAsAgent}
            disabled={!settings?.providers?.length || !formData.instructions?.length}
          >
            <Bot className="mr-2 h-4 w-4" />
            Save as agent
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClearForm} className="text-destructive">
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Form
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ActionsSection;
