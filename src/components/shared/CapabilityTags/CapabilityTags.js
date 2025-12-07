import React from "react";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Braces, Database, FileText, Wrench } from "lucide-react";

/**
 * CapabilityTags - Displays capability tags for models/agents
 * Provides consistent styling across the application
 *
 * @param {Object} props
 * @param {boolean} props.supportsTools - Whether tools/functions are supported
 * @param {boolean} props.supportsVision - Whether vision/image input is supported
 * @param {boolean} props.supportsJsonOutput - Whether JSON output mode is supported
 * @param {boolean} props.hasJsonSchema - Whether a JSON schema is defined (for agents)
 * @param {number} props.toolsCount - Number of tools (for agents, shows count instead of just "Tools")
 * @param {number} props.contextLength - Context length in tokens (optional)
 * @param {string} props.size - Tag size: "sm" or "md" (default: "sm")
 * @param {boolean} props.compactMode - If true, shows icons instead of text (default: false)
 * @param {string} props.className - Additional CSS class
 */
const CapabilityTags = ({
  supportsTools,
  supportsVision,
  supportsJsonOutput,
  hasJsonSchema,
  toolsCount,
  contextLength,
  size = "sm",
  compactMode = false,
  className = "",
}) => {
  // Determine if we should show tools tag
  const showTools = toolsCount > 0 || supportsTools;
  const iconSize = size === "sm" ? 12 : 16;

  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {showTools && (
        <Badge variant="secondary" title="Supports Tools" className="bg-purple-500/20 text-purple-300">
          {compactMode ? (
            <Wrench className="h-3 w-3" />
          ) : toolsCount > 0 ? (
            `${toolsCount} ${toolsCount === 1 ? "Tool" : "Tools"}`
          ) : (
            "Tools"
          )}
        </Badge>
      )}
      {supportsVision && (
        <Badge variant="secondary" title="Supports Vision" className="bg-red-500/20 text-red-300">
          {compactMode ? <ImageIcon className="h-3 w-3" /> : "Vision"}
        </Badge>
      )}
      {supportsJsonOutput && (
        <Badge variant="secondary" title="Supports JSON Output" className="bg-green-500/20 text-green-300">
          {compactMode ? <Braces className="h-3 w-3" /> : "JSON"}
        </Badge>
      )}
      {hasJsonSchema && (
        <Badge variant="secondary" title="Has JSON Schema" className="bg-pink-500/20 text-pink-300">
          {compactMode ? <Database className="h-3 w-3" /> : "Schema"}
        </Badge>
      )}
    </span>
  );
};

export default CapabilityTags;
