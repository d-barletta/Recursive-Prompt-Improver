import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@context/ToastContext";
import { useConfirm } from "@context/ConfirmContext";
import {
  usePagination,
  useSearchAndFilter,
  useLocalStorageData,
  useConfirmDelete,
  useImportExport,
} from "@hooks";
import { truncateText } from "@utils/uiUtils";
import ReactECharts from "echarts-for-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Pagination as UIPagination } from "@/components/ui/pagination";
import {
  Eye,
  MoreVertical,
  Search as SearchIcon,
  LineChart,
  Play as PlayIcon,
  Download,
  Trash2,
} from "lucide-react";
import {
  loadSessions,
  deleteSession,
  clearAllSessions,
  loadSessionIntoForm,
  saveSession,
} from "@utils/storageUtils";
import { formatDate } from "@utils/uiUtils";
import SessionDetailsModal from "@components/modals/SessionDetailsModal";
import EmptyState from "@components/shared/EmptyState";
import { useLoading } from "@context/LoadingContext";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";

const headers = [
  { key: "timestamp", header: "Date" },
  { key: "model", header: "Test Model" },
  { key: "instructions", header: "Instructions" },
  { key: "iterations", header: "Iterations / Test" },
  { key: "actions", header: "" },
];

const SessionsPage = () => {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { confirm } = useConfirm();
  const { isLoading } = useLoading();

  // Load sessions from localStorage
  const {
    data: sessions,
    isLoading: isLoadingSessions,
    setData: setSessions,
  } = useLocalStorageData(loadSessions);

  // Search and filter matcher
  const sessionMatcher = useCallback((session, lowercaseTerm) => {
    const instructionsMatch = session.instructions.toLowerCase().includes(lowercaseTerm);
    const modelMatch =
      session.coreModel && session.coreModel.text.toLowerCase().includes(lowercaseTerm);
    return instructionsMatch || modelMatch;
  }, []);

  // Search and filter
  const {
    searchTerm,
    filteredItems: filteredSessions,
    totalItems,
    handleSearchChange,
  } = useSearchAndFilter(sessions, sessionMatcher, {
    onSearchChange: () => resetPage(),
  });

  // Pagination
  const {
    currentPage,
    pageSize,
    paginatedData: paginatedSessions,
    handlePageChange,
    resetPage,
  } = usePagination(filteredSessions, { initialPageSize: 10 });

  // Modal state
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete handlers with confirmation
  const { handleDelete, handleClearAll } = useConfirmDelete({ setData: setSessions });

  const handleDeleteSession = handleDelete({
    title: "Delete Session",
    body: "Are you sure you want to delete this session?",
    deleteOperation: (id) => deleteSession(id),
    successMessage: "Session deleted",
    successDescription: "The session has been removed",
  });

  const handleClearAllSessions = handleClearAll({
    title: "Clear All Sessions",
    body: "Are you sure you want to delete all sessions? This action cannot be undone.",
    deleteOperation: () => clearAllSessions(),
    successMessage: "All sessions cleared",
    successDescription: "All session history has been removed",
  });

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleLoadSession = async (session) => {
    const isConfirmed = await confirm({
      title: "Load Session",
      body: "Are you sure you want to load this session into the form? Current form data will be replaced.",
      confirmText: "Load",
      cancelText: "Cancel",
      variant: "warning",
    });

    if (isConfirmed) {
      await loadSessionIntoForm(session || selectedSession);
      setIsModalOpen(false);
      showSuccess("Session loaded", "Session data has been loaded into the form.");
      navigate("/");
    }
  };

  // Import/Export handlers
  const { handleExport, handleImport } = useImportExport();

  const handleExportSession = handleExport({
    getFilename: (session) => `RPI-session-${session.id}`,
    successMessage: "Session exported",
    successDescription: "The session has been exported as JSON file",
  });

  const handleImportSession = handleImport({
    requiredFields: ["timestamp", "instructions"],
    onImport: async (importedData) => {
      // Create a new session with the imported data
      // Handle both old format (selectedModel) and new format (coreModel)
      const sessionData = {
        timestamp: importedData.timestamp,
        instructions: importedData.instructions,
        inOutPairs: importedData.inOutPairs || [],
        iterations: importedData.iterations || 1,
        coreModel: importedData.coreModel || importedData.selectedModel,
        improveMode: importedData.improveMode !== undefined ? importedData.improveMode : true,
        settingsModel: importedData.settingsModel,
        settingsEmbeddingModel: importedData.settingsEmbeddingModel,
        selectedTools: importedData.selectedTools || [],
      };

      await saveSession(sessionData, importedData.output || [], importedData.tests || []);

      // Refresh sessions list
      const allSessions = await loadSessions();
      setSessions(allSessions);

      showSuccess("Session imported", "The session has been imported successfully");
    },
  });

  const getTestChartOpts = (session) => {
    if (!session?.tests?.length) {
      return {};
    }
    const option = {
      backgroundColor: "transparent",
      tooltip: {
        appendToBody: true,
        trigger: "axis",
        valueFormatter: (value) => `${value?.toFixed(2)}%`,
      },
      color: ["#60a5fa", "#9ca3af"],
      grid: {
        left: "1%",
        right: "1%",
        top: "1%",
        bottom: "1%",
        containLabel: false,
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        splitLine: {
          show: true,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      legend: {
        show: false,
      },
      xAxis: {
        type: "category",
        axisTick: { show: false, alignWithLabel: true },
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
        boundaryGap: false,
        data: session.tests?.map((tg, i) => `${i + 1}° Iteration`),
      },
      series: [
        {
          name: "Score (avg)",
          type: "line",
          data: session.tests?.map(
            (iter) => iter?.reduce((sum, a) => sum + parseFloat(a.aiScore), 0) / (iter?.length || 1)
          ),
        },
        {
          name: "Similarity (avg)",
          type: "line",
          data: session.tests?.map(
            (iter) =>
              iter?.reduce((sum, a) => sum + Math.round(parseFloat(a.similarity * 100)), 0) /
              (iter?.length || 1)
          ),
        },
      ],
    };
    return option;
  };

  const sessionRows = paginatedSessions;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>
            <PlayIcon className="mr-2 h-4 w-4" />
            Run
          </Button>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search in instructions or model"
              onChange={(e) => handleSearchChange(e)}
              value={searchTerm}
              className="pl-9 w-80"
              disabled={!sessions || !sessions.length}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleImportSession}>Import session</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClearAllSessions}
                disabled={!sessions || !sessions.length}
                className="text-destructive"
              >
                Clear All Sessions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoadingSessions ? (
        <div className="space-y-3">
          {Array.from({ length: pageSize }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No sessions yet"
          description="Run some prompts to create sessions and view your prompt testing history."
        />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching sessions"
          description="No sessions match your search criteria. Try a different search term."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Test Model</TableHead>
                  <TableHead>Instructions</TableHead>
                  <TableHead>Iterations / Test</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        <span>Session is running...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {sessionRows.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.timestamp)}</TableCell>
                    <TableCell>
                      {session.coreModel ? (
                        <div className="flex items-center gap-2">
                          <ProviderIcon providerId={session.coreModel.providerId} size={16} />
                          <span>{session.coreModel.text || session.coreModel.originalText || "Unknown model"}</span>
                        </div>
                      ) : (
                        "Unknown model"
                      )}
                    </TableCell>
                    <TableCell>
                      <span title={session.instructions}>{truncateText(session.instructions, 20)}</span>
                    </TableCell>
                    <TableCell>
                      {session.improveMode === false ? (
                        <span title="Test only" className="text-sm">
                          {session.tests.map((tg) =>
                            tg.map((t, k) => <span key={k}>{t.isEqual ? "100% " : `${t.aiScore}% `}</span>)
                          )}
                        </span>
                      ) : (
                        <ReactECharts
                          theme="dark"
                          style={{ height: "30px", width: "220px" }}
                          option={getTestChartOpts(session)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewSession(session)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadSession(session)}
                          disabled={isLoading}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportSession(session)}
                          disabled={isLoading}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session.id)}
                          disabled={isLoading}
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

      <SessionDetailsModal
        isOpen={isModalOpen}
        session={isModalOpen ? selectedSession : null}
        onClose={() => setIsModalOpen(false)}
        onLoadIntoForm={handleLoadSession}
      />
    </div>
  );
};

export default SessionsPage;
