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
import { saveTool } from "@utils/storageUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wrench,
  Search as SearchIcon,
  FunctionSquare,
} from "lucide-react";
import ToolModal from "@components/modals/ToolModal";
import EmptyState from "@components/shared/EmptyState";
import { loadTools, deleteTool, clearAllTools } from "@utils/storageUtils";
import { formatDate, truncateText } from "@utils/uiUtils";

const ToolsPage = () => {
  const { showSuccess, showError } = useToast();

  // Custom hooks - Modal and URL search
  const {
    isOpen: isModalOpen,
    currentItem: currentTool,
    editMode,
    openCreate,
    openEdit,
    close: closeModal,
  } = useModalState();

  // Load tools from localStorage
  const { data: tools, isLoading, setData: setTools } = useLocalStorageData(loadTools);

  // Search and filter matcher
  const toolMatcher = useCallback((tool, lowercaseTerm) => {
    const idMatch = tool.id.toString().includes(lowercaseTerm);
    const nameMatch = tool.name.toLowerCase().includes(lowercaseTerm);
    const descriptionMatch = tool.description
      ? tool.description.toLowerCase().includes(lowercaseTerm)
      : false;
    return idMatch || nameMatch || descriptionMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredTools,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(tools, toolMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedTools,
    handlePageChange,
    resetPage,
  } = usePagination(filteredTools, { initialPageSize: 10 });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedTool, setImportedTool] = useState(null);
  const [importToolName, setImportToolName] = useState("");

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setTools });

  const handleDeleteTool = handleDelete({
    title: "Delete Tool",
    body: "Are you sure you want to delete this tool?",
    deleteOperation: (id) => deleteTool(id),
    successMessage: "Tool deleted",
    successDescription: "The tool has been removed",
  });

  const handleClearAllTools = handleClearAll({
    title: "Clear All Tools",
    body: "Are you sure you want to delete all tools? This action cannot be undone.",
    deleteOperation: () => clearAllTools(),
    successMessage: "All tools cleared",
    successDescription: "All tools have been removed",
  });

  const handleSaveTool = (updatedTools) => {
    setTools(updatedTools);
    showSuccess(
      editMode ? "Tool updated" : "Tool created",
      editMode ? "The tool has been updated successfully" : "A new tool has been created"
    );
  };

  // Import/Export handlers
  const { handleExport, handleImport } = useImportExport();

  const handleExportTool = handleExport({
    getFilename: (tool) => `RPI-tool-${tool.name.replace(/\s+/g, "-")}`,
    successMessage: "Tool exported",
    successDescription: "The tool has been exported as JSON file",
  });

  const handleImportTool = handleImport({
    requiredFields: ["name", "type"],
    onImport: (importedData) => {
      setImportedTool(importedData);
      setImportToolName(importedData.name);
      setImportModalOpen(true);
    },
  });

  // Handle saving imported tool
  const handleSaveImportedTool = async () => {
    if (!importToolName.trim()) {
      showError("Validation Error", "Tool name is required");
      return;
    }

    // Create new tool object with imported data
    const newTool = {
      type: importedTool.type || "function",
      name: importToolName,
      description: importedTool.description || "",
      parameters: importedTool.parameters || {},
      functionCode: importedTool.functionCode || "",
    };

    // Save the tool
    const updatedTools = await saveTool(newTool);
    setTools(updatedTools);

    // Close modal and reset state
    setImportModalOpen(false);
    setImportedTool(null);
    setImportToolName("");

    showSuccess("Tool imported", "The tool has been imported successfully");
  };

  const headers = [
    { key: "name", header: "Name" },
    { key: "timestamp", header: "Date Created" },
    { key: "actions", header: "" },
  ];

  const toolRows = paginatedTools;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tools</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or description"
              onChange={(e) => handleSearchChange(e)}
              value={searchTerm}
              className="pl-9 w-80"
              disabled={!tools || !tools.length}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportTool}>Import tool</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAllTools}
                disabled={!tools || !tools.length}
                className="text-destructive"
              >
                Delete all tools
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
      ) : !tools || tools.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No tools yet"
          description="Create a new tool to get started with custom functions and utilities."
        />
      ) : filteredTools.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching tools"
          description="No tools match your search criteria. Try a different search term."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toolRows.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FunctionSquare className="h-4 w-4 text-muted-foreground" />
                        <span title={tool.description}>{truncateText(tool.name, 50)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(tool.timestamp)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            openEdit({
                              id: tool.id,
                              type: tool.type,
                              name: tool.name,
                              description: tool.description,
                              parameters: tool.parameters,
                              functionCode: tool.functionCode,
                            })
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportTool(tool)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTool(tool.id)}
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

      {/* Tool Modal */}
      <ToolModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editMode={editMode}
        initialTool={currentTool}
        onSave={handleSaveTool}
      />

      {/* Import Tool Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a name for the imported tool:
            </p>
            <div className="space-y-2">
              <Label htmlFor="import-tool-name">Tool Name</Label>
              <Input
                id="import-tool-name"
                placeholder="Enter a name for this tool"
                value={importToolName}
                onChange={(e) => setImportToolName(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportedTool(null);
                setImportToolName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveImportedTool}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ToolsPage;
