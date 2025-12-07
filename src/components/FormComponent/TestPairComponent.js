import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/spinner";
import {
  MessageSquare,
  Copy,
  FileJson,
  Settings,
  Trash2,
  Wrench,
  Info,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  Copy as CopyIcon,
  X,
} from "lucide-react";
import { CHECK_TYPES, MAX_NUM_TESTS } from "@utils/constants";
import { buildDetailedTooltipContent } from "./FormComponent.utils";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";

const TestPairComponent = ({
  pair,
  index,
  isLoading,
  isImprovingPrompt,
  isFillingOutput,
  testPairRowFocused,
  totalPairs,
  lastSessionScore,
  onInputChange,
  onOutputChange,
  onInputFocus,
  onInputBlur,
  onOutputFocus,
  onOutputBlur,
  onSettingsClick,
  onFillOutput,
  onDuplicate,
  onRemove,
  onRemoveCheckType,
  onRemoveJsonSchema,
  onRemoveContext,
  onRemoveKnowledgeBases,
  onRemoveImages,
  onRemoveModel,
}) => {
  return (
    <div className="w-full padding-0-0-08rem" key={index}>
      <div className="space-y-4">
        <div className="testAboveActionsContainer">
          <div className={"testLastScoreContainer"}>
            {!!lastSessionScore && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="tooltip-icon-button"
                      tabIndex={-1}
                      aria-label="Last session score details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent align="start">
                    <div className="space-y-1">
                      {buildDetailedTooltipContent(lastSessionScore)?.map((l, j) => (
                        <div key={j}>{l}</div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className={"testSettingsContainer flex items-center gap-2"}>
            {pair.settings.checkTypes.includes(CHECK_TYPES.TOOLS_CALL.id) && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1"
                title="Verify tools call"
              >
                <Wrench className="h-3 w-3" />
                {pair.settings?.toolsCalled?.length || ""}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveCheckType(index, CHECK_TYPES.TOOLS_CALL.id);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {pair.settings.checkTypes.includes(CHECK_TYPES.JSON_VALID.id) && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1 bg-green-900/50"
                title="Json valid"
              >
                <FileJson className="h-3 w-3" />
                ✓
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveCheckType(index, CHECK_TYPES.JSON_VALID.id);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {pair.settings.checkTypes.includes(CHECK_TYPES.JSON_VALID.id) &&
              pair.settings.useJsonSchema &&
              pair.settings.jsonSchema && (
                <Badge
                  variant="secondary"
                  className="appliedContextTag flex items-center gap-1 pr-1 bg-pink-900/50"
                  title="Json schema validation"
                >
                  <FileJson className="h-3 w-3" />
                  S
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onRemoveJsonSchema(index);
                    }}
                    className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            {pair.settings.context && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1 bg-cyan-900/50"
                title="Context"
              >
                <MessageSquare className="h-3 w-3" />
                C
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveContext(index);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {pair.settings.knowledgeBases && pair.settings.knowledgeBases.length > 0 && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1"
                title={`Knowledge Bases: ${pair.settings.knowledgeBases.map((kb) => kb.name).join(", ")}`}
              >
                <BookOpen className="h-3 w-3" />
                {pair.settings.knowledgeBases.length}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveKnowledgeBases(index);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {pair.settings.images && pair.settings.images.length > 0 && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1 bg-teal-900/50"
                title={`Images: ${pair.settings.images.map((img) => img.name).join(", ")}`}
              >
                <ImageIcon className="h-3 w-3" />
                {pair.settings.images.length}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveImages(index);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {pair.settings.model && (
              <Badge
                variant="secondary"
                className="appliedContextTag flex items-center gap-1 pr-1"
                title={`Model: ${pair.settings.model.text || pair.settings.model.id}`}
              >
                <ProviderIcon
                  providerId={pair.settings.model.providerId}
                  size={14}
                  className="padding-top-3px inverse"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onRemoveModel(index);
                  }}
                  className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSettingsClick(index)}
              disabled={isLoading}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDuplicate(index)}
              disabled={isLoading || totalPairs >= MAX_NUM_TESTS}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              disabled={isLoading || totalPairs < 2}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="textAreasContainer">
          <div className="testIn">
            <Textarea
              id={`in-${index}`}
              placeholder="Enter test input here..."
              rows={testPairRowFocused === index ? 6 : 1}
              value={pair.in}
              onChange={(e) => onInputChange(index, e.target.value)}
              onFocus={() => onInputFocus(index)}
              onBlur={() => onInputBlur()}
              disabled={isLoading || isFillingOutput}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Test input {index + 1} {index === 0 ? "(*)" : ""}
            </div>
          </div>
          <div className="autoFillOutput">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFillOutput(index);
              }}
              disabled={isLoading || isImprovingPrompt || isFillingOutput || !pair.in.trim()}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
          <div className="testOut">
            <Textarea
              id={`out-${index}`}
              placeholder={
                isFillingOutput ? "Generating output..." : "Enter expected output here..."
              }
              rows={testPairRowFocused === index ? 6 : 1}
              value={pair.out}
              onChange={(e) => onOutputChange(index, e.target.value)}
              onFocus={() => onOutputFocus(index)}
              onBlur={() => onOutputBlur()}
              disabled={
                isLoading ||
                isFillingOutput ||
                pair.settings.checkTypes.includes(CHECK_TYPES.TOOLS_CALL.id)
              }
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {isFillingOutput ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Generating output...
                </span>
              ) : pair.settings.checkTypes.includes(CHECK_TYPES.TOOLS_CALL.id) ? (
                `Test is checking tool calls, output is not needed`
              ) : (
                `Expected output ${index + 1}`
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPairComponent;
