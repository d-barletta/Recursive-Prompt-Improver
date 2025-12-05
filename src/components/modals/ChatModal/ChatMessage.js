import React, { useState, useRef, useEffect } from "react";
import { ROLES } from "@utils/constants";
import { Tile, IconButton, Button } from "@carbon/react";
import { Copy, Cut, Restart, ChevronDown, ChevronUp, Warning } from "@carbon/icons-react";
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
          {isTruncated && (
            <span className="chat-message__truncated" title="Response was truncated due to max tokens limit">
              {" "}
              · <Warning size={12} /> Truncated
            </span>
          )}
        </div>
        <Tile className="chat-message__bubble">
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
                  kind="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="chat-message__expand-button"
                  renderIcon={isExpanded ? ChevronUp : ChevronDown}
                >
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
        </Tile>
        {/* Action buttons for user messages */}
        {isUser && (
          <div className="chat-message__actions">
            {!isFirstMessage && (
              <IconButton
                kind="ghost"
                size="sm"
                label="Keep from here"
                onClick={onKeepFromHere}
                disabled={isLoading}
                align="bottom"
              >
                <Cut />
              </IconButton>
            )}
            <IconButton
              kind="ghost"
              size="sm"
              label="Copy to input"
              onClick={onCopy}
              disabled={isLoading}
              align="bottom"
            >
              <Copy />
            </IconButton>
            <IconButton
              kind="ghost"
              size="sm"
              label={isLastMessage ? "Retry" : "Resend"}
              onClick={onRetry}
              disabled={isLoading}
              align="bottom"
            >
              <Restart />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
