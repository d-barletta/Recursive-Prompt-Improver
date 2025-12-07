import React, { useState, useCallback, useEffect } from "react";
import { useToast } from "@context/ToastContext";
import {
  useModalState,
  usePagination,
  useSearchAndFilter,
  useLocalStorageData,
  useConfirmDelete,
  useImportExport,
} from "@hooks";
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandRow,
  TableExpandedRow,
  TableExpandHeader,
  Button,
  Grid,
  Column,
  Pagination,
  Search,
  OverflowMenu,
  OverflowMenuItem,
  Modal,
  TextInput,
  DataTableSkeleton,
  Tile,
  Toggle,
  ComboBox,
  InlineNotification,
  Accordion,
  AccordionItem,
  CodeSnippet,
} from "@carbon/react";
import {
  TrashCan,
  Add,
  Edit,
  Menu,
  Download,
  Renew,
  Connect,
  SearchLocateMirror,
} from "@carbon/icons-react";
import MCPModal from "@components/modals/MCPModal";
import EmptyState from "@components/shared/EmptyState";
import { AdvancedMultiselect } from "@components/shared";
import {
  loadMCPServers,
  deleteMCPServer,
  clearAllMCPServers,
  updateMCPServerStatus,
  saveMCPServer,
} from "@utils/storageUtils";
import { formatDate, truncateText } from "@utils/uiUtils";
import * as MCP from "@core/MCP";

