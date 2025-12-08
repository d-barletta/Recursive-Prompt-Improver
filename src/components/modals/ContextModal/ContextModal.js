import React, { useState, useEffect } from "react";
import { ROLES } from "@utils/constants";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Trash2, Image as ImageIcon, X } from "lucide-react";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editMode ? "Edit Conversation" : "Create Conversation"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="w-1/2">
            <Label htmlFor="context-name">Conversation Name</Label>
            <Input
              id="context-name"
              placeholder="Enter a name for this conversation"
              value={currentContext.name}
              name="name"
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="space-y-4">
            {currentContext.messages.map((msg, index) => (
              <div key={index} className="space-y-3 p-4 border rounded-lg">
                <div className="flex justify-between items-end gap-4">
                  <div className="flex gap-4 items-end flex-1">
                    <div className="w-40">
                      <Label htmlFor={`role-${index}`}>Role (*)</Label>
                      <Select
                        value={msg.role}
                        onValueChange={(value) => handleMessageChange(index, "role", value)}
                      >
                        <SelectTrigger id={`role-${index}`}>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ROLES.USER}>user</SelectItem>
                          <SelectItem value={ROLES.ASSISTANT}>assistant</SelectItem>
                          <SelectItem value={ROLES.TOOL}>tool</SelectItem>
                          <SelectItem value={ROLES.CONTROL}>control</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {msg.role === ROLES.USER && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenMediaUpload(index)}
                        className="relative"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Add images
                        {msg.images?.length > 0 && (
                          <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                            {msg.images.length}
                          </span>
                        )}
                      </Button>
                    )}
                    {msg.role === ROLES.TOOL && (
                      <div className="max-w-[150px]">
                        <Label htmlFor={`tool-id-${index}`}>Tool ID (*)</Label>
                        <Input
                          id={`tool-id-${index}`}
                          placeholder="Enter tool ID"
                          value={msg.toolId || ""}
                          onChange={(e) => handleMessageChange(index, "toolId", e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={currentContext.messages.length === 1}
                    onClick={() => removeMessage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`message-${index}`}>
                    {msg.role === ROLES.ASSISTANT && msg.toolCalls?.length > 0
                      ? "Message"
                      : "Message (*)"}
                  </Label>
                  <Textarea
                    id={`message-${index}`}
                    placeholder="Enter message content (or use voice)"
                    value={msg.message}
                    rows={messageFocused === index ? 5 : 2}
                    onFocus={() => setMessageFocused(index)}
                    onBlur={() => setMessageFocused(null)}
                    onChange={(e) => handleMessageChange(index, "message", e.target.value)}
                    required={!(msg.role === ROLES.ASSISTANT && msg.toolCalls?.length > 0)}
                  />
                </div>

                {/* Image previews for USER messages */}
                {msg.role === ROLES.USER && msg.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.images.map((image, imgIndex) => (
                      <div key={imgIndex} className="relative group">
                        <img
                          src={image.dataUrl || image.url}
                          alt={image.name || `Image ${imgIndex + 1}`}
                          className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => handleImageClick(image)}
                        />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index, imgIndex)}
                          title="Remove image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {msg.role === ROLES.ASSISTANT && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h6 className="text-sm font-semibold">Tool & Agent Calls (Optional)</h6>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addToolCall(index)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tool Call
                      </Button>
                    </div>

                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <Accordion type="single" collapsible className="w-full">
                        {msg.toolCalls.map((toolCall, tcIndex) => (
                          <AccordionItem key={tcIndex} value={`tool-call-${tcIndex}`}>
                            <AccordionTrigger>
                              Tool Call {tcIndex + 1} {toolCall.function?.name || "..."}
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 p-2">
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeToolCall(index, tcIndex)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove Tool Call
                                  </Button>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <Label htmlFor={`tool-call-id-${index}-${tcIndex}`}>
                                      ID (*)
                                    </Label>
                                    <Input
                                      id={`tool-call-id-${index}-${tcIndex}`}
                                      placeholder="Enter tool call ID"
                                      value={toolCall.id || ""}
                                      onChange={(e) =>
                                        handleToolCallChange(index, tcIndex, "id", e.target.value)
                                      }
                                      required
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`tool-call-func-name-${index}-${tcIndex}`}>
                                      Tool name (*)
                                    </Label>
                                    <Input
                                      id={`tool-call-func-name-${index}-${tcIndex}`}
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
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <Input value="function" disabled />
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor={`tool-call-func-args-${index}-${tcIndex}`}>
                                    Function Arguments - JSON (*)
                                  </Label>
                                  <Textarea
                                    id={`tool-call-func-args-${index}-${tcIndex}`}
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
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={addMessage}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Message
            </Button>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Session is running..." : editMode ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  );
};

export default ContextModal;
