import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { File, FileText, X } from "lucide-react";
import { formatFileSize } from "@utils/fileUtils";

/**
 * Generic Upload Modal Component
 * Supports single or multiple file uploads with drag & drop
 *
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onUpload - Callback with array of files when upload is confirmed
 * @param {object} options - Configuration options
 * @param {string} options.title - Modal title (default: "Upload Files")
 * @param {string} options.description - Description text shown in modal body
 * @param {string} options.subdescription - Secondary description text shown below description
 * @param {boolean} options.multiple - Allow multiple file selection (default: true)
 * @param {string} options.accept - Accepted file extensions (e.g., ".txt,.pdf,.md")
 * @param {number} options.maxFileSize - Max file size in bytes (optional)
 * @param {object} progress - Progress state { current, total, fileName, stage }
 * @param {boolean} isUploading - Whether upload is in progress
 */
const UploadModal = ({
  open,
  onClose,
  onUpload,
  options = {},
  progress = null,
  isUploading = false,
}) => {
  const {
    title = "Upload Files",
    description = "Drag and drop files here or click to browse.",
    subdescription = null,
    multiple = true,
    accept = ".txt,.md,.json,.pdf",
    maxFileSize = null,
  } = options;

  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});

  // Parse accepted extensions for display
  const acceptedExtensions = accept.split(",").map((ext) => ext.trim());

  // Get file icon based on extension
  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    if (ext === "pdf") return File;
    if (["txt", "md", "json", "xml", "csv"].includes(ext)) return FileText;
    return File;
  };

  // Validate a single file
  const validateFile = useCallback(
    (file) => {
      const ext = "." + file.name.split(".").pop().toLowerCase();

      // Check extension
      if (!acceptedExtensions.some((accepted) => accepted.toLowerCase() === ext)) {
        return `Invalid file type. Accepted: ${acceptedExtensions.join(", ")}`;
      }

      // Check file size
      if (maxFileSize && file.size > maxFileSize) {
        return `File too large. Maximum size: ${formatFileSize(maxFileSize)}`;
      }

      return null;
    },
    [acceptedExtensions, maxFileSize]
  );

  // Handle file drop or selection
  const handleAddFiles = useCallback(
    (event, { addedFiles }) => {
      const newFiles = [];
      const newErrors = { ...errors };

      for (const file of addedFiles) {
        // Skip if not multiple and we already have a file
        if (!multiple && files.length > 0) {
          continue;
        }

        // Check for duplicates
        if (files.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }

        const error = validateFile(file);
        if (error) {
          newErrors[file.name] = error;
        } else {
          newFiles.push(file);
        }
      }

      if (!multiple && newFiles.length > 0) {
        setFiles([newFiles[0]]);
      } else {
        setFiles((prev) => [...prev, ...newFiles]);
      }
      setErrors(newErrors);
    },
    [files, errors, multiple, validateFile]
  );

  // Handle file removal
  const handleRemoveFile = useCallback((fileName) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  }, []);

  // Handle upload confirmation
  const handleUpload = () => {
    if (files.length > 0 && onUpload) {
      onUpload(files);
      // Reset the modal state after upload
      setFiles([]);
      setErrors({});
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setErrors({});
      onClose();
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const modalContent = (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          {subdescription && (
            <DialogDescription className="text-sm text-muted-foreground">
              {subdescription}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Accepted file types */}
          <div className="space-y-2">
            <strong className="text-sm font-medium">Accepted file types:</strong>
            <div className="flex flex-wrap gap-2">
              {acceptedExtensions.slice(0, 8).map((ext) => (
                <Badge key={ext} variant="secondary">
                  {ext}
                </Badge>
              ))}
              {acceptedExtensions.length > 8 && (
                <Badge variant="outline" title={acceptedExtensions.slice(8).join(", ")}>
                  +{acceptedExtensions.length - 8} more
                </Badge>
              )}
            </div>
          </div>

          {/* Max file size info */}
          {maxFileSize && (
            <p className="text-sm text-muted-foreground">
              Maximum file size: {formatFileSize(maxFileSize)}
            </p>
          )}

          {/* Single/Multiple info */}
          <p className="text-sm text-muted-foreground">
            {multiple ? "You can upload multiple files at once." : "Only one file can be uploaded."}
          </p>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isUploading
                ? "border-muted bg-muted/10 cursor-not-allowed"
                : "border-border hover:border-primary hover:bg-accent/5"
            }`}
            onClick={() => !isUploading && document.getElementById("file-input")?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isUploading) {
                const droppedFiles = Array.from(e.dataTransfer.files);
                handleAddFiles(e, { addedFiles: droppedFiles });
              }
            }}
          >
            <File className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">
              Drag and drop {multiple ? "files" : "a file"} here or click to upload
            </p>
            <input
              id="file-input"
              type="file"
              multiple={multiple}
              accept={accept}
              disabled={isUploading}
              className="hidden"
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                handleAddFiles(e, { addedFiles: selectedFiles });
                e.target.value = "";
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.name);
                return (
                  <div
                    key={file.name}
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      errors[file.name]
                        ? "border-destructive bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                        {errors[file.name] && (
                          <p className="text-xs text-destructive mt-1">{errors[file.name]}</p>
                        )}
                      </div>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(file.name)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload progress */}
          {isUploading && progress && (
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {progress.fileName
                    ? `Processing: ${progress.fileName} (${progress.current}/${progress.total})`
                    : `Processing files... (${progress.current}/${progress.total})`}
                </p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
              {progress.stage && (
                <p className="text-sm text-muted-foreground">{progress.stage}</p>
              )}
              {progress.page && progress.totalPages && (
                <p className="text-sm text-muted-foreground">
                  Page {progress.page} of {progress.totalPages}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render in .rpi container to avoid z-index issues with other modals
  const portalContainer = document.querySelector(".rpi");
  return portalContainer ? createPortal(modalContent, portalContainer) : modalContent;
};

export default UploadModal;
