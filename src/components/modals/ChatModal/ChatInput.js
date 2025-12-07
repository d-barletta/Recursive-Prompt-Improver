import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Image as ImageIcon } from "lucide-react";
import { ROLES } from "@utils/constants";
import { SpeechTextArea } from "@components/shared";
import { useToast } from "@context/ToastContext";

const ChatInput = ({
  onSend,
  isLoading = false,
  messages = [],
  supportsVision = false,
  attachedImages = [],
  onOpenMediaUpload,
  onImageDrop,
  externalMessage,
  onExternalMessageClear,
}) => {
  const textareaRef = useRef(null);
  const [message, setMessage] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDragOver, setIsDragOver] = useState(false);

  const { showError } = useToast();

  // Handle external message updates (e.g., from "Copy to input" button)
  useEffect(() => {
    if (externalMessage != null) {
      setMessage(externalMessage);
      setHistoryIndex(-1);
      // Focus the textarea and clear the external message
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
        if (onExternalMessageClear) {
          onExternalMessageClear();
        }
      }, 0);
    }
  }, [externalMessage, onExternalMessageClear]);

  // Get user messages from history
  const userMessages = messages.filter((msg) => msg.role === ROLES.USER).map((msg) => msg.content);

  // Auto-grow textarea height
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  };

  const handleSend = () => {
    // Text message is required - images alone cannot be sent
    if (message.trim() && !isLoading) {
      onSend(message, attachedImages);
      setMessage("");
      setHistoryIndex(-1); // Reset history navigation
      // Keep focus on the textarea after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Handle history navigation with up/down arrows
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const textValue = textarea.value;
      const isAtStart = cursorPosition === 0;
      const isAtEnd = cursorPosition === textValue.length;
      const isEmpty = textValue.trim() === "";

      // Only navigate history if:
      // - Text is empty, OR
      // - We're currently navigating history (historyIndex >= 0), OR
      // - ArrowUp at the start of text, OR
      // - ArrowDown at the end of text
      const shouldNavigate =
        isEmpty ||
        historyIndex >= 0 ||
        (e.key === "ArrowUp" && isAtStart) ||
        (e.key === "ArrowDown" && isAtEnd);

      if (shouldNavigate && userMessages.length > 0) {
        e.preventDefault();

        if (e.key === "ArrowUp") {
          // Navigate backwards (older messages)
          const newIndex = historyIndex < userMessages.length - 1 ? historyIndex + 1 : historyIndex;
          if (newIndex !== historyIndex) {
            setHistoryIndex(newIndex);
            setMessage(userMessages[userMessages.length - 1 - newIndex]);
          }
        } else if (e.key === "ArrowDown") {
          // Navigate forwards (newer messages)
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setMessage(userMessages[userMessages.length - 1 - newIndex]);
          } else if (historyIndex === 0) {
            // Return to empty state
            setHistoryIndex(-1);
            setMessage("");
          }
        }
      }
    }
  };

  // Handle drag & drop for images
  const handleDragOver = (e) => {
    if (!supportsVision) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!supportsVision || !onImageDrop) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      showError("Invalid files", "Please drop image files only");
      return;
    }

    onImageDrop(imageFiles);
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  // Determine if send button should be disabled
  // Text message is always required (images alone cannot be sent)
  const hasText = message.trim().length > 0;
  const sendDisabled = isLoading || !hasText;

  return (
    <div
      className={`chat-input ${isDragOver ? "chat-input--drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {supportsVision && (
        <div className="chat-input__media-button">
          <Button
            variant="ghost"
            size="lg"
            onClick={onOpenMediaUpload}
            disabled={isLoading}
            className="relative"
          >
            <ImageIcon className="h-5 w-5" />
            {attachedImages.length > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {attachedImages.length}
              </Badge>
            )}
          </Button>
        </div>
      )}
      <SpeechTextArea
        ref={textareaRef}
        id="chat-input-textarea"
        labelText=""
        placeholder="Ask your agent..."
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          setHistoryIndex(-1); // Reset history when user types
        }}
        onKeyDown={handleKeyPress}
        rows={1}
        showError={showError}
      />
      <Button variant="ghost" size="lg" onClick={handleSend} disabled={sendDisabled}>
        <Send className="mr-2 h-5 w-5" />
        Send
      </Button>
    </div>
  );
};

export default ChatInput;
