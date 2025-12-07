import React, { createContext, useContext, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SpeechTextArea } from "@components/shared";

const PromptContext = createContext();

export const usePrompt = () => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error("usePrompt must be used within a PromptProvider");
  }
  return context;
};

export const PromptProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    body: "",
    placeholder: "",
    confirmText: "Submit",
    cancelText: "Cancel",
    initialValue: "",
    rows: 4,
    className: "",
    helperText: "",
    validate: null,
  });
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [resolver, setResolver] = useState(null);

  const prompt = ({
    title = "Input Required",
    body = "",
    placeholder = "Enter your text here...",
    confirmText = "Submit",
    cancelText = "Cancel",
    initialValue = "",
    rows = 4,
    className = "",
    helperText = "",
    validate = null,
  }) => {
    return new Promise((resolve) => {
      setConfig({
        title,
        body,
        placeholder,
        confirmText,
        cancelText,
        initialValue,
        rows,
        className,
        helperText,
        validate,
      });
      setInputValue(initialValue);
      setResolver(() => resolve);
      setIsOpen(true);
    });
  };

  const handleInputChange = (value) => {
    setInputValue(value);
    // Real-time validation
    if (config.validate && value.trim()) {
      const error = config.validate(value);
      setValidationError(error || "");
    } else {
      setValidationError("");
    }
  };

  const handleConfirm = () => {
    // Validate before confirming
    if (config.validate) {
      const error = config.validate(inputValue);
      if (error) {
        setValidationError(error);
        return;
      }
    }

    if (resolver) {
      resolver(inputValue);
    }
    setIsOpen(false);
    setInputValue("");
    setValidationError("");
    setResolver(null);
  };

  const handleCancel = () => {
    if (resolver) {
      resolver(null);
    }
    setIsOpen(false);
    setInputValue("");
    setValidationError("");
    setResolver(null);
  };

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className={`sm:max-w-[500px] ${config.className}`} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            {config.body && <DialogDescription>{config.body}</DialogDescription>}
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {config.rows === 1 ? (
              <div className="space-y-2">
                <Input
                  id="prompt-input"
                  placeholder={config.placeholder}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue.trim() && !validationError) {
                      handleConfirm();
                    }
                  }}
                />
                {config.helperText && !validationError && (
                  <p className="text-sm text-muted-foreground">{config.helperText}</p>
                )}
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <SpeechTextArea
                  id="prompt-input"
                  labelText=""
                  placeholder={config.placeholder}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  rows={config.rows}
                  autoFocus
                />
                {config.helperText && !validationError && (
                  <p className="text-sm text-muted-foreground">{config.helperText}</p>
                )}
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {config.cancelText}
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!inputValue.trim() || !!validationError}
            >
              {config.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PromptContext.Provider>
  );
};
