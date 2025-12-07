import React, { useState, useCallback } from "react";
import { useToast } from "@context/ToastContext";
import {
  useModalState,
  usePagination,
  useSearchAndFilter,
  useLocalStorageData,
  useConfirmDelete,
  useImportExport,
} from "@hooks";
import { saveContext } from "@utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination as UIPagination } from "@/components/ui/pagination";
import {
  Trash2,
  Plus,
  Edit,
  MoreVertical,
  Download,
  Search as SearchIcon,
  MessageSquare,
} from "lucide-react";
import ContextModal from "@components/modals/ContextModal";
import EmptyState from "@components/shared/EmptyState";
import { loadContexts, deleteContext, clearAllContexts } from "@utils/storageUtils";
import { formatDate, truncateText } from "@utils/uiUtils";

const ContextsPage = () => {
  const { showSuccess, showError } = useToast();

  // Custom hooks - Modal and URL search
  const {
    isOpen: isModalOpen,
    currentItem: currentContext,
    editMode,
    openCreate,
    openEdit,
    close: closeModal,
  } = useModalState();

  // Load contexts from localStorage
  const { data: contexts, isLoading, setData: setContexts } = useLocalStorageData(loadContexts);

  // Search and filter matcher
  const contextMatcher = useCallback((context, lowercaseTerm) => {
    const idMatch = context.id.toString().includes(lowercaseTerm);
    const nameMatch = context.name.toLowerCase().includes(lowercaseTerm);
    const messageMatch = context.messages.some((msg) =>
      msg.message.toLowerCase().includes(lowercaseTerm)
    );
    return idMatch || nameMatch || messageMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredContexts,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(contexts, contextMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedContexts,
    handlePageChange,
    resetPage,
  } = usePagination(filteredContexts, { initialPageSize: 10 });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedContext, setImportedContext] = useState(null);
  const [importContextName, setImportContextName] = useState("");

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setContexts });

  const handleDeleteContext = handleDelete({
    title: "Delete Conversation",
    body: "Are you sure you want to delete this conversation?",
    deleteOperation: (id) => deleteContext(id),
    successMessage: "Conversation deleted",
    successDescription: "The conversation has been removed",
  });

  const handleClearAllContexts = handleClearAll({
    title: "Clear All Conversations",
    body: "Are you sure you want to delete all conversations? This action cannot be undone.",
    deleteOperation: () => clearAllContexts(),
    successMessage: "All conversations cleared",
    successDescription: "All conversations have been removed",
  });

  const handleSaveContext = (updatedContexts) => {
    setContexts(updatedContexts);
    showSuccess(
      editMode ? "Conversation updated" : "Conversation created",
      editMode
        ? "The conversation has been updated successfully"
        : "A new conversation has been created"
    );
  };

  // Import/Export handlers
  const { handleExport, handleImport } = useImportExport();

  const handleExportContext = handleExport({
    getFilename: (context) => `RPI-conversation-${context.name.replace(/\s+/g, "-")}`,
    successMessage: "Conversation exported",
    successDescription: "The conversation has been exported as JSON file",
  });

  const handleImportContext = handleImport({
    requiredFields: ["name", "messages"],
    onImport: (importedData) => {
      setImportedContext(importedData);
      setImportContextName(importedData.name);
      setImportModalOpen(true);
    },
  });

  // Handle saving imported context
  const handleSaveImportedContext = async () => {
    if (!importContextName.trim()) {
      showError("Validation Error", "Conversation name is required");
      return;
    }

    // Check for duplicate names
    const isDuplicate = contexts.some(
      (context) => context.name.toLowerCase() === importContextName.toLowerCase()
    );

    if (isDuplicate) {
      showError(
        "Validation Error",
        "A conversation with this name already exists. Please use a unique name."
      );
      return;
    }

    // Create new context object with imported data
    const newContext = {
      name: importContextName,
      messages: importedContext.messages,
    };

    // Save the context
    const updatedContexts = await saveContext(newContext);
    setContexts(updatedContexts);

    // Close modal and reset state
    setImportModalOpen(false);
    setImportedContext(null);
    setImportContextName("");

    showSuccess("Conversation imported", "The conversation has been imported successfully");
  };

  const headers = [
    { key: "name", header: "Name" },
    { key: "timestamp", header: "Date Created" },
    { key: "messageCount", header: "Messages" },
    { key: "tokens", header: "Tokens" },
    { key: "actions", header: "" },
  ];

  const contextRows = paginatedContexts;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or message content"
              onChange={(e) => handleSearchChange(e)}
              value={searchTerm}
              className="pl-9 w-80"
              disabled={!contexts || !contexts.length}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportContext}>Import conversation</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAllContexts}
                disabled={!contexts || !contexts.length}
                className="text-destructive"
              >
                Delete all conversations
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: pageSize }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !contexts || contexts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Create a new conversation to get started with managing conversation history."
        />
      ) : filteredContexts.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching conversations"
          description="No conversations match your search criteria. Try a different search term."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contextRows.map((context) => (
                  <TableRow key={context.id}>
                    <TableCell>
                      <span title={context.name}>{truncateText(context.name, 20)}</span>
                    </TableCell>
                    <TableCell>{formatDate(context.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{context.messages.length.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {context.totalTokens !== undefined ? context.totalTokens.toLocaleString() : "..."}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openEdit({
                              id: context.id,
                              name: context.name,
                              messages: [...context.messages],
                            })
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportContext(context)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContext(context.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <UIPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize)}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            pageSizeOptions={[5, 10, 15, 25, 50]}
          />
        </>
      )}

      {/* Context Modal */}
      <ContextModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editMode={editMode}
        initialContext={currentContext}
        onSave={handleSaveContext}
      />

      {/* Import Context Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a name for the imported conversation:
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-context-name">Conversation Name</Label>
              <Input
                id="import-context-name"
                placeholder="Enter a name for this conversation"
                value={importContextName}
                onChange={(e) => setImportContextName(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportedContext(null);
                setImportContextName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveImportedContext}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContextsPage;
