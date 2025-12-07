import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { startSpeechRecognition, isSpeechRecognitionSupported } from "@utils/speechUtils";

/**
 * SpeechTextArea - A drop-in replacement for Carbon TextArea with speech-to-text capability
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.value - Textarea value
 * @param {Function} props.onChange - Change handler
 * @param {Object} [props.speechConfig] - Optional speech recognition configuration
 * @param {string} [props.speechConfig.lang='en-US'] - Language code
 * @param {boolean} [props.speechConfig.continuous=false] - Continuous listening
 * @param {boolean} [props.speechConfig.interimResults=true] - Return interim results
 * @param {number} [props.speechConfig.maxAlternatives=1] - Max alternatives
 * @param {string|Array<string>} [props.keyCombination] - Key combination to trigger speech (e.g., 'ctrl+m' or ['ctrl', 'm'])
 * @param {boolean} [props.holdToSpeak=false] - Enable hold-to-speak mode (hold key to record, release to stop)
 * @param {boolean} [props.disabled=false] - Disable the textarea and mic button
 * @param {React.Ref} [props.ref] - Ref forwarded to textarea
 * @returns {JSX.Element} SpeechTextArea component
 *
 * @example
 * // Basic usage
 * <SpeechTextArea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   placeholder="Type or speak..."
 * />
 *
 * @example
 * // With keyboard shortcut (Ctrl+M)
 * <SpeechTextArea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   keyCombination="ctrl+m"
 * />
 *
 * @example
 * // With hold-to-speak
 * <SpeechTextArea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   keyCombination="ctrl+space"
 *   holdToSpeak={true}
 * />
 *
 * @example
 * // With custom speech config
 * <SpeechTextArea
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   speechConfig={{ lang: 'es-ES', continuous: true }}
 * />
 */
const SpeechTextArea = React.forwardRef((props, ref) => {
  const {
    value,
    onChange,
    speechConfig = {},
    showError = () => {},
    keyCombination = "ctrl+t",
    holdToSpeak = false,
    disabled = false,
    buttonSize = "md",
    ...textAreaProps
  } = props;

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const keyHeldRef = useRef(false);
  const containerRef = useRef(null);

  // Parse key combination
  const parsedKeys = useRef(null);

  /**
   * Start speech recognition
   */
  const startListening = useCallback(async () => {
    if (!isSpeechRecognitionSupported()) {
      showError(
        "Speech Recognition Not Supported",
        "Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari."
      );
      return;
    }

    if (isListening) return;

    setIsListening(true);
    try {
      const { start, stop } = await startSpeechRecognition(
        {
          onResult: (result) => {
            // Update value with final transcript
            if (result.isFinal) {
              // Simulate textarea change event with updated value
              const newValue = value.trim()
                ? value + " " + result.finalTranscript
                : result.finalTranscript;
              const syntheticEvent = {
                target: { value: newValue },
              };
              onChange(syntheticEvent);
            }
          },
          onError: (error) => {
            console.error("Speech recognition error:", error);
            setIsListening(false);
            showError("Speech Recognition Error", error.message);
          },
          onEnd: () => {
            setIsListening(false);
          },
        },
        {
          continuous: speechConfig.continuous ?? false,
          interimResults: speechConfig.interimResults ?? true,
          lang: speechConfig.lang || "en-US",
          maxAlternatives: speechConfig.maxAlternatives || 1,
        }
      );

      recognitionRef.current = { stop };
      start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      setIsListening(false);
      showError("Speech Recognition Error", error.message);
    }
  }, [isListening, value, onChange, speechConfig, showError]);

  /**
   * Stop speech recognition
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  /**
   * Toggle speech recognition
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Check if key combination matches current key event
   */
  const matchesKeyCombination = useCallback(
    (event) => {
      if (!parsedKeys.current || parsedKeys.current.length === 0) return false;

      const keys = parsedKeys.current;
      const modifiers = {
        ctrl: event.ctrlKey,
        control: event.ctrlKey,
        meta: event.metaKey,
        cmd: event.metaKey,
        command: event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
        option: event.altKey,
      };

      // Check all parts of the key combination
      return keys.every((key) => {
        if (key in modifiers) {
          return modifiers[key];
        }
        // Regular key - case insensitive
        return event.key.toLowerCase() === key;
      });
    },
    [parsedKeys]
  );

  /**
   * Handle keydown events for keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (disabled) return;

      // ESC key always stops listening
      if (event.key === "Escape" && isListening) {
        event.preventDefault();
        stopListening();
        return;
      }

      if (!keyCombination) return;

      if (matchesKeyCombination(event)) {
        event.preventDefault();

        if (holdToSpeak) {
          // Hold-to-speak mode
          if (!keyHeldRef.current) {
            keyHeldRef.current = true;
            startListening();
          }
        } else {
          // Toggle mode
          toggleListening();
        }
      }
    },
    [
      disabled,
      isListening,
      keyCombination,
      matchesKeyCombination,
      holdToSpeak,
      startListening,
      toggleListening,
      stopListening,
    ]
  );

  /**
   * Handle keyup events for hold-to-speak mode
   */
  const handleKeyUp = useCallback(
    (event) => {
      if (disabled || !keyCombination || !holdToSpeak) return;

      if (matchesKeyCombination(event)) {
        event.preventDefault();
        if (keyHeldRef.current) {
          keyHeldRef.current = false;
          stopListening();
        }
      }
    },
    [disabled, keyCombination, holdToSpeak, matchesKeyCombination, stopListening]
  );

  useEffect(() => {
    if (keyCombination) {
      if (typeof keyCombination === "string") {
        // Parse string like "ctrl+m" or "meta+shift+s"
        parsedKeys.current = keyCombination
          .toLowerCase()
          .split("+")
          .map((k) => k.trim());
      } else if (Array.isArray(keyCombination)) {
        parsedKeys.current = keyCombination.map((k) => k.toLowerCase());
      }
    }
  }, [keyCombination]);

  /**
   * Setup keyboard event listeners
   */
  useEffect(() => {
    if (!keyCombination) return;

    const container = containerRef.current;
    if (!container) return;

    // Attach to document to capture events even in modals
    const handleKeyDownCapture = (event) => {
      // Check if the container or its children have focus
      if (container.contains(document.activeElement)) {
        handleKeyDown(event);
      }
    };

    const handleKeyUpCapture = (event) => {
      // Check if the container or its children have focus
      if (container.contains(document.activeElement)) {
        handleKeyUp(event);
      }
    };

    // Use capture phase to ensure we get events before modal handlers
    document.addEventListener("keydown", handleKeyDownCapture, true);
    document.addEventListener("keyup", handleKeyUpCapture, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDownCapture, true);
      document.removeEventListener("keyup", handleKeyUpCapture, true);
    };
  }, [keyCombination, handleKeyDown, handleKeyUp]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="speech-textarea-container relative">
      <Textarea
        ref={ref}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...textAreaProps}
      />
      <div
        className={`speech-textarea-mic-button absolute bottom-2 right-2 ${isListening ? "speech-textarea-mic-button--recording" : ""}`}
      >
        <Button
          variant="ghost"
          size={buttonSize || "default"}
          onClick={toggleListening}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title={isListening ? "Stop" : "Talk"}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
});

SpeechTextArea.displayName = "SpeechTextArea";

SpeechTextArea.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  speechConfig: PropTypes.shape({
    lang: PropTypes.string,
    continuous: PropTypes.bool,
    interimResults: PropTypes.bool,
    maxAlternatives: PropTypes.number,
  }),
  keyCombination: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
  holdToSpeak: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default SpeechTextArea;
