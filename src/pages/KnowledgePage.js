import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@context/ToastContext";
import { useSettings } from "@context/SettingsContext";
import { useKnowledge } from "@context/KnowledgeContext";
import {
  useModalState,
  usePagination,
  useSearchAndFilter,
  useLocalStorageData,
  useConfirmDelete,
} from "@hooks";
import {
  Trash2,
  Plus,
  FileText,
  Book,
  Search as SearchIcon,
  File,
  FileType,
  MoreVertical,
  Download,
  Eye,
  Database,
  Check,
  AlertTriangle,
  Folder,
} from "lucide-react";
import EmptyState from "@components/shared/EmptyState";
import KnowledgeSearchModal from "@components/modals/KnowledgeSearchModal";
import UploadModal from "@components/modals/UploadModal";
import {
  loadKnowledgeBases,
  saveKnowledgeBase,
  deleteKnowledgeBase,
  clearAllKnowledgeBases,
  addFileToKnowledgeBase,
  deleteFileFromKnowledgeBase,
} from "@utils/storageUtils";
import { formatDate, truncateText } from "@utils/uiUtils";
import {
  formatFileSize,
  readFileContent,
  downloadFile,
  ACCEPTED_FILE_EXTENSIONS,
  isPdfFile,
} from "@utils/fileUtils";
import { openTextPreview, openPdfPreview } from "@utils/internalBrowser";
import { useConfirm } from "@context/ConfirmContext";
import { RAG } from "@core/RAG";
import { getDefaultEmbeddingModel } from "@components/FormComponent/FormComponent.utils";

const KnowledgePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const { confirm } = useConfirm();
  const { settings } = useSettings();
  const {
    indexingKBs,
    indexingProgress,
    startIndexing,
    updateIndexingProgress,
    stopIndexing,
    abortIndexing,
    processingKBs,
    processingProgress,
    startProcessing,
    updateProcessingProgress,
    stopProcessing,
  } = useKnowledge();

  // Modal state for creating/editing knowledge bases
  const {
    isOpen: isModalOpen,
    currentItem: currentKnowledgeBase,
    editMode,
    openCreate,
    // openEdit,
    close: closeModal,
  } = useModalState();

  // Load knowledge bases from localStorage
  const {
    data: knowledgeBases,
    isLoading,
    setData: setKnowledgeBases,
  } = useLocalStorageData(loadKnowledgeBases);

  // Form state for modal
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingKnowledgeBaseId, setPendingKnowledgeBaseId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchKnowledgeBase, setSearchKnowledgeBase] = useState(null);

  // Get default embedding model
  const embeddingModel = getDefaultEmbeddingModel(settings.providers, settings.defaultProviderId);

  // Search and filter matcher
  const knowledgeBaseMatcher = useCallback((kb, lowercaseTerm) => {
    const nameMatch = kb.name.toLowerCase().includes(lowercaseTerm);
    const descriptionMatch = kb.description
      ? kb.description.toLowerCase().includes(lowercaseTerm)
      : false;
    return nameMatch || descriptionMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredKnowledgeBases,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(knowledgeBases, knowledgeBaseMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedKnowledgeBases,
    handlePageChange,
    resetPage,
  } = usePagination(filteredKnowledgeBases, { initialPageSize: 10 });

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setKnowledgeBases });

  const handleDeleteKnowledgeBase = handleDelete({
    title: "Delete Knowledge Base",
    body: "Are you sure you want to delete this knowledge base and all its files?",
    deleteOperation: (id) => deleteKnowledgeBase(id),
    successMessage: "Knowledge base deleted",
    successDescription: "The knowledge base has been removed",
  });

  const handleClearAllKnowledgeBases = handleClearAll({
    title: "Clear All Knowledge Bases",
    body: "Are you sure you want to delete all knowledge bases? This action cannot be undone.",
    deleteOperation: () => clearAllKnowledgeBases(),
    successMessage: "All knowledge bases cleared",
    successDescription: "All knowledge bases have been removed",
  });

  // Run ingestion pipeline for a knowledge base
  // Can accept either just an ID (will look up from state) or a full KB object (for fresh data)
  const runIngestion = useCallback(
    async (knowledgeBaseIdOrKB) => {
      if (!embeddingModel) {
        showError(
          "No embedding model configured",
          "Please configure an embedding model in Settings before indexing."
        );
        return;
      }

      // Accept either an ID or a full knowledge base object
      const kb =
        typeof knowledgeBaseIdOrKB === "object"
          ? knowledgeBaseIdOrKB
          : knowledgeBases.find((k) => k.id === knowledgeBaseIdOrKB);
      if (!kb) return;

      const knowledgeBaseId = kb.id;

      if (!kb.files || kb.files.length === 0) {
        showWarning("No files to index", "Add files to the knowledge base before indexing.");
        return;
      }

      // Mark as indexing and get abort controller
      const controller = startIndexing(knowledgeBaseId);

      try {
        // Run indexing pipeline
        const indexedData = await RAG.indexKnowledgeBase(
          kb,
          embeddingModel.id,
          embeddingModel.providerId,
          {
            abortSignal: controller.signal,
            onProgress: (stage, current, total) => {
              if (stage === "chunking") {
                updateIndexingProgress(knowledgeBaseId, "Chunking...");
              } else if (stage === "embedding") {
                const pct = Math.round((current / total) * 100);
                updateIndexingProgress(knowledgeBaseId, `Embedding ${pct}%`);
              }
            },
          }
        );

        // Store vectors
        updateIndexingProgress(knowledgeBaseId, "Storing...");
        await RAG.storeVectors(knowledgeBaseId, indexedData);

        // Reload knowledge bases to get updated data
        const updatedKBs = await loadKnowledgeBases();
        setKnowledgeBases(updatedKBs);

        showSuccess(
          "Indexing complete",
          `Indexed ${indexedData.chunks.length.toLocaleString()} chunks from ${kb.files.length.toLocaleString()} file(s).`
        );
      } catch (error) {
        // Check if this was an abort
        if (error.name === "AbortError" || controller.signal.aborted) {
          showInfo("Indexing stopped", "The indexing process was stopped.");
        } else {
          console.error("Ingestion error:", error);
          showError("Indexing failed", error.message || "Failed to index the knowledge base.");
        }
      } finally {
        // Remove from indexing set
        stopIndexing(knowledgeBaseId);
      }
    },
    [
      knowledgeBases,
      embeddingModel,
      showSuccess,
      showError,
      showWarning,
      showInfo,
      setKnowledgeBases,
      startIndexing,
      updateIndexingProgress,
      stopIndexing,
    ]
  );

  // Handle modal open for create
  const handleOpenCreate = () => {
    setFormName("");
    setFormDescription("");
    openCreate();
  };

  // Handle modal open for edit
  //   const handleOpenEdit = (kb) => {
  //     setFormName(kb.name);
  //     setFormDescription(kb.description || "");
  //     openEdit(kb);
  //   };

  // Handle save knowledge base
  const handleSave = async () => {
    if (!formName.trim()) {
      showError("Validation Error", "Knowledge base name is required");
      return;
    }

    // Check for duplicate names
    const isDuplicate = knowledgeBases.some(
      (kb) => kb.name.toLowerCase() === formName.toLowerCase() && kb.id !== currentKnowledgeBase?.id
    );

    if (isDuplicate) {
      showError(
        "Validation Error",
        "A knowledge base with this name already exists. Please use a unique name."
      );
      return;
    }

    const knowledgeBaseData = {
      ...(currentKnowledgeBase || {}),
      name: formName.trim(),
      description: formDescription.trim(),
    };

    const updatedKnowledgeBases = await saveKnowledgeBase(knowledgeBaseData);
    setKnowledgeBases(updatedKnowledgeBases);

    showSuccess(
      editMode ? "Knowledge base updated" : "Knowledge base created",
      editMode
        ? "The knowledge base has been updated successfully"
        : "A new knowledge base has been created"
    );

    closeModal();
  };

  // Handle add file button click - opens upload modal
  const handleAddFileClick = (knowledgeBaseId) => {
    setPendingKnowledgeBaseId(knowledgeBaseId);
    setIsUploadModalOpen(true);
  };

  // Handle upload modal close
  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setPendingKnowledgeBaseId(null);
    setUploadProgress(null);
  };

  // Handle file upload from modal
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0 || !pendingKnowledgeBaseId) return;

    const kbId = pendingKnowledgeBaseId;
    const totalFiles = files.length;
    const hasPdfs = files.some((f) => isPdfFile(f.name));

    // Start uploading state
    setIsUploading(true);
    setUploadProgress({
      current: 0,
      total: totalFiles,
      fileName: "",
      stage: "Preparing...",
    });

    // Start processing state if there are PDFs
    if (hasPdfs) {
      startProcessing(kbId, totalFiles);
    }

    let updatedKnowledgeBases;
    let fileIndex = 0;

    for (const file of files) {
      try {
        fileIndex++;

        // Update progress for current file
        setUploadProgress({
          current: fileIndex,
          total: totalFiles,
          fileName: file.name,
          stage: isPdfFile(file.name) ? "Processing PDF..." : "Reading file...",
        });

        if (hasPdfs) {
          updateProcessingProgress(kbId, {
            current: fileIndex,
            fileName: file.name,
            page: 0,
            totalPages: 0,
          });
        }

        // Read file with progress callback for PDFs
        const result = await readFileContent(file, {
          onProgress: (page, totalPages) => {
            setUploadProgress((prev) => ({
              ...prev,
              stage: `Processing PDF page ${page}/${totalPages}`,
              page,
              totalPages,
            }));
            updateProcessingProgress(kbId, { page, totalPages });
          },
        });

        const fileData = {
          name: file.name,
          content: result.content,
          originalData: result.originalData, // For binary files like PDFs
          usedOCR: result.usedOCR, // Whether OCR was used for this file
          size: file.size,
          type: file.type,
        };

        updatedKnowledgeBases = await addFileToKnowledgeBase(kbId, fileData);
        setKnowledgeBases(updatedKnowledgeBases);
      } catch (error) {
        showError("Error", `Failed to add file: ${file.name}`);
      }
    }

    // Clear processing state
    if (hasPdfs) {
      stopProcessing(kbId);
    }

    // Close modal and reset state
    setIsUploading(false);
    setUploadProgress(null);
    setIsUploadModalOpen(false);
    setPendingKnowledgeBaseId(null);

    showSuccess("Files added", "The files have been added to the knowledge base");

    // Get the updated knowledge base before resetting
    const kbToIndex = updatedKnowledgeBases?.find((k) => k.id === kbId);

    // Automatically trigger ingestion after adding files
    // Pass the full KB object with updated files to avoid stale state
    if (kbToIndex && embeddingModel) {
      runIngestion(kbToIndex);
    }
  };

  // Handle delete file - triggers re-ingestion
  const handleDeleteFile = async (knowledgeBaseId, fileId, fileName) => {
    const confirmed = await confirm({
      title: "Delete File",
      body: `Are you sure you want to delete "${fileName}"? This will require re-indexing the knowledge base.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    const updatedKnowledgeBases = await deleteFileFromKnowledgeBase(knowledgeBaseId, fileId);
    setKnowledgeBases(updatedKnowledgeBases);
    showSuccess("File deleted", "The file has been removed from the knowledge base");

    // Re-index if there are remaining files
    const kb = updatedKnowledgeBases.find((k) => k.id === knowledgeBaseId);
    if (kb?.files?.length > 0 && embeddingModel) {
      // Pass the full KB object with updated files to avoid stale state
      runIngestion(kb);
    } else if (kb && (!kb.files || kb.files.length === 0)) {
      // Clear vectors if no files remain
      await RAG.deleteVectors(knowledgeBaseId);
      const refreshedKBs = await loadKnowledgeBases();
      setKnowledgeBases(refreshedKBs);
    }
  };

  // Handle search modal open
  const handleOpenSearch = (kb) => {
    setSearchKnowledgeBase(kb);
    setIsSearchModalOpen(true);
  };

  // Handle search modal close
  const handleCloseSearch = () => {
    setIsSearchModalOpen(false);
    setSearchKnowledgeBase(null);
  };

  // Check if a KB is indexed
  const isKBIndexed = (kb) => RAG.isIndexed(kb);

  const headers = [
    { key: "name", header: "Name" },
    { key: "fileCount", header: "Files" },
    { key: "status", header: "Status" },
    { key: "timestamp", header: "Date Created" },
    { key: "actions", header: "" },
  ];

  const rows = paginatedKnowledgeBases.map((kb) => {
    const isIndexing = indexingKBs.has(kb.id);
    const isProcessing = processingKBs.has(kb.id);
    const isIndexed = isKBIndexed(kb);
    const idxProgress = indexingProgress[kb.id];
    const pdfProgress = processingProgress[kb.id];

    // Build status description for PDF processing
    let pdfStatusText = "Processing PDF...";
    if (pdfProgress) {
      if (pdfProgress.totalPages > 0) {
        pdfStatusText = `OCR page ${pdfProgress.page}/${pdfProgress.totalPages}`;
      } else if (pdfProgress.total > 1) {
        pdfStatusText = `Processing file ${pdfProgress.current}/${pdfProgress.total}`;
      }
    }

    return {
      id: kb.id.toString(),
      name: <span title={kb.name}>{truncateText(kb.name, 30)}</span>,
      fileCount: kb.files?.length || 0,
      status: isProcessing ? (
        <InlineLoading description={pdfStatusText} />
      ) : isIndexing ? (
        <span className="knowledge-indexing-status">
          <InlineLoading description={idxProgress || "Indexing..."} />
          <Button
            kind="ghost"
            size="sm"
            onClick={() => abortIndexing(kb.id)}
            className="knowledge-stop-button"
          >
            Stop
          </Button>
        </span>
      ) : isIndexed ? (
        <Tag type="green" size="sm" renderIcon={Checkmark}>
          Indexed ({(kb.vectors?.chunks?.length || 0).toLocaleString()} chunks)
        </Tag>
      ) : kb.files?.length > 0 ? (
        <Tag type="purple" size="sm" renderIcon={WarningAlt}>
          Not indexed
        </Tag>
      ) : (
        <Tag type="gray" size="sm">
          Empty
        </Tag>
      ),
      timestamp: formatDate(kb.timestamp),
      actions: (
        <div className="tableActionsContainer">
          <div></div>
          <div className="tableActionsDiv">
            <Button
              kind="ghost"
              size="sm"
              renderIcon={SearchIcon}
              iconDescription="Search"
              tooltipPosition="top"
              hasIconOnly
              onClick={() => handleOpenSearch(kb)}
              disabled={isIndexing || !isIndexed}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={DataEnrichment}
              iconDescription="Index"
              tooltipPosition="top"
              hasIconOnly
              onClick={() => runIngestion(kb.id)}
              disabled={isIndexing || !kb.files?.length}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={DocumentAdd}
              iconDescription="Add files"
              tooltipPosition="top"
              hasIconOnly
              onClick={() => handleAddFileClick(kb.id)}
              disabled={isIndexing}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              tooltipPosition="top"
              hasIconOnly
              onClick={() => handleDeleteKnowledgeBase(kb.id)}
              disabled={isIndexing}
            />
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="margin-bottom-2rem">
      <div className="contextPage">
        <h1 className="sectionTitle">Knowledge</h1>
        <div className="flex-center">
          <Button
            size="md"
            renderIcon={Add}
            kind="tertiary"
            onClick={handleOpenCreate}
            className="margin-right-1rem"
          >
            New
          </Button>
          <Search
            labelText="Search"
            placeholder="Search by name or description"
            onChange={handleSearchChange}
            value={searchTerm}
            size="md"
            disabled={!knowledgeBases || !knowledgeBases.length}
          />
          <OverflowMenu
            className="margin-left-1rem"
            size="md"
            flipped
            aria-label="Knowledge menu"
            renderIcon={Menu}
          >
            <OverflowMenuItem
              itemText="Delete all knowledge bases"
              onClick={handleClearAllKnowledgeBases}
              isDelete
              disabled={!knowledgeBases || !knowledgeBases.length}
            />
          </OverflowMenu>
        </div>
      </div>

      <Grid className="row-gap-0">
        {!embeddingModel && knowledgeBases?.length > 0 && (
          <Column lg={16} md={8} sm={4}>
            <ActionableNotification
              kind="warning"
              title="No embedding model configured"
              subtitle="Please configure an embedding model in Settings to enable indexing."
              actionButtonLabel="Configure embedding model"
              onActionButtonClick={() => navigate("/settings")}
              className="margin-bottom-1rem"
              lowContrast
              hideCloseButton
              inline
            />
          </Column>
        )}
        <Column lg={16} md={8} sm={4}>
          {isLoading ? (
            <DataTableSkeleton
              showHeader={false}
              showToolbar={false}
              headers={headers}
              rowCount={pageSize}
              columnCount={headers.length}
            />
          ) : !knowledgeBases || knowledgeBases.length === 0 ? (
            <EmptyState
              icon={Book}
              title="No knowledge bases yet"
              description="Create a new knowledge base to get started with RAG."
            />
          ) : filteredKnowledgeBases.length === 0 ? (
            <EmptyState
              icon={SearchLocateMirror}
              title="No matching knowledge bases"
              description="No knowledge bases match your search criteria. Try a different search term."
            />
          ) : (
            <DataTable rows={rows} headers={headers}>
              {({
                rows,
                headers,
                getTableProps,
                getHeaderProps,
                getRowProps,
                getExpandedRowProps,
              }) => (
                <TableContainer>
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        <TableExpandHeader />
                        {headers.map((header, idx) => (
                          <TableHeader {...getHeaderProps({ header })} key={`${idx}`}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const kb = paginatedKnowledgeBases.find((k) => k.id.toString() === row.id);
                        const isIndexing = indexingKBs.has(kb?.id);
                        const isProcessing = processingKBs.has(kb?.id);
                        const isBusy = isIndexing || isProcessing;
                        return (
                          <React.Fragment key={row.id}>
                            <TableExpandRow
                              {...getRowProps({ row })}
                              key={row.id}
                              className={isBusy ? "knowledge-row-indexing" : ""}
                            >
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableExpandRow>
                            <TableExpandedRow
                              colSpan={headers.length + 1}
                              {...getExpandedRowProps({ row })}
                            >
                              <div className="knowledge-files-container">
                                {kb?.description && (
                                  <p title={kb.description} className="knowledge-description">
                                    {kb.description}
                                  </p>
                                )}
                                {kb?.files && kb.files.length > 0 ? (
                                  <div className="knowledge-files-list">
                                    {kb.files.map((file) => (
                                      <div key={file.id} className="knowledge-file-item">
                                        <div className="knowledge-file-info">
                                          {isPdfFile(file.name) ? (
                                            <DocumentPdf size={16} />
                                          ) : (
                                            <Document size={16} />
                                          )}
                                          <span className="knowledge-file-name">
                                            {truncateText(file.name, 40)}
                                          </span>
                                          <span className="knowledge-file-size">
                                            {formatFileSize(file.size)}
                                          </span>
                                          {file.usedOCR && (
                                            <Tag type="purple" size="sm">
                                              OCR
                                            </Tag>
                                          )}
                                        </div>
                                        <div className="knowledge-file-actions">
                                          <Button
                                            kind="ghost"
                                            size="sm"
                                            renderIcon={View}
                                            iconDescription="View file"
                                            tooltipPosition="left"
                                            hasIconOnly
                                            onClick={() => {
                                              if (isPdfFile(file.name) && file.originalData) {
                                                openPdfPreview(file.originalData, {
                                                  title: file.name,
                                                });
                                              } else {
                                                openTextPreview(file.content, {
                                                  title: file.name,
                                                });
                                              }
                                            }}
                                            disabled={isBusy}
                                          />
                                          <Button
                                            kind="ghost"
                                            size="sm"
                                            renderIcon={Download}
                                            iconDescription="Download file"
                                            tooltipPosition="left"
                                            hasIconOnly
                                            onClick={() =>
                                              downloadFile(
                                                file.originalData || file.content,
                                                file.name,
                                                file.type || "text/plain"
                                              )
                                            }
                                            disabled={isBusy}
                                          />
                                          <Button
                                            kind="ghost"
                                            size="sm"
                                            renderIcon={TrashCan}
                                            iconDescription="Delete file"
                                            tooltipPosition="left"
                                            hasIconOnly
                                            onClick={() =>
                                              handleDeleteFile(kb.id, file.id, file.name)
                                            }
                                            disabled={isBusy}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="knowledge-no-files">
                                    No files yet. Click the add file button to upload files.
                                  </p>
                                )}
                              </div>
                            </TableExpandedRow>
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DataTable>
          )}
        </Column>
        {isLoading ||
        !knowledgeBases ||
        knowledgeBases.length === 0 ||
        filteredKnowledgeBases.length === 0 ? (
          <></>
        ) : (
          <Column lg={16} md={8} sm={4}>
            <Pagination
              backwardText="Previous page"
              forwardText="Next page"
              itemsPerPageText="Items per page:"
              pageNumberText="Page Number"
              pageSize={pageSize}
              pageSizes={[5, 10, 15, 25, 50]}
              totalItems={totalItems}
              page={currentPage}
              onChange={handlePageChange}
            />
          </Column>
        )}
      </Grid>

      {/* Create/Edit Knowledge Base Modal */}
      <Modal
        size="sm"
        open={isModalOpen}
        modalHeading={editMode ? "Edit Knowledge Base" : "Create Knowledge Base"}
        primaryButtonText={editMode ? "Update" : "Create"}
        secondaryButtonText="Cancel"
        onRequestSubmit={handleSave}
        onRequestClose={closeModal}
        preventCloseOnClickOutside
      >
        <TextInput
          id="knowledge-base-name"
          labelText="Name"
          placeholder="Enter a name for this knowledge base"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          required
          className="margin-bottom-1rem"
        />
        <TextArea
          id="knowledge-base-description"
          labelText="Description (optional)"
          placeholder="Enter a description for this knowledge base"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          rows={3}
        />
      </Modal>

      {/* Search Modal */}
      <KnowledgeSearchModal
        open={isSearchModalOpen}
        onClose={handleCloseSearch}
        knowledgeBase={searchKnowledgeBase}
      />

      {/* Upload Modal */}
      <UploadModal
        open={isUploadModalOpen}
        onClose={handleCloseUploadModal}
        onUpload={handleFileUpload}
        options={{
          title: "Add Files to Knowledge Base",
          description:
            "Upload documents to add to your knowledge base. Supported formats include text, code, data files, and PDFs.",
          subdescription: "PDFs will be processed to extract text content using OCR if needed.",
          multiple: true,
          accept: ACCEPTED_FILE_EXTENSIONS,
        }}
        progress={uploadProgress}
        isUploading={isUploading}
      />
    </div>
  );
};

export default KnowledgePage;
