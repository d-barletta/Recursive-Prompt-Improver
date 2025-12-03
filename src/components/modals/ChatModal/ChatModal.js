import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Modal, Button, InlineLoading, Dropdown, MultiSelect } from "@carbon/react";
import { TrashCan, FolderOpen, Play, Save, Book, NotebookReference } from "@carbon/icons-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import UploadModal from "@components/modals/UploadModal";
import { ROLES } from "@utils/constants";
import { useToast } from "@context/ToastContext";
import { useConfirm } from "@context/ConfirmContext";
import { useSettings } from "@context/SettingsContext";
import {
  saveContext,
  loadContexts,
  loadTools,
  loadAgents,
  loadAllMCPTools,
  loadKnowledgeBases,
} from "@utils/storageUtils";
import { simpleHash, convertAgentsToTools } from "@utils/uiUtils";
import { executeConversationalLoopWithAgents } from "@utils/conversationUtils";
import { CORE } from "@core/MAIN";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";
import { RAG } from "@core/RAG";
import { getDefaultEmbeddingModel } from "@components/FormComponent/FormComponent.utils";
import { resizeImage, estimateImageTokens } from "@utils/fileUtils";

const ChatModal = ({ isOpen, onClose, formData, onUpdateMessages, modalTitle }) => {
  const [messages, setMessages] = useState(formData?.chatMessages || []);
  const [partialMessRole, setPartialMessRole] = useState(ROLES.ASSISTANT);
  const [partialMess, setPartialMess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isContextSaved, setIsContextSaved] = useState(false);
  const [availableTools, setAvailableTools] = useState([]);
  const [availableAgents, setAvailableAgents] = useState([]);
  const [availableContexts, setAvailableContexts] = useState([]);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [showKnowledgeBaseSelect, setShowKnowledgeBaseSelect] = useState(false);
  const [showMaxIterationsPrompt, setShowMaxIterationsPrompt] = useState(false);
  const [pendingContinuation, setPendingContinuation] = useState(null);
  const [availableKnowledgeBases, setAvailableKnowledgeBases] = useState([]);
  const [selectedKnowledgeBases, setSelectedKnowledgeBases] = useState([]);
  // Media upload state
  const [attachedImages, setAttachedImages] = useState([]);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  // External message state for "Copy to input" action
  const [externalMessage, setExternalMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const abortControllerRef = useRef(null);
  const isInitialMount = useRef(true);
  const isUpdatingFromParent = useRef(false);
  const lastScrollTime = useRef(0);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const { showSuccess, showError, showWarning } = useToast();
  const { confirm } = useConfirm();
  const { settings } = useSettings();

  /**
   * Calculate average tokens for a message content
   * @param {string} content - The message content
   * @returns {Promise<number>} - Average token count
   */
  const calculateAvgTokens = useCallback(async (content) => {
    if (!content) return 0;
    try {
      const result = await CORE.countTokensAverage(content);
      return result.averageTokenCount || 0;
    } catch (error) {
      console.error("Error calculating tokens:", error);
      return 0;
    }
  }, []);

  /**
   * Add avgTokens to messages that don't have them
   * Processes messages sequentially to avoid overwhelming the tokenizer
   * @param {Array} msgs - Array of messages
   * @returns {Promise<Array>} - Messages with avgTokens added
   */
  const addTokensToMessages = useCallback(
    async (msgs) => {
      const updatedMessages = [];
      for (const msg of msgs) {
        // Skip if already has avgTokens
        if (msg.avgTokens !== undefined) {
          updatedMessages.push(msg);
        } else {
          // Calculate tokens for the message content
          const avgTokens = await calculateAvgTokens(msg.content);
          updatedMessages.push({ ...msg, avgTokens });
        }
      }
      return updatedMessages;
    },
    [calculateAvgTokens],
  );

  /**
   * Handle message update from conversational loop
   * Immediately sets messages for UI, then calculates tokens for new messages
   * @param {Array} updatedMessages - Updated messages array
   * @param {Function} [transformFn] - Optional function to transform messages before setting
   */
  const handleMessageUpdate = useCallback(
    async (updatedMessages, transformFn = null) => {
      // Apply any transformations first
      const messagesForUi = transformFn ? transformFn(updatedMessages) : updatedMessages;

      // Immediately update UI with messages (some may not have tokens yet)
      setMessages(messagesForUi);
      setPartialMess("");
      setPartialMessRole(ROLES.ASSISTANT);

      // Find messages without avgTokens and calculate them
      const messagesNeedingTokens = messagesForUi.filter((msg) => msg.avgTokens === undefined);
      if (messagesNeedingTokens.length > 0) {
        // Calculate tokens for messages that need them
        const messagesWithTokens = await addTokensToMessages(messagesForUi);
        // Update with token counts
        setMessages(messagesWithTokens);
      }
    },
    [addTokensToMessages],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    // Check if user is within 50px of the bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < 50;
  };

  const handleScroll = () => {
    // Immediately disable auto-scroll when user starts scrolling
    shouldAutoScrollRef.current = false;
    isUserScrollingRef.current = true;

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // After scrolling stops for 100ms, check if we should re-enable auto-scroll
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;

      if (isAtBottom()) {
        // User scrolled back to bottom, re-enable auto-scroll
        shouldAutoScrollRef.current = true;
      }
      // If not at bottom, keep auto-scroll disabled (already set above)
    }, 30);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const handleContinueExecution = async () => {
    if (!pendingContinuation) return;

    setShowMaxIterationsPrompt(false);
    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      // Continue from where it stopped with same context
      const result = await executeConversationalLoopWithAgents({
        ...pendingContinuation,
        initialMessages: pendingContinuation.messages,
        userMessage: null, // null to continue from last state without adding new message
        ROLES,
        maxIterations: settings.maxToolIterations || 5,
        jsonSchema: formData.useJsonSchema ? formData.jsonSchema : undefined,
        jsonStrict: formData.jsonSchemaStrict,
        onMessageUpdate: (updatedMessages) => {
          handleMessageUpdate(updatedMessages);
        },
        onStreamChunk: (deltaMess, role) => {
          setPartialMessRole(role || ROLES.ASSISTANT);
          setPartialMess((currMess) => currMess + deltaMess);
        },
        settings,
        abortSignal: abortControllerRef.current.signal,
      });

      if (!result.success && result.error === "Maximum tool execution iterations reached") {
        // Max iterations reached again, show prompt again
        showWarning("Max iteration reached again", result.error);
        setShowMaxIterationsPrompt(true);
        setPendingContinuation({
          ...pendingContinuation,
          messages: result.messages, // Use messages from result, not state
        });
      } else if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error continuing execution:", error);
      if (error?.message !== "Conversation aborted by user") {
        showError("Chat Error", error?.message || String(error));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelContinuation = () => {
    setShowMaxIterationsPrompt(false);
    setPendingContinuation(null);
  };

  // Refresh agent's selected tools with fresh references from availableTools and availableAgents
  // This ensures MCP tools have fresh isMCP, mcpServerId properties for execution
  // and agents (selected as tools) are properly included
  const refreshSelectedTools = (filteredAgents) => {
    const selectedToolIds = new Set((formData.selectedTools || []).map((t) => t.id));
    // Combine tools with agents converted to tool format to search from
    const convertedAgents = convertAgentsToTools(filteredAgents, formData?.id);
    const allAvailable = [...availableTools, ...convertedAgents];
    return allAvailable.filter((tool) => selectedToolIds.has(tool.id));
  };

  const handleSendMessage = async (content, images = []) => {
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    // Filter out current agent from availableAgents to prevent self-reference
    const currentAgentId = formData?.id;
    const filteredAvailableAgents = currentAgentId
      ? availableAgents.filter((agent) => agent.id !== currentAgentId)
      : availableAgents;

    // Refresh selected tools with fresh references (ensures MCP tools have correct properties
    // and agents selected as tools are properly included)
    const refreshedTools = refreshSelectedTools(filteredAvailableAgents);

    // Clear attached images after sending
    setAttachedImages([]);

    try {
      // Get RAG context if knowledge bases are selected
      let ragContext = null;
      let ragResultsCount = 0;

      if (selectedKnowledgeBases.length > 0) {
        const embeddingModel = getDefaultEmbeddingModel(
          settings.providers,
          settings.defaultProviderId,
        );

        if (embeddingModel) {
          const kbIds = selectedKnowledgeBases.map((kb) => kb.id);
          const ragResult = await RAG.getRAGContext(
            content,
            kbIds,
            embeddingModel.id,
            embeddingModel.providerId,
            {
              topK: RAG.RAG_CONFIG.TOP_K,
              minSimilarity: RAG.RAG_CONFIG.MIN_SIMILARITY,
              abortSignal: abortControllerRef.current.signal,
            },
          );

          if (ragResult.context) {
            ragContext = ragResult.context;
            ragResultsCount = ragResult.chunks?.length || 0;
          }
        }
      }

      // Prepend RAG context to user message if available
      let enrichedContent = content;
      let enrichedContentTokens = null;
      if (ragContext) {
        enrichedContent = RAG.formatRAGContextMessage(ragContext, ragResultsCount, content);
        // Calculate tokens for enriched content (includes RAG context)
        enrichedContentTokens = await calculateAvgTokens(enrichedContent);
      }

      // Calculate image tokens and add to total
      let imageTokens = 0;
      if (images.length > 0) {
        imageTokens = images.reduce((total, img) => {
          if (img.width && img.height) {
            return total + estimateImageTokens({ width: img.width, height: img.height });
          }
          return total;
        }, 0);
        // Add image tokens to enriched content tokens (or calculate base content tokens first)
        if (enrichedContentTokens) {
          enrichedContentTokens += imageTokens;
        } else {
          enrichedContentTokens = (await calculateAvgTokens(content)) + imageTokens;
        }
      }

      // Execute conversational loop with tool and agent support
      const result = await executeConversationalLoopWithAgents({
        systemPrompt: formData.instructions,
        userMessage: enrichedContent,
        images: images, // Pass attached images
        modelId: formData.coreModel?.id,
        providerId: formData.coreModel?.providerId,
        initialMessages: messages,
        tools: refreshedTools,
        availableTools,
        availableAgents: filteredAvailableAgents,
        ROLES,
        maxIterations: settings.maxToolIterations || 5,
        jsonSchema: formData.useJsonSchema ? formData.jsonSchema : undefined,
        jsonStrict: formData.jsonSchemaStrict,
        onMessageUpdate: (updatedMessages) => {
          // Transform function to replace user message content with original (without RAG context)
          // but keep track of RAG results count, images, and use enriched content token count
          const transformFn = (msgs) => {
            const originalUserMsgCount = messages.filter((m) => m.role === ROLES.USER).length;
            let userMsgIndex = 0;

            return msgs.map((msg) => {
              if (msg.role === ROLES.USER) {
                userMsgIndex++;
                // This is the new user message (first user message beyond original count)
                if (userMsgIndex === originalUserMsgCount + 1) {
                  return {
                    ...msg,
                    content: content, // Show original message
                    images: images.length > 0 ? images : undefined, // Include images if present
                    ragResultsCount: ragResultsCount > 0 ? ragResultsCount : undefined, // Track RAG results
                    avgTokens: enrichedContentTokens || msg.avgTokens, // Use token count from enriched content
                  };
                }
              }
              return msg;
            });
          };
          handleMessageUpdate(updatedMessages, transformFn);
        },
        onStreamChunk: (deltaMess, role) => {
          setPartialMessRole(role || ROLES.ASSISTANT);
          setPartialMess((currMess) => currMess + deltaMess);
        },
        settings,
        abortSignal: abortControllerRef.current.signal,
      });

      // Handle max iterations before throwing error so we can access result.messages
      if (!result.success && result.error === "Maximum tool execution iterations reached") {
        showWarning("Max iteration reached", result.error);
        // Show continuation prompt with updated messages from result
        setShowMaxIterationsPrompt(true);
        setPendingContinuation({
          systemPrompt: formData.instructions,
          modelId: formData.coreModel?.id,
          providerId: formData.coreModel?.providerId,
          messages: result.messages, // Use messages from result, not state
          tools: refreshedTools, // Use refreshed tools with MCP properties
          availableTools,
          availableAgents: filteredAvailableAgents,
        });
      } else if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Don't show error toast if user aborted
      if (error?.message !== "Conversation aborted by user") {
        showError("Chat Error", error?.message || String(error));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCreateContext = async () => {
    try {
      if (messages.length === 0) {
        showError("No messages", "Cannot save conversation from empty chat");
        return;
      }

      // Create context name from first user message
      const firstUserMessage = messages.find((m) => m.role === ROLES.USER);
      const contextName = firstUserMessage
        ? `Chat: ${firstUserMessage.content.substring(0, 30)}...`
        : "Chat Conversation";

      // Transform messages to context format (include avgTokens and images)
      const contextMessages = messages.map((msg) => ({
        role: msg.role,
        message: msg.content,
        toolId: msg.toolId || "",
        toolName: msg.toolName || "",
        toolCalls: msg.toolCalls || [],
        avgTokens: msg.avgTokens,
        images: msg.images || [],
      }));

      // Generate hash from instructions
      const instructionHash = simpleHash(formData.instructions || "");

      const newContext = {
        name: contextName,
        messages: contextMessages,
        instructionHash: instructionHash,
      };

      await saveContext(newContext);

      const actionText = isContextSaved ? "updated" : "saved";
      showSuccess(
        "Conversation Saved",
        `Conversation "${contextName}" has been ${actionText} successfully`,
      );

      setIsContextSaved(true);

      // Reload contexts to update the dropdown
      const contexts = await loadContexts();
      setAvailableContexts(contexts);
    } catch (error) {
      console.error("Error saving conversation:", error);
      showError("Save Failed", error?.message || String(error));
    }
  };

  const handleClearChat = async () => {
    const confirmed = await confirm({
      title: "Clear Chat",
      body: "Are you sure you want to clear all chat messages? This action cannot be undone.",
      confirmText: "Clear",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) {
      return;
    }

    setMessages([]);
    setIsContextSaved(false);
    showSuccess("Chat Cleared", "All chat messages have been cleared");
  };

  const handleLoadContext = (context) => {
    if (!context) return;

    try {
      // Transform context messages to chat format (include avgTokens)
      const chatMessages = context.messages.map((msg) => ({
        role: msg.role,
        content: msg.message,
        toolId: msg.toolId || "",
        toolName: msg.toolName || "",
        toolCalls: msg.toolCalls || [],
        avgTokens: msg.avgTokens,
      }));

      setMessages(chatMessages);
      setIsContextSaved(true);
      setShowContextDropdown(false);
      showSuccess(
        "Conversation Loaded",
        `Conversation "${context.name}" has been loaded successfully`,
      );
    } catch (error) {
      console.error("Error loading conversation:", error);
      showError("Load Failed", error?.message || String(error));
    }
  };

  /**
   * Handle "Keep from here" action - removes all messages before the specified index
   * @param {number} messageIndex - Index of the message to keep from
   */
  const handleKeepFromHere = useCallback(
    async (messageIndex) => {
      const confirmed = await confirm({
        title: "Keep From Here",
        body: "This will delete all messages before this one. This action cannot be undone. Are you sure?",
        confirmText: "Keep from here",
        cancelText: "Cancel",
        variant: "warning",
      });

      if (!confirmed) {
        return;
      }

      const newMessages = messages.slice(messageIndex);
      setMessages(newMessages);
      setIsContextSaved(false);
      showSuccess("Messages Removed", "Previous messages have been deleted");
    },
    [confirm, messages, showSuccess],
  );

  /**
   * Handle "Copy to input" action - fills the chat input with the message content
   * @param {string} content - The message content to copy to input
   */
  const handleCopyToInput = useCallback((content) => {
    setExternalMessage(content);
  }, []);

  /**
   * Handle "Retry" action - resends or re-runs a user message
   * @param {number} messageIndex - Index of the message to retry
   * @param {string} content - The message content to retry
   * @param {Array} images - Images attached to the original message (if any)
   * @param {boolean} isLastMessage - Whether this is the last message in the conversation
   */
  const handleRetryMessage = useCallback(
    async (messageIndex, content, images, isLastMessage) => {
      if (isLastMessage) {
        // For the last message, remove it and its response (if exists), then resend
        // Find the user message and any following assistant/tool messages
        let endIndex = messageIndex + 1;
        while (endIndex < messages.length && messages[endIndex].role !== ROLES.USER) {
          endIndex++;
        }
        // Remove the user message and all following non-user messages
        const newMessages = messages.slice(0, messageIndex);
        setMessages(newMessages);
        // Resend the message
        setTimeout(() => {
          handleSendMessage(content, images || []);
        }, 100);
      } else {
        // For non-last messages, just send a copy without modifying the conversation
        handleSendMessage(content, images || []);
      }
    },
    [messages, handleSendMessage],
  );

  /**
   * Clear external message after it's been used
   */
  const handleExternalMessageClear = useCallback(() => {
    setExternalMessage(null);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Add scroll event listener
    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      // Clean up timeout on unmount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchToolsAndAgents = async () => {
      if (isOpen) {
        const tools = await loadTools();
        const mcpTools = await loadAllMCPTools();
        setAvailableTools([...tools, ...mcpTools]); // Combine regular tools and MCP tools
        const agents = await loadAgents();
        setAvailableAgents(agents);
      }
    };
    fetchToolsAndAgents();
  }, [isOpen]);

  useEffect(() => {
    const fetchKnowledgeBases = async () => {
      if (isOpen) {
        const knowledgeBases = await loadKnowledgeBases();
        // Filter to only indexed knowledge bases
        const indexedKBs = knowledgeBases.filter((kb) => RAG.isIndexed(kb));
        setAvailableKnowledgeBases(indexedKBs);
      }
    };
    fetchKnowledgeBases();
  }, [isOpen]);

  useEffect(() => {
    const fetchContexts = async () => {
      if (isOpen) {
        const contexts = await loadContexts();
        setAvailableContexts(contexts);
      }
    };
    fetchContexts();
  }, [isOpen]);

  useEffect(() => {
    const checkContextExists = async () => {
      if (isOpen && formData?.instructions) {
        const instructionHash = simpleHash(formData.instructions);
        const contexts = await loadContexts();
        const exists = contexts.some((ctx) => ctx.instructionHash === instructionHash);
        setIsContextSaved(exists);
      }
    };
    checkContextExists();
  }, [isOpen, formData?.instructions]);

  useEffect(() => {
    if (isOpen && formData?.chatMessages) {
      isUpdatingFromParent.current = true;
      setMessages(formData.chatMessages);
      // Reset flag after state update completes
      setTimeout(() => {
        isUpdatingFromParent.current = false;
      }, 0);
    }
  }, [isOpen, formData?.chatMessages]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Don't update parent if we're currently updating from parent
    if (isUpdatingFromParent.current) {
      // Always scroll to bottom when loading messages from parent
      shouldAutoScrollRef.current = true;
      scrollToBottom();
      return;
    }
    if (onUpdateMessages && JSON.stringify(messages) !== JSON.stringify(formData?.chatMessages)) {
      onUpdateMessages(messages);
    }
    // Only auto-scroll if user is at the bottom
    if (shouldAutoScrollRef.current) {
      scrollToBottom();
    }
  }, [messages, onUpdateMessages, formData?.chatMessages, showMaxIterationsPrompt]);

  // Separate effect for partialMess changes with throttled scrolling
  useEffect(() => {
    if (partialMess && shouldAutoScrollRef.current) {
      const now = Date.now();
      if (now - lastScrollTime.current >= 100) {
        scrollToBottom();
        lastScrollTime.current = now;
      }
    }
  }, [partialMess]);

  // Calculate tokens for messages that don't have them (after loading completes)
  useEffect(() => {
    const addTokensIfMissing = async () => {
      // Only run when not loading and we have messages
      if (isLoading || messages.length === 0) return;

      // Check if any message is missing avgTokens
      const hasMissingTokens = messages.some((msg) => msg.avgTokens === undefined);
      if (!hasMissingTokens) return;

      // Add tokens to messages that don't have them
      const updatedMessages = await addTokensToMessages(messages);

      // Update only if tokens were actually added (hasMissingTokens already checked this)
      isUpdatingFromParent.current = true;
      setMessages(updatedMessages);
      setTimeout(() => {
        isUpdatingFromParent.current = false;
      }, 0);
    };

    addTokensIfMissing();
  }, [isLoading, messages, addTokensToMessages]);

  // Calculate total tokens for the entire conversation
  const totalTokens = useMemo(() => {
    return messages.reduce((sum, msg) => sum + (msg.avgTokens || 0), 0);
  }, [messages]);

  // Get model display name
  const modelDisplayName = useMemo(() => {
    if (!formData?.coreModel) return null;
    return formData.coreModel.originalText || formData.coreModel.text || formData.coreModel.id;
  }, [formData?.coreModel]);

  // Check if current model supports vision
  const supportsVision = useMemo(() => {
    return formData?.coreModel?.supportsVision === true;
  }, [formData?.coreModel]);

  // Handle media upload - resize images to max 1024px
  const handleMediaUpload = useCallback(
    async (files) => {
      try {
        const imagePromises = files.map(async (file) => {
          // Resize image to max 1024px on longest side
          const { dataUrl, mimeType, width, height } = await resizeImage(file, 1024);
          return {
            name: file.name,
            dataUrl: dataUrl,
            mimeType: mimeType,
            width: width,
            height: height,
          };
        });
        const newImages = await Promise.all(imagePromises);
        setAttachedImages((prev) => [...prev, ...newImages]);
        setShowMediaUploadModal(false);
        showSuccess(
          "Images attached",
          `${files.length} image${files.length > 1 ? "s" : ""} attached successfully`,
        );
      } catch (error) {
        console.error("Error processing images:", error);
        showError("Upload Error", error?.message || "Failed to process images");
      }
    },
    [showSuccess, showError],
  );

  // Handle modal close - reset UI states
  const handleClose = useCallback(() => {
    setShowContextDropdown(false);
    setShowKnowledgeBaseSelect(false);
    setSelectedKnowledgeBases([]);
    setAttachedImages([]);
    onClose();
  }, [onClose]);

  return (
    <Modal
      open={isOpen}
      onRequestClose={handleClose}
      passiveModal
      modalHeading={modalTitle || "Chat Assistant"}
      size="lg"
      className="chat-modal"
      selectorPrimaryFocus="#chat-input-textarea"
      preventCloseOnClickOutside
    >
      <div className="chat-modal__container">
        <div className="chat-modal__navbar">
          <div className="chat-modal__navbar-actions_left">
            <Button
              kind="ghost"
              size="sm"
              tooltipPosition="right"
              renderIcon={Save}
              onClick={handleCreateContext}
              disabled={messages.length === 0 || isLoading}
              hasIconOnly
              iconDescription={
                isContextSaved ? "Update saved conversation" : "Save as conversation"
              }
            />
            {availableKnowledgeBases.length > 0 &&
              (showKnowledgeBaseSelect ? (
                <MultiSelect
                  id="knowledge-base-select"
                  titleText=""
                  label="Knowledge"
                  hideLabel
                  items={availableKnowledgeBases}
                  selectedItems={selectedKnowledgeBases}
                  itemToString={(item) => item?.name || ""}
                  onChange={({ selectedItems }) => setSelectedKnowledgeBases(selectedItems)}
                  size="sm"
                  className="chat-modal__knowledge-select"
                  disabled={isLoading}
                />
              ) : (
                <Button
                  kind="ghost"
                  size="sm"
                  tooltipPosition="right"
                  renderIcon={NotebookReference}
                  onClick={() => setShowKnowledgeBaseSelect(true)}
                  disabled={isLoading}
                  hasIconOnly
                  iconDescription={"Add knowledge"}
                />
              ))}
          </div>
          <div className="chat-modal__navbar-actions_center">
            {modelDisplayName && (
              <span className="chat-modal__model-info">
                <ProviderIcon providerId={formData?.coreModel?.providerId} size={16} />
                <span className="chat-modal__model-name">{modelDisplayName}</span>
              </span>
            )}

            {totalTokens > 0 && (
              <>
                <span style={{ opacity: "0.3" }}>|</span>
                <span className="chat-modal__token-count">
                  {totalTokens.toLocaleString()} tokens
                </span>
              </>
            )}
          </div>
          <div className="chat-modal__navbar-actions_right">
            {showContextDropdown ? (
              <Dropdown
                id="context-dropdown"
                titleText=""
                label="Load conversation"
                items={availableContexts}
                itemToString={(item) => item?.name || ""}
                onChange={({ selectedItem }) => {
                  if (selectedItem) handleLoadContext(selectedItem);
                }}
                size="sm"
              />
            ) : (
              <Button
                kind="ghost"
                size="sm"
                tooltipPosition="left"
                renderIcon={FolderOpen}
                onClick={() => setShowContextDropdown(true)}
                disabled={isLoading || availableContexts.length === 0}
                hasIconOnly
                iconDescription="Load conversation"
              />
            )}
            <Button
              kind="ghost"
              size="sm"
              tooltipPosition="left"
              onClick={handleClearChat}
              renderIcon={TrashCan}
              disabled={messages.length === 0 || isLoading}
              hasIconOnly
              iconDescription="Clear chat"
            />
          </div>
        </div>

        <div className="chat-modal__messages" ref={messagesContainerRef}>
          {messages.length === 0 ? (
            <div className="chat-modal__empty">
              <em>Start a conversation by typing a message below.</em>
            </div>
          ) : (
            messages.map((msg, index) => {
              // Find the index of the last user message
              const lastUserMessageIndex = messages.reduceRight(
                (acc, m, i) => (acc === -1 && m.role === ROLES.USER ? i : acc),
                -1,
              );
              const isLastUserMessage = msg.role === ROLES.USER && index === lastUserMessageIndex;

              return (
                <ChatMessage
                  key={index}
                  role={msg.role}
                  content={msg.content}
                  images={msg.images}
                  toolCalls={msg.toolCalls}
                  toolId={msg.toolId}
                  toolName={msg.toolName}
                  avgTokens={msg.avgTokens}
                  ragResultsCount={msg.ragResultsCount}
                  isLastMessage={isLastUserMessage}
                  isLoading={isLoading}
                  onKeepFromHere={() => handleKeepFromHere(index)}
                  onCopy={() => handleCopyToInput(msg.content)}
                  onRetry={() => handleRetryMessage(index, msg.content, msg.images, isLastUserMessage)}
                />
              );
            })
          )}

          {isLoading ? (
            <>
              {partialMess?.length ? (
                <ChatMessage role={partialMessRole} content={partialMess} />
              ) : null}
              <div className="chat-modal__loading">
                <InlineLoading
                  style={{ width: "fit-content" }}
                  description="Thinking..."
                  status="active"
                />
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={handleStopGeneration}
                  className="chat-modal__stop-button"
                >
                  Stop
                </Button>
              </div>
            </>
          ) : (
            !showMaxIterationsPrompt && <div style={{ margin: "16px" }}></div>
          )}

          {showMaxIterationsPrompt && (
            <div className="chat-modal__max-iterations-prompt">
              <div className="chat-modal__max-iterations-content">
                <p className="chat-modal__max-iterations-text">
                  Maximum tool execution iterations reached. Do you want to continue anyway?
                </p>
                <div className="chat-modal__max-iterations-actions">
                  <Button
                    kind="primary"
                    size="sm"
                    onClick={handleContinueExecution}
                    disabled={isLoading}
                    renderIcon={Play}
                  >
                    Continue
                  </Button>
                  <Button
                    kind="secondary"
                    size="sm"
                    onClick={handleCancelContinuation}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-modal__input">
          <ChatInput
            onSend={handleSendMessage}
            isLoading={isLoading}
            messages={messages}
            supportsVision={supportsVision}
            attachedImages={attachedImages}
            onOpenMediaUpload={() => setShowMediaUploadModal(true)}
            onImageDrop={handleMediaUpload}
            externalMessage={externalMessage}
            onExternalMessageClear={handleExternalMessageClear}
          />
        </div>
      </div>

      {/* Media Upload Modal for images */}
      <UploadModal
        open={showMediaUploadModal}
        onClose={() => setShowMediaUploadModal(false)}
        onUpload={handleMediaUpload}
        options={{
          title: "Attach Images",
          description: "Select images to include in your message.",
          subdescription: "The AI model will analyze these images along with your text.",
          multiple: true,
          accept: ".jpg,.jpeg,.png,.gif,.webp,.bmp",
        }}
      />
    </Modal>
  );
};

export default ChatModal;
