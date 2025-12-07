import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FileText, FileType, File } from "lucide-react";
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
    if (ext === "pdf") return DocumentPdf;
    if (["txt", "md", "json", "xml", "csv"].includes(ext)) return Document;
    return DocumentBlank;
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
    <Modal
      size="md"
      open={open}
      modalHeading={title}
      primaryButtonText={isUploading ? "Uploading..." : "Upload"}
      secondaryButtonText="Cancel"
      onRequestSubmit={handleUpload}
      onRequestClose={handleClose}
      primaryButtonDisabled={files.length === 0 || isUploading}
      preventCloseOnClickOutside
    >
      <div className="upload-modal-content">
        {/* Description */}
        {description && <p className="upload-modal-description">{description}</p>}

        {/* Subdescription */}
        {subdescription && <p className="upload-modal-subdescription">{subdescription}</p>}

        {/* Accepted file types */}
        <div className="upload-modal-info">
          <strong className="upload-modal-label">Accepted file types:</strong>
          <div className="upload-modal-tags">
            {acceptedExtensions.slice(0, 8).map((ext) => (
              <Tag key={ext} size="sm" type="gray">
                {ext}
              </Tag>
            ))}
            {acceptedExtensions.length > 8 && (
              <span title={acceptedExtensions.slice(8).join(", ")}>
                <Tag size="sm" type="outline">
                  +{acceptedExtensions.length - 8} more
                </Tag>
              </span>
            )}
          </div>
        </div>

        {/* Max file size info */}
        {maxFileSize && (
          <p className="upload-modal-size-limit">
            Maximum file size: {formatFileSize(maxFileSize)}
          </p>
        )}

        {/* Single/Multiple info */}
        <p className="upload-modal-mode">
          {multiple ? "You can upload multiple files at once." : "Only one file can be uploaded."}
        </p>

        {/* Drop zone */}
        <FileUploaderDropContainer
          accept={acceptedExtensions}
          multiple={multiple}
          onAddFiles={handleAddFiles}
          labelText={`Drag and drop ${multiple ? "files" : "a file"} here or click to upload`}
          disabled={isUploading}
        />

        {/* File list */}
        {files.length > 0 && (
          <div className="upload-modal-file-list">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.name);
              return (
                <FileUploaderItem
                  key={file.name}
                  name={file.name}
                  status={isUploading ? "uploading" : "edit"}
                  iconDescription="Remove file"
                  onDelete={() => handleRemoveFile(file.name)}
                  invalid={!!errors[file.name]}
                  errorSubject={errors[file.name]}
                  size="sm"
                >
                  <FileIcon className="upload-modal-file-icon" />
                  <span className="upload-modal-file-size">{formatFileSize(file.size)}</span>
                </FileUploaderItem>
              );
            })}
          </div>
        )}

        {/* Upload progress */}
        {isUploading && progress && (
          <div className="upload-modal-progress">
            <ProgressBar
              label={
                progress.fileName
                  ? `Processing: ${progress.fileName} (${progress.current}/${progress.total})`
                  : `Processing files... (${progress.current}/${progress.total})`
              }
              value={progressPercentage}
              size="md"
              status={progressPercentage === 100 ? "finished" : "active"}
            />
            {progress.stage && <p className="upload-modal-stage">{progress.stage}</p>}
            {progress.page && progress.totalPages && (
              <p className="upload-modal-page-progress">
                Page {progress.page} of {progress.totalPages}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );

  // Render in .rpi container to avoid z-index issues with other modals
  const portalContainer = document.querySelector(".rpi");
  return portalContainer ? createPortal(modalContent, portalContainer) : modalContent;
};

export default UploadModal;
