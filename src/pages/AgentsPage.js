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
import { saveAgent } from "@utils/storageUtils";
import { validateAgentName } from "@utils/uiUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Menu, Search as SearchIcon, Bot } from "lucide-react";
import AgentModal from "@components/modals/AgentModal";
import ChatModal from "@components/modals/ChatModal";
import { AgentCard, AgentCardSkeleton } from "@components/AgentsComponent";
import EmptyState from "@components/shared/EmptyState";
import { loadAgents, deleteAgent, clearAllAgents } from "@utils/storageUtils";

const AgentsPage = () => {
  const { showSuccess, showError } = useToast();

  // Custom hooks - Modal and URL search
  const {
    isOpen: isModalOpen,
    currentItem: currentAgent,
    editMode,
    openCreate,
    openEdit,
    close: closeModal,
  } = useModalState();

  // Load agents from localStorage
  const { data: agents, isLoading, setData: setAgents } = useLocalStorageData(loadAgents);

  // Sort agents from latest to oldest (by id which is a timestamp)
  const sortedAgents = React.useMemo(() => {
    if (!agents) return [];
    return [...agents].sort((a, b) => b.id - a.id);
  }, [agents]);

  // Search and filter matcher
  const agentMatcher = useCallback((agent, lowercaseTerm) => {
    const idMatch = agent.id.toString().includes(lowercaseTerm);
    const nameMatch = agent.name.toLowerCase().includes(lowercaseTerm);
    const instructionsMatch = agent.instructions
      ? agent.instructions.toLowerCase().includes(lowercaseTerm)
      : false;
    return idMatch || nameMatch || instructionsMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredAgents,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(sortedAgents, agentMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedAgents,
    handlePageChange,
    resetPage,
  } = usePagination(filteredAgents, { initialPageSize: 12 });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedAgent, setImportedAgent] = useState(null);
  const [importAgentName, setImportAgentName] = useState("");

  // Chat modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatAgent, setChatAgent] = useState(null);

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setAgents });

  const handleDeleteAgent = handleDelete({
    title: "Delete Agent",
    body: "Are you sure you want to delete this agent?",
    deleteOperation: (id) => deleteAgent(id),
    successMessage: "Agent deleted",
    successDescription: "The agent has been removed",
  });

  const handleClearAllAgents = handleClearAll({
    title: "Clear All Agents",
    body: "Are you sure you want to delete all agents? This action cannot be undone.",
    deleteOperation: () => clearAllAgents(),
    successMessage: "All agents cleared",
    successDescription: "All agents have been removed",
  });

  const handleSaveAgent = async (agent) => {
    const updatedAgents = await saveAgent(agent);
    setAgents(updatedAgents);

    // Reload all agents from storage to ensure we have fresh references
    // This is important because other agents might have been updated by propagation
    const freshAgents = await loadAgents();
    setAgents(freshAgents);

    showSuccess(
      editMode ? "Agent updated" : "Agent created",
      editMode ? "The agent has been updated successfully" : "A new agent has been created"
    );
  };

  // Import/Export handlers
  const { handleExport, handleImport } = useImportExport();

  const handleExportAgent = handleExport({
    getFilename: (agent) => `RPI-agent-${agent.name.replace(/\s+/g, "-")}`,
    successMessage: "Agent exported",
    successDescription: "The agent has been exported as JSON file",
  });

  const handleImportAgent = handleImport({
    requiredFields: ["name", "instructions"],
    onImport: (importedData) => {
      setImportedAgent(importedData);
      setImportAgentName(importedData.name);
      setImportModalOpen(true);
    },
  });

  // Handle saving imported agent
  const handleSaveImportedAgent = async () => {
    // Validate agent name
    const validationError = validateAgentName(importAgentName.trim(), agents);
    if (validationError) {
      showError("Invalid Agent Name", validationError);
      return;
    }

    // Create new agent object with imported data
    const newAgent = {
      name: importAgentName.trim(),
      instructions: importedAgent.instructions || "",
      selectedTools: importedAgent.selectedTools || [],
      coreModel: importedAgent.coreModel,
      useJsonOutput: importedAgent.useJsonOutput || false,
      useJsonSchema: importedAgent.useJsonSchema || false,
      jsonSchema: importedAgent.jsonSchema || "",
      jsonSchemaStrict: importedAgent.jsonSchemaStrict || false,
      chatMessages: importedAgent.chatMessages || [],
    };

    // Save the agent
    const updatedAgents = await saveAgent(newAgent);
    setAgents(updatedAgents);

    // Close modal and reset state
    setImportModalOpen(false);
    setImportedAgent(null);
    setImportAgentName("");

    showSuccess("Agent imported", "The agent has been imported successfully");
  };

  const handleChatWithAgent = (agent) => {
    setChatAgent(agent);
    setIsChatModalOpen(true);
  };

  const handleUpdateChatMessages = async (messages) => {
    // Update chat messages in the agent and persist to storage
    if (chatAgent && chatAgent.id) {
      const updatedAgent = {
        ...chatAgent,
        chatMessages: messages,
      };

      // Save the updated agent
      const updatedAgents = await saveAgent(updatedAgent);
      setAgents(updatedAgents);

      // Update the current chatAgent state
      setChatAgent(updatedAgent);
    }
  };

  return (
    <div className="agents-page margin-bottom-2rem">
      <div className="contextPage">
        <h1 className="sectionTitle">Agents</h1>
        <div className="flex-center">
          <Button
            size="default"
            variant="secondary"
            onClick={openCreate}
            className="margin-right-1rem"
          >
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, name, or instructions"
              onChange={handleSearchChange}
              value={searchTerm}
              className="pl-9"
              disabled={!agents || !agents.length}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="margin-left-1rem" aria-label="Agents menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportAgent}>
                Import agent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAllAgents}
                disabled={!agents || !agents.length}
                className="text-destructive"
              >
                Delete all agents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="row-gap-0">
        <div className="w-full">
          {isLoading ? (
            <div className="agents-skeleton">
              {Array.from({ length: pageSize }).map((_, index) => (
                <AgentCardSkeleton key={index} />
              ))}
            </div>
          ) : !agents || agents.length === 0 ? (
            <EmptyState
              icon={Bot}
              title="No agents yet"
              description="Create a new agent to save and reuse form configurations with instructions, tools, and models."
            />
          ) : filteredAgents.length === 0 ? (
            <EmptyState
              icon={SearchIcon}
              title="No matching agents"
              description="No agents match your search criteria. Try a different search term."
            />
          ) : (
            <div className="agents-grid">
              {paginatedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={() =>
                    openEdit({
                      id: agent.id,
                      name: agent.name,
                      description: agent.description,
                      instructions: agent.instructions,
                      selectedTools: agent.selectedTools,
                      coreModel: agent.coreModel,
                      useJsonOutput: agent.useJsonOutput,
                      useJsonSchema: agent.useJsonSchema,
                      jsonSchema: agent.jsonSchema,
                      jsonSchemaStrict: agent.jsonSchemaStrict,
                      chatMessages: agent.chatMessages || [],
                    })
                  }
                  onDelete={() => handleDeleteAgent(agent.id)}
                  onExport={() => handleExportAgent(agent)}
                  onChat={() => handleChatWithAgent(agent)}
                />
              ))}
            </div>
          )}
        </div>
        {!isLoading &&
          agents &&
          agents.length > 0 &&
          filteredAgents.length > 0 &&
          Math.ceil(totalItems / pageSize) > 1 && (
            <div className="w-full margin-top-2rem flex-center flex-justify">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && handlePageChange({ page: currentPage - 1, pageSize })}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, Math.ceil(totalItems / pageSize)) }).map((_, i) => {
                    const totalPages = Math.ceil(totalItems / pageSize);
                    let pageNum = i + 1;
                    
                    // Smart pagination display logic
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => handlePageChange({ page: pageNum, pageSize })}
                          isActive={currentPage === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < Math.ceil(totalItems / pageSize) && handlePageChange({ page: currentPage + 1, pageSize })}
                      disabled={currentPage === Math.ceil(totalItems / pageSize)}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
      </div>

      {/* Agent Modal */}
      <AgentModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editMode={editMode}
        initialAgent={currentAgent}
        onSave={handleSaveAgent}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => {
          setIsChatModalOpen(false);
          setChatAgent(null);
        }}
        formData={{
          id: chatAgent?.id, // Current agent ID to prevent self-reference
          instructions: chatAgent?.instructions,
          coreModel: chatAgent?.coreModel,
          selectedTools: chatAgent?.selectedTools,
          chatMessages: chatAgent?.chatMessages || [],
          useJsonOutput: chatAgent?.useJsonOutput,
          useJsonSchema: chatAgent?.useJsonSchema,
          jsonSchema: chatAgent?.jsonSchema,
          jsonSchemaStrict: chatAgent?.jsonSchemaStrict,
        }}
        onUpdateMessages={handleUpdateChatMessages}
        modalTitle={`Chat with ${chatAgent?.name || "assistant"}`}
      />

      {/* Import Agent Modal */}
      <Dialog
        open={importModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImportModalOpen(false);
            setImportedAgent(null);
            setImportAgentName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Agent</DialogTitle>
            <DialogDescription>
              Please provide a name for the imported agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-agent-name">Agent Name</Label>
              <Input
                id="import-agent-name"
                placeholder="Enter a name for this agent"
                value={importAgentName}
                onChange={(e) => setImportAgentName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                1-64 characters, must start with a letter, can contain letters, numbers, hyphens, and underscores
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportedAgent(null);
                setImportAgentName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveImportedAgent}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentsPage;