const MCPPage = () => {
  const { showSuccess, showError } = useToast();

  // Custom hooks - Modal and URL search
  const {
    isOpen: isModalOpen,
    currentItem: currentServer,
    editMode,
    openCreate,
    openEdit,
    close: closeModal,
  } = useModalState();

  // Load servers from localStorage
  const { data: servers, isLoading, setData: setServers } = useLocalStorageData(loadMCPServers);

  // Track server connections
  const [connections, setConnections] = useState({});

  // Exposed MCP server state
  const [exposedServerConfig, setExposedServerConfig] = useState({
    isActive: false,
    port: MCP.DEFAULT_MCP_SERVER_PORT,
    selectedItems: [],
  });
  const [exposableItems, setExposableItems] = useState([]);
  const [isLoadingExposed, setIsLoadingExposed] = useState(true);
  const [isTogglingServer, setIsTogglingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState({ isRunning: false, isElectron: false });
  const [portComboKey, setPortComboKey] = useState(0);

  // Search and filter matcher
  const serverMatcher = useCallback((server, lowercaseTerm) => {
    const idMatch = server.id.toString().includes(lowercaseTerm);
    const nameMatch = server.name.toLowerCase().includes(lowercaseTerm);
    const urlMatch = server.url ? server.url.toLowerCase().includes(lowercaseTerm) : false;
    return idMatch || nameMatch || urlMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredServers,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(servers, serverMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedServers,
    handlePageChange,
    resetPage,
  } = usePagination(filteredServers, { initialPageSize: 10 });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedServer, setImportedServer] = useState(null);
  const [importServerName, setImportServerName] = useState("");

  // Load exposed server configuration and status
  useEffect(() => {
    const loadExposedConfig = async () => {
      setIsLoadingExposed(true);
      try {
        const [config, items, status] = await Promise.all([
          MCP.getExposedServerConfig(),
          MCP.getExposableItems(),
          MCP.getExposedServerStatus(),
        ]);
        setExposedServerConfig(config);
        setExposableItems(items);
        setServerStatus(status);
      } catch (error) {
        console.error("Error loading exposed server config:", error);
      }
      setIsLoadingExposed(false);
    };
    loadExposedConfig();
  }, []);

  // Handle exposed server toggle
  const handleToggleExposedServer = async (checked) => {
    setIsTogglingServer(true);
    try {
      const result = await MCP.toggleExposedServer(checked, exposedServerConfig);
      if (result.success) {
        const newConfig = { ...exposedServerConfig, isActive: checked };
        await MCP.saveExposedServerConfig(newConfig);
        setExposedServerConfig(newConfig);
        setServerStatus((prev) => ({ ...prev, isRunning: checked }));
        showSuccess(
          checked ? "MCP Server Started" : "MCP Server Stopped",
          checked
            ? `Server is now running on port ${exposedServerConfig.port}`
            : "Server has been stopped"
        );
      } else {
        showError("Server Error", result.error || "Failed to toggle server");
      }
    } catch (error) {
      showError("Server Error", error.message || "Failed to toggle server");
    }
    setIsTogglingServer(false);
  };

  // Handle port change (from dropdown selection)
  const handlePortChange = async ({ selectedItem }) => {
    if (!selectedItem) return;
    const port = parseInt(selectedItem) || MCP.DEFAULT_MCP_SERVER_PORT;
    if (port >= 3001 && port <= 65000) {
      const newConfig = { ...exposedServerConfig, port };
      setExposedServerConfig(newConfig);
      await MCP.saveExposedServerConfig(newConfig);
    }
  };

  // Handle port blur - validate custom input and save if valid, otherwise reset
  const handlePortBlur = async (e) => {
    const inputValue = e.target.value?.trim();

    if (!inputValue) {
      // Empty input - reset to current selected value
      setPortComboKey((prev) => prev + 1);
      return;
    }

    const port = parseInt(inputValue);
    if (!isNaN(port) && port >= 3001 && port <= 65000) {
      // Valid custom port - save it
      const newConfig = { ...exposedServerConfig, port };
      setExposedServerConfig(newConfig);
      await MCP.saveExposedServerConfig(newConfig);
      // Force re-render to show the new value properly
      setPortComboKey((prev) => prev + 1);
    } else {
      // Invalid port - reset to current selected value
      setPortComboKey((prev) => prev + 1);
    }
  };

  // Handle Enter key - validate and show error if invalid, then blur
  const handlePortKeyDown = (e) => {
    if (e.key === "Enter") {
      const inputValue = e.target.value?.trim();
      if (inputValue) {
        const port = parseInt(inputValue);
        if (isNaN(port) || port < 3001 || port > 65000) {
          showError("Invalid Port", "Port must be a number between 3001 and 65000");
        }
      }
      e.target.blur();
    }
  };

  // Handle tool/agent selection change
  const handleSelectionChange = async ({ selectedItems }) => {
    const newConfig = { ...exposedServerConfig, selectedItems };
    setExposedServerConfig(newConfig);
    await MCP.saveExposedServerConfig(newConfig);
  };

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setServers });

  const handleDeleteServer = handleDelete({
    title: "Delete MCP Server",
    body: "Are you sure you want to delete this MCP server?",
    deleteOperation: async (id) => {
      // Close connection if exists
      if (connections[id]) {
        await connections[id].close();
        setConnections((prev) => {
          const newConnections = { ...prev };
          delete newConnections[id];
          return newConnections;
        });
      }
      return deleteMCPServer(id);
    },
    successMessage: "MCP server deleted",
    successDescription: "The MCP server has been removed",
  });

  const handleClearAllServers = handleClearAll({
    title: "Clear All MCP Servers",
    body: "Are you sure you want to delete all MCP servers? This action cannot be undone.",
    deleteOperation: async () => {
      // Close all connections
      for (const conn of Object.values(connections)) {
        await conn.close();
      }
      setConnections({});
      return clearAllMCPServers();
    },
    successMessage: "All MCP servers cleared",
    successDescription: "All MCP servers have been removed",
  });

  const handleSaveServer = async (updatedServers) => {
    setServers(updatedServers);
    showSuccess(
      editMode ? "MCP server updated" : "MCP server created",
      editMode
        ? "The MCP server has been updated successfully"
        : "A new MCP server has been created"
    );
  };

  // Import/Export handlers
  const { handleExport, handleImport } = useImportExport();

  const handleExportServer = handleExport({
    getFilename: (server) => `RPI-mcp-${server.name.replace(/\s+/g, "-")}`,
    successMessage: "MCP server exported",
    successDescription: "The MCP server has been exported as JSON file",
  });

  const handleImportServer = handleImport({
    requiredFields: ["name", "url"],
    onImport: (importedData) => {
      setImportedServer(importedData);
      setImportServerName(importedData.name);
      setImportModalOpen(true);
    },
  });

  // Handle saving imported server
  const handleSaveImportedServer = async () => {
    if (!importServerName.trim()) {
      showError("Validation Error", "Server name is required");
      return;
    }

    // Create new server object with imported data
    const newServer = {
      name: importServerName,
      url: importedServer.url || "",
      headers: importedServer.headers || {},
    };

    // Test connection before saving
    const result = await MCP.testConnection(newServer);

    if (result.success) {
      newServer.status = "connected";
      newServer.toolCount = result.toolCount;
      newServer.lastError = null;
    } else {
      newServer.status = "error";
      newServer.toolCount = 0;
      newServer.lastError = result.error;
    }

    // Save the server
    const updatedServers = await saveMCPServer(newServer);
    setServers(updatedServers);

    // Close modal and reset state
    setImportModalOpen(false);
    setImportedServer(null);
    setImportServerName("");

    showSuccess("MCP server imported", "The MCP server has been imported successfully");
  };

  // Refresh server connection (fetch tools)
  const handleRefreshServer = async (server) => {
    try {
      // Update status to connecting
      await updateMCPServerStatus(server.id, {
        status: "connecting",
      });
      setServers(await loadMCPServers());

      // Test connection
      const result = await MCP.testConnection({
        url: server.url,
        headers: server.headers,
      });

      // Update status based on result
      await updateMCPServerStatus(server.id, {
        status: result.success ? "connected" : "error",
        toolCount: result.toolCount,
        tools: result.tools || [],
        lastError: result.success ? null : result.error,
      });

      setServers(await loadMCPServers());

      if (result.success) {
        showSuccess(
          "Connection refreshed",
          `Connected successfully. Found ${result.toolCount} tools.`
        );
      } else {
        showError("Connection failed", result.error);
      }
    } catch (error) {
      console.error("Error refreshing server:", error);
      showError("Refresh failed", error.message);
    }
  };

  // Get status indicator (colored circle)
  const getStatusIndicator = (status) => {
    const colors = {
      connected: "#24a148", // green
      connecting: "#f1c21b", // yellow
      error: "#da1e28", // red
      disconnected: "#8d8d8d", // gray
    };

    return (
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: colors[status] || colors.disconnected,
          display: "inline-block",
          marginRight: "8px",
        }}
        title={status}
      />
    );
  };

  // Clean up connections on unmount
  useEffect(() => {
    return () => {
      Object.values(connections).forEach((conn) => {
        conn.close();
      });
    };
  }, [connections]);

  const headers = [
    { key: "name", header: "Name" },
    { key: "status", header: "Status" },
    { key: "toolCount", header: "Tools" },
    { key: "timestamp", header: "Date Created" },
    { key: "actions", header: "" },
  ];

  const rows = paginatedServers.map((server) => ({
    id: server.id.toString(),
    status: (
      <span style={{ display: "flex", alignItems: "center" }}>
        {getStatusIndicator(server.status || "disconnected")}
        <span style={{ textTransform: "capitalize" }}>{server.status || "disconnected"}</span>
      </span>
    ),
    name: <span title={server.name}>{truncateText(server.name, 20)}</span>,
    toolCount: server.toolCount || 0,
    timestamp: formatDate(server.timestamp),
    tools: server.tools || [],
    actions: (
      <div className="tableActionsContainer">
        <div></div>
        <div className="tableActionsDiv">
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            iconDescription="Refresh"
            tooltipPosition="top"
            hasIconOnly
            onClick={() => handleRefreshServer(server)}
            disabled={server.status === "connecting"}
          >
            Refresh
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Edit}
            iconDescription="Edit"
            tooltipPosition="top"
            hasIconOnly
            onClick={() =>
              openEdit({
                id: server.id,
                name: server.name,
                url: server.url,
                headers: server.headers,
              })
            }
          >
            Edit
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Download}
            iconDescription="Export"
            tooltipPosition="top"
            hasIconOnly
            onClick={() => handleExportServer(server)}
          >
            Export
          </Button>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            iconDescription="Delete"
            tooltipPosition="top"
            hasIconOnly
            onClick={() => handleDeleteServer(server.id)}
          />
        </div>
      </div>
    ),
  }));

  return (
    <div className="margin-bottom-2rem">
      {/* Page Header */}
      <div className="contextPage">
        <h1 className="sectionTitle">MCP Servers</h1>
        <div className="flex-center">
          <Button
            size="md"
            renderIcon={Add}
            kind="tertiary"
            onClick={openCreate}
            className="margin-right-1rem"
          >
            Connect
          </Button>
          <Search
            labelText="Search"
            placeholder="Search by ID, name, or URL"
            onChange={handleSearchChange}
            value={searchTerm}
            size="md"
            className=""
            disabled={!servers || !servers.length}
          />
          <OverflowMenu
            className="margin-left-1rem"
            size="md"
            flipped
            aria-label="MCP servers menu"
            renderIcon={Menu}
          >
            <OverflowMenuItem itemText="Import server" onClick={handleImportServer} />
            <OverflowMenuItem
              hasDivider
              itemText="Delete all servers"
              onClick={handleClearAllServers}
              isDelete
              disabled={!servers || !servers.length}
            />
          </OverflowMenu>
        </div>
      </div>

      <Grid className="row-gap-0">
        <Column lg={16} md={8} sm={4}>
          {/* Exposed MCP Server Section */}
          <Accordion className="margin-bottom-1rem">
            <AccordionItem
              title={
                <span className="exposed-server-accordion-title">
                  <span
                    className={`status-indicator ${serverStatus.isRunning ? "status-indicator--active attention-flash" : ""}`}
                  />
                  Expose MCP Server
                  {serverStatus.isRunning && exposedServerConfig.selectedItems.length > 0 && (
                    <span className="exposed-server-count">
                      ({exposedServerConfig.selectedItems.length} tool
                      {exposedServerConfig.selectedItems.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </span>
              }
            >
              <div className="exposed-server-content">
                {!serverStatus.isElectron && !isLoadingExposed && (
                  <InlineNotification
                    kind="info"
                    title="Desktop App Required"
                    subtitle="MCP server exposure is only available in the Electron desktop app."
                    hideCloseButton
                    lowContrast
                    className="margin-bottom-1rem"
                  />
                )}

                {/* Server Toggle and Port */}
                <div className="exposed-server-controls">
                  <div className="exposed-server-toggle-row">
                    <Toggle
                      id="exposed-server-toggle"
                      labelText="Server Status"
                      labelA="Inactive"
                      labelB="Active"
                      toggled={serverStatus.isRunning}
                      onToggle={handleToggleExposedServer}
                      disabled={
                        !serverStatus.isElectron ||
                        isTogglingServer ||
                        isLoadingExposed ||
                        exposedServerConfig.selectedItems.length === 0
                      }
                    />
                  </div>

                  {/* Port and Server URL */}
                  <div className="exposed-server-url-row">
                    <div className="exposed-server-port">
                      <ComboBox
                        key={portComboKey}
                        id="exposed-server-port"
                        titleText="Port (3001-65000)"
                        items={[
                          "3001",
                          "3100",
                          "4000",
                          "5000",
                          "6000",
                          "7000",
                          "8000",
                          "8080",
                          "8787",
                          "9000",
                          "9090",
                          "10000",
                        ]}
                        selectedItem={exposedServerConfig.port.toString()}
                        onChange={handlePortChange}
                        onBlur={handlePortBlur}
                        onKeyDown={handlePortKeyDown}
                        disabled={serverStatus.isRunning || isTogglingServer}
                        size="md"
                        allowCustomValue
                        placeholder="Enter or select port"
                      />
                    </div>
                    <div className="exposed-server-url">
                      <label className="cds--label">Server URL</label>
                      <div className="exposed-server-url-content">
                        <CodeSnippet
                          type="single"
                          feedback="Copied"
                          copyButtonDescription={"Copy"}
                          className="exposed-server-url-code"
                        >
                          {MCP.getExposedServerUrl(exposedServerConfig.port)}
                        </CodeSnippet>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tool and Agent Selection */}
                <div className="exposed-server-selection margin-top-1rem">
                  <AdvancedMultiselect
                    id="exposed-items-select"
                    titleText="Tools & Agents to Expose"
                    label="Select tools and agents"
                    items={exposableItems}
                    columns={["type"]}
                    filterableColumns={["type"]}
                    itemToString={(item) => {
                      if (!item) return "";
                      const suffix = item.type === "agent" ? " (Agent)" : "";
                      return `${item.name}${suffix}`;
                    }}
                    selectedItems={exposedServerConfig.selectedItems}
                    onChange={handleSelectionChange}
                    disabled={serverStatus.isRunning || isLoadingExposed}
                    direction="bottom"
                  />
                </div>

                {/* Status info */}
                {exposedServerConfig.selectedItems.length === 0 && (
                  <p className="cds--form__helper-text margin-top-1rem">
                    Select at least one tool or agent to expose before activating the server.
                  </p>
                )}
              </div>
            </AccordionItem>
          </Accordion>
        </Column>
        {/* Connected Servers Table */}
        <Column lg={16} md={8} sm={4}>
          {isLoading ? (
            <DataTableSkeleton
              showHeader={false}
              showToolbar={false}
              headers={headers}
              rowCount={pageSize}
              columnCount={headers.length}
            />
          ) : !servers || servers.length === 0 ? (
            <EmptyState
              icon={Connect}
              title="No MCP servers yet"
              description="Create a new MCP server connection to get started with Model Context Protocol integration."
            />
          ) : filteredServers.length === 0 ? (
            <EmptyState
              icon={SearchLocateMirror}
              title="No matching servers"
              description="No servers match your search criteria. Try a different search term."
            />
          ) : (
            <DataTable rows={rows} headers={headers}>
              {({
                rows,
                headers,
                getTableProps,
                getHeaderProps,
                getRowProps,
                getExpandHeaderProps,
              }) => (
                <TableContainer>
                  <Table {...getTableProps()}>
                    <TableHead>
                      <TableRow>
                        <TableExpandHeader enableToggle {...getExpandHeaderProps()} />
                        {headers.map((header, idx) => (
                          <TableHeader {...getHeaderProps({ header })} key={`${idx}`}>
                            {header.header}
                          </TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => {
                        const server = paginatedServers.find((s) => s.id.toString() === row.id);
                        const tools = server?.tools || [];

                        return (
                          <React.Fragment key={row.id}>
                            <TableExpandRow {...getRowProps({ row })} key={row.id}>
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableExpandRow>
                            <TableExpandedRow colSpan={headers.length + 1}>
                              <div>
                                {tools.length === 0 ? (
                                  <p className="cds--form__helper-text">
                                    No tools available. Click Refresh to fetch tools from this MCP
                                    server.
                                  </p>
                                ) : (
                                  <div>
                                    <h6 style={{ marginBottom: "0.5rem", fontWeight: 600 }}>
                                      Available Tools ({tools.length.toLocaleString()})
                                    </h6>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "0.5rem",
                                        flexDirection: "column",
                                      }}
                                    >
                                      {tools.map((tool, toolIdx) => (
                                        <Tile
                                          key={toolIdx}
                                          style={{
                                            padding: "0.75rem",
                                            maxWidth: "70vw",
                                            textWrap: "auto",
                                          }}
                                        >
                                          <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                                            {tool.name}
                                          </div>
                                          {tool.description && (
                                            <div style={{ fontSize: "0.75rem" }}>
                                              {tool.description}
                                            </div>
                                          )}
                                        </Tile>
                                      ))}
                                    </div>
                                  </div>
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
        {isLoading || !servers || servers.length === 0 || filteredServers.length === 0 ? (
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

      {/* MCP Modal */}
      <MCPModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editMode={editMode}
        initialServer={currentServer}
        onSave={handleSaveServer}
      />

      {/* Import Server Modal */}
      <Modal
        size="sm"
        open={importModalOpen}
        modalHeading="Import MCP Server"
        primaryButtonText="Import"
        secondaryButtonText="Cancel"
        onRequestSubmit={handleSaveImportedServer}
        onRequestClose={() => {
          setImportModalOpen(false);
          setImportedServer(null);
          setImportServerName("");
        }}
        preventCloseOnClickOutside
      >
        <p className="margin-bottom-1rem">Please provide a name for the imported MCP server:</p>
        <TextInput
          id="import-server-name"
          labelText="Server Name"
          placeholder="Enter a name for this server"
          value={importServerName}
          onChange={(e) => setImportServerName(e.target.value)}
          required
        />
      </Modal>
    </div>
  );
};

export default MCPPage;
