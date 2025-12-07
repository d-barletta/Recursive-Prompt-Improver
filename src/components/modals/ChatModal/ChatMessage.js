import React, { useState, useRef, useEffect } from "react";
import { ROLES } from "@utils/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Scissors, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import MarkdownContent from "@components/shared/MarkdownContent";
import { openHtmlPreview } from "@utils/internalBrowser";

const ChatMessage = ({
  role,
  content,
  images,
  toolCalls,
  toolName,
  avgTokens,
  ragResultsCount,
  finishReason,
  isLastMessage,
  isFirstMessage,
  onKeepFromHere,
  onCopy,
  onRetry,
  isLoading,
}) => {
  const isUser = role === ROLES.USER;
  const isTool = role === ROLES.TOOL;
  const isAssistant = role === ROLES.ASSISTANT;
  const isTruncated = finishReason === "length";

  // State for tool message expand/collapse
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpand, setNeedsExpand] = useState(false);
  const toolContentRef = useRef(null);

  // Check if tool content exceeds max height
  useEffect(() => {
    if (isTool && toolContentRef.current) {
      const maxHeight = 150; // matches CSS max-height
      setNeedsExpand(toolContentRef.current.scrollHeight > maxHeight);
    }
  }, [isTool, content]);

  // Handle image preview click
  const handleImageClick = (image, idx) => {
    const imageSrc = image.dataUrl || image.url;
    const imageAlt = image.name || `Image ${idx + 1}`;
    const htmlContent = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; padding: 20px;">
        <img src="${imageSrc}" alt="${imageAlt}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
      </div>
    `;
    openHtmlPreview(htmlContent, { title: imageAlt, width: 1024, height: 768 });
  };

  // Format role display name
  const getRoleDisplay = () => {
    if (isUser) return "You";
    if (isTool) return toolName ? `Tool (${toolName})` : "Tool";
    if (isAssistant) return "Assistant";
    return role;
  };

  // Helper to safely parse JSON
  const safeParseJSON = (jsonString) => {
    try {
      // console.log(jsonString);
      return JSON.stringify(jsonString, null, 2);
    } catch {
      return `${jsonString}`;
    }
  };

  return (
    <div className={`chat-message ${isUser ? "chat-message--user" : "chat-message--assistant"}`}>
      <div className="chat-message__content">
        <div className="chat-message__role">
          {getRoleDisplay()}
          {isAssistant && toolCalls?.length > 0 ? " (Tool calls)" : ""}
          {isUser && ragResultsCount > 0 && (
            <span className="chat-message__rag-info"> · {ragResultsCount} Knowledge results</span>
          )}
          {isUser && images?.length > 0 && (
            <span className="chat-message__images-info">
              {" "}
              · {images.length} img{images.length > 1 ? "s" : ""}
            </span>
          )}
          {!!avgTokens && (
            <span className="chat-message__tokens"> · {avgTokens.toLocaleString()} tokens</span>
          )}
        </div>
        <Card className="chat-message__bubble">
          {/* Display image previews if present */}
          {images && images.length > 0 && (
            <div className="chat-message__images">
              {images
                .filter((image) => image.dataUrl || image.url)
                .map((image, idx) => (
                  <img
                    key={idx}
                    src={image.dataUrl || image.url}
                    alt={image.name || `Image ${idx + 1}`}
                    className="chat-message__image-preview"
                    onClick={() => handleImageClick(image, idx)}
                    style={{ cursor: "pointer" }}
                  />
                ))}
            </div>
          )}
          {isTool ? (
            <div className="chat-message__tool-content-wrapper">
              <div
                ref={toolContentRef}
                className={`chat-message__tool-content ${isExpanded ? "chat-message__tool-content--expanded" : ""}`}
              >
                <MarkdownContent content={content || "_No content_"} />
              </div>
              {needsExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="chat-message__expand-button"
                >
                  {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                  {isExpanded ? "Collapse" : "See more"}
                </Button>
              )}
            </div>
          ) : isUser || (isAssistant && toolCalls?.length > 0) ? (
            content
          ) : (
            <MarkdownContent content={content || "_No content_"} />
          )}
          {isAssistant && toolCalls?.length > 0 && (
            <div className="chat-message__tool-calls">
              {toolCalls.map((toolCall, idx) => (
                <div key={idx} className="chat-message__tool-call">
                  <strong>{toolCall.function?.name || "Unknown"}</strong>
                  {toolCall.function?.arguments && (
                    <pre className="chat-message__tool-arguments">
                      {safeParseJSON(toolCall.function.arguments)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        {isTruncated && (
          <div className="chat-message__actions">
            <span
              className="chat-message__truncated flex items-center gap-1"
              title="Response was truncated due to max tokens limit"
            >
              <AlertTriangle className="h-3 w-3" /> Truncated due to max tokens limit
            </span>
          </div>
        )}
        {/* Action buttons for user messages */}
        {isUser && (
          <TooltipProvider>
            <div className="chat-message__actions">
              {!isFirstMessage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onKeepFromHere}
                      disabled={isLoading}
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Keep from here</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCopy}
                    disabled={isLoading}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to input</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isLastMessage ? "Retry" : "Resend"}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
