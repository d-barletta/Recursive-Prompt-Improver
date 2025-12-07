import React, { useState, useEffect } from "react";
import { ROLES } from "@utils/constants";
import {
  Form,
  TextInput,
  TextArea,
  Dropdown,
  FormGroup,
  Modal,
  Button,
  Accordion,
  AccordionItem,
  IconButton,
} from "@carbon/react";
import { Add, TrashCan, Image as ImageIcon, Close } from "@carbon/icons-react";
import { loadContexts, saveContext } from "@utils/storageUtils";
import { useToast } from "@context/ToastContext";
import { useLoading } from "@context/LoadingContext";
import { validateFunctionName } from "./ContextModal.utils";
import UploadModal from "@components/modals/UploadModal";
import { resizeImage } from "@utils/fileUtils";
import { openHtmlPreview } from "@utils/internalBrowser";

const ContextModal = ({ isOpen, onClose, editMode = false, initialContext = null, onSave }) => {
  const { showError, showSuccess } = useToast();
  const { isLoading } = useLoading();
  const [currentContext, setCurrentContext] = useState(
    initialContext || {
      name: "",
      messages: [{ role: ROLES.USER, message: "", toolId: "", toolCalls: [], images: [] }],
    }
  );
  const [messageFocused, setMessageFocused] = useState(null);
  const [showMediaUploadModal, setShowMediaUploadModal] = useState(false);
  const [uploadTargetMessageIndex, setUploadTargetMessageIndex] = useState(null);

  // Reset form when modal opens with new context
  useEffect(() => {
    if (initialContext) {
      // Ensure all messages have an images array
      const contextWithImages = {
        ...initialContext,
        messages: initialContext.messages.map((msg) => ({
          ...msg,
          images: msg.images || [],
        })),
      };
      setCurrentContext(contextWithImages);
    } else {
      setCurrentContext({
        name: "",
        messages: [{ role: ROLES.USER, message: "", toolId: "", toolCalls: [], images: [] }],
      });
    }
  }, [initialContext, isOpen]);

  const handleInputChange = (e) => {
    setCurrentContext({
      ...currentContext,
      [e.target.name]: e.target.value,
    });
  };

  const handleMessageChange = (index, field, value) => {
    const updatedMessages = [...currentContext.messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      [field]: value,
    };
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const addMessage = () => {
    setCurrentContext({
      ...currentContext,
      messages: [
        ...currentContext.messages,
        { role: ROLES.USER, message: "", toolId: "", toolCalls: [], images: [] },
      ],
    });
  };

  // Handle image upload for a specific message
  const handleOpenMediaUpload = (messageIndex) => {
    setUploadTargetMessageIndex(messageIndex);
    setShowMediaUploadModal(true);
  };

  const handleMediaUpload = async (files) => {
    if (uploadTargetMessageIndex === null) return;

    try {
      const imagePromises = files.map(async (file) => {
        const { dataUrl, mimeType, width, height } = await resizeImage(file, 1024);
        return {
          name: file.name,
          dataUrl,
          mimeType,
          width,
          height,
        };
      });
      const newImages = await Promise.all(imagePromises);

      const updatedMessages = [...currentContext.messages];
      const existingImages = updatedMessages[uploadTargetMessageIndex].images || [];
      updatedMessages[uploadTargetMessageIndex] = {
        ...updatedMessages[uploadTargetMessageIndex],
        images: [...existingImages, ...newImages],
      };

      setCurrentContext({
        ...currentContext,
        messages: updatedMessages,
      });

      setShowMediaUploadModal(false);
      showSuccess(
        "Images attached",
        `${files.length} image${files.length > 1 ? "s" : ""} attached`
      );
    } catch (error) {
      console.error("Error processing images:", error);
      showError("Upload Error", error?.message || "Failed to process images");
    }
  };

  const handleRemoveImage = (messageIndex, imageIndex) => {
    const updatedMessages = [...currentContext.messages];
    const images = [...(updatedMessages[messageIndex].images || [])];
    images.splice(imageIndex, 1);
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      images,
    };
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const handleImageClick = (image) => {
    const imageSrc = image.dataUrl || image.url;
    const imageAlt = image.name || "Image";
    const htmlContent = `
      <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #1a1a1a; padding: 20px;">
        <img src="${imageSrc}" alt="${imageAlt}" style="max-width: 100%; max-height: 100vh; object-fit: contain;" />
      </div>
    `;
    openHtmlPreview(htmlContent, { title: imageAlt, width: 1024, height: 768 });
  };

  const addToolCall = (messageIndex) => {
    const updatedMessages = [...currentContext.messages];
    const toolCalls = updatedMessages[messageIndex].toolCalls || [];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      toolCalls: [
        ...toolCalls,
        {
          id: "",
          type: "function",
          function: {
            name: "",
            arguments: "",
          },
        },
      ],
    };
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const removeToolCall = (messageIndex, toolCallIndex) => {
    const updatedMessages = [...currentContext.messages];
    const toolCalls = [...updatedMessages[messageIndex].toolCalls];
    toolCalls.splice(toolCallIndex, 1);
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      toolCalls,
    };
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const handleToolCallChange = (messageIndex, toolCallIndex, field, value) => {
    const updatedMessages = [...currentContext.messages];
    const toolCalls = [...updatedMessages[messageIndex].toolCalls];

    if (field.startsWith("function.")) {
      const funcField = field.split(".")[1];
      toolCalls[toolCallIndex] = {
        ...toolCalls[toolCallIndex],
        function: {
          ...toolCalls[toolCallIndex].function,
          [funcField]: value,
        },
      };
    } else {
      toolCalls[toolCallIndex] = {
        ...toolCalls[toolCallIndex],
        [field]: value,
      };
    }

    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      toolCalls,
    };
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const removeMessage = (index) => {
    const updatedMessages = [...currentContext.messages];
    updatedMessages.splice(index, 1);
    setCurrentContext({
      ...currentContext,
      messages: updatedMessages,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!currentContext.name.trim()) {
      showError("Validation Error", "Conversation name is required");
      return;
    }

    if (currentContext.messages.length === 0) {
      showError("Validation Error", "At least one message is required");
      return;
    }

    for (const msg of currentContext.messages) {
      // Message is required unless tool_calls is specified for assistant role
      if (msg.role === ROLES.ASSISTANT && msg.toolCalls && msg.toolCalls.length > 0) {
        // Message is optional when tool_calls is present
      } else if (!msg.message.trim()) {
        showError("Validation Error", "Message content cannot be empty");
        return;
      }

      if (msg.role === ROLES.TOOL && !msg.toolId?.trim()) {
        showError("Validation Error", "Tool ID is required when role is 'tool'");
        return;
      }

      // Validate tool calls for assistant role
      if (msg.role === ROLES.ASSISTANT && msg.toolCalls && msg.toolCalls.length > 0) {
        for (const toolCall of msg.toolCalls) {
          if (!toolCall.id?.trim()) {
            showError("Validation Error", "Tool call ID is required");
            return;
          }
          if (!toolCall.function?.name?.trim()) {
            showError("Validation Error", "Tool call function name is required");
            return;
          }
          // Validate function name format
          const nameError = validateFunctionName(toolCall.function.name);
          if (nameError) {
            showError("Validation Error", nameError);
            return;
          }
          // Arguments can be a string or object
          const args = toolCall.function?.arguments;
          const hasArgs =
            typeof args === "string" ? args.trim() : args && Object.keys(args).length > 0;
          if (!hasArgs) {
            showError("Validation Error", "Tool call function arguments are required");
            return;
          }
        }
      }
    }

    // Check for duplicate names
    const existingContexts = await loadContexts();
    const isDuplicate = existingContexts.some(
      (context) =>
        context.name.toLowerCase() === currentContext.name.toLowerCase() &&
        context.id !== currentContext.id
    );

    if (isDuplicate) {
      showError(
        "Validation Error",
        "A conversation with this name already exists. Please use a unique name."
      );
      return;
    }

    // Save context
    const updatedContexts = await saveContext(currentContext);

    // Call the onSave callback with the updated contexts
    if (onSave) {
      onSave(updatedContexts);
    }

    // Close the modal
    onClose();
  };

  return (
    <Modal
      size="lg"
      open={isOpen}
      modalHeading={editMode ? "Edit Conversation" : "Create Conversation"}
      primaryButtonText={isLoading ? "Session is running..." : editMode ? "Update" : "Create"}
      secondaryButtonText="Cancel"
      onRequestSubmit={handleSubmit}
      onRequestClose={onClose}
      primaryButtonDisabled={isLoading}
      preventCloseOnClickOutside
    >
      <Form>
        <FormGroup className="form-group-half-width">
          <TextInput
            id="context-name"
            labelText="Conversation Name"
            placeholder="Enter a name for this conversation"
            value={currentContext.name}
            name="name"
            onChange={handleInputChange}
            required
          />
        </FormGroup>

        <FormGroup>
          {currentContext.messages.map((msg, index) => (
            <div key={index} className="margin-bottom-2rem">
              <div className="flex-space-between-end">
                <div className="flex-gap-1rem-end">
                  <Dropdown
                    id={`role-${index}`}
                    titleText="Role (*)"
                    label="Select role"
                    size="sm"
                    items={[ROLES.USER, ROLES.ASSISTANT, ROLES.TOOL, ROLES.CONTROL]}
                    selectedItem={msg.role}
                    className="width-150px"
                    onChange={(item) => handleMessageChange(index, "role", item.selectedItem)}
                  />
                  {msg.role === ROLES.USER && (
                    <IconButton
                      kind="ghost"
                      size="sm"
                      label="Add images"
                      align="right"
                      onClick={() => handleOpenMediaUpload(index)}
                      className="context-message-image-btn"
                      badgeCount={msg.images?.length > 0 ? msg.images.length : undefined}
                    >
                      <ImageIcon />
                    </IconButton>
                  )}
                  {msg.role === ROLES.TOOL && (
                    <TextInput
                      id={`tool-id-${index}`}
                      labelText="Tool ID (*)"
                      placeholder="Enter tool ID"
                      value={msg.toolId || ""}
                      className="max-width-150px"
                      onChange={(e) => handleMessageChange(index, "toolId", e.target.value)}
                      required
                    />
                  )}
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  iconDescription="Delete"
                  hasIconOnly={true}
                  renderIcon={TrashCan}
                  tooltipPosition="left"
                  disabled={currentContext.messages.length === 1}
                  onClick={() => removeMessage(index)}
                />
              </div>
              <TextArea
                id={`message-${index}`}
                labelText={
                  msg.role === ROLES.ASSISTANT && msg.toolCalls?.length > 0
                    ? "Message"
                    : "Message (*)"
                }
                placeholder="Enter message content (or use voice)"
                value={msg.message}
                rows={messageFocused === index ? 5 : 2}
                onFocus={() => setMessageFocused(index)}
                onBlur={() => setMessageFocused(null)}
                onChange={(e) => handleMessageChange(index, "message", e.target.value)}
                required={!(msg.role === ROLES.ASSISTANT && msg.toolCalls?.length > 0)}
              />

              {/* Image previews for USER messages */}
              {msg.role === ROLES.USER && msg.images?.length > 0 && (
                <div className="context-message-images">
                  {msg.images.map((image, imgIndex) => (
                    <div key={imgIndex} className="context-message-image-wrapper">
                      <img
                        src={image.dataUrl || image.url}
                        alt={image.name || `Image ${imgIndex + 1}`}
                        className="context-message-image-preview"
                        onClick={() => handleImageClick(image)}
                      />
                      <button
                        type="button"
                        className="context-message-image-remove"
                        onClick={() => handleRemoveImage(index, imgIndex)}
                        title="Remove image"
                      >
                        <Close size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {msg.role === ROLES.ASSISTANT && (
                <div className="margin-top-1rem">
                  <div className="flex-space-between margin-bottom-half">
                    <h6 className="margin-0">Tool & Agent Calls (Optional)</h6>
                    <Button
                      kind="ghost"
                      size="sm"
                      renderIcon={Add}
                      onClick={() => addToolCall(index)}
                    >
                      Add Tool Call
                    </Button>
                  </div>

                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <Accordion>
                      {msg.toolCalls.map((toolCall, tcIndex) => (
                        <AccordionItem
                          key={tcIndex}
                          title={`Tool Call ${tcIndex + 1} ${toolCall.function?.name || "..."}`}
                        >
                          <div className="padding-0-1rem">
                            <div className="flex-end-neg-margin">
                              <Button
                                kind="danger--ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                onClick={() => removeToolCall(index, tcIndex)}
                              >
                                Remove Tool Call
                              </Button>
                            </div>

                            <div className="flex-gap-1rem-margin-bottom">
                              <TextInput
                                id={`tool-call-id-${index}-${tcIndex}`}
                                labelText="ID (*)"
                                placeholder="Enter tool call ID"
                                value={toolCall.id || ""}
                                onChange={(e) =>
                                  handleToolCallChange(index, tcIndex, "id", e.target.value)
                                }
                                required
                              />
                              <TextInput
                                id={`tool-call-func-name-${index}-${tcIndex}`}
                                labelText="Tool name (*)"
                                placeholder="Enter function name"
                                value={toolCall.function?.name || ""}
                                onChange={(e) =>
                                  handleToolCallChange(
                                    index,
                                    tcIndex,
                                    "function.name",
                                    e.target.value
                                  )
                                }
                                required
                              />
                              <TextInput
                                id={`tool-call-type-${index}-${tcIndex}`}
                                labelText="ㅤ"
                                // helperText="Type"
                                value="function"
                                disabled
                              />
                            </div>

                            <FormGroup>
                              <TextArea
                                id={`tool-call-func-args-${index}-${tcIndex}`}
                                labelText="Function Arguments - JSON (*)"
                                placeholder='Enter JSON arguments, e.g. {"key": "value"}'
                                value={
                                  typeof toolCall.function?.arguments === "string"
                                    ? toolCall.function.arguments
                                    : JSON.stringify(toolCall.function?.arguments || "", null, 2)
                                }
                                rows={3}
                                onChange={(e) =>
                                  handleToolCallChange(
                                    index,
                                    tcIndex,
                                    "function.arguments",
                                    e.target.value
                                  )
                                }
                                required
                              />
                            </FormGroup>
                          </div>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </div>
              )}
            </div>
          ))}
          <Button
            kind="ghost"
            size="md"
            renderIcon={Add}
            onClick={addMessage}
            className="margin-top-0"
          >
            Add Message
          </Button>
        </FormGroup>
      </Form>

      {/* Media Upload Modal */}
      <UploadModal
        open={showMediaUploadModal}
        onClose={() => setShowMediaUploadModal(false)}
        onUpload={handleMediaUpload}
        options={{
          title: "Attach Images to Message",
          description: "Select images to include in this message.",
          subdescription: "Images will be stored with the conversation.",
          multiple: true,
          accept: ".jpg,.jpeg,.png,.gif,.webp,.bmp",
        }}
      />
    </Modal>
  );
};

export default ContextModal;
