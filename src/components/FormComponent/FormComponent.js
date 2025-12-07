import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import TestSettingsModal from "@components/modals/TestSettingsModal";
import DiffModal from "@components/modals/DiffModal";
import ChatModal from "@components/modals/ChatModal";
import InstructionsEditor from "@components/shared/InstructionsEditor";
import TestPairsSection from "./TestPairsSection";
import SettingsSection from "./SettingsSection";
import ActionsSection from "./ActionsSection";
import OutputSection from "./OutputSection";
import { useFormComponent } from "./FormComponent.hooks";
import { getDefaultEmbeddingModel } from "./FormComponent.utils";
import { DEFAULT_CHECK_TYPES } from "@utils/constants";

const FormComponent = () => {
  const {
    formData,
    isLoading,
    isLoadingForm,
    isImprovingPrompt,
    isFullscreen,
    isDiffModalOpen,
    isChatModalOpen,
    fillingOutputIndex,
    error,
    instructionsRows,
    testPairRowFocused,
    contexts,
    tools,
    knowledgeBases,
    selectedTestIdx,
    isTestSettingsOpen,
    previousInstructions,
    improvedInstructions,
    logs,
    currentIteration,
    allAvailableModels,
    outputLog,
    settings,
    navigate,
    setFormData,
    setIsFullscreen,
    setIsDiffModalOpen,
    setIsChatModalOpen,
    setInstructionsRows,
    setTestPairRowFocused,
    setSelectedTestIdx,
    setIsTestSettingsOpen,
    handleChange,
    handleAddInOutPair,
    handleTestSettingsChange,
    handleTestContextChange,
    handleTestKnowledgeBasesChange,
    handleFillOutput,
    handleToolsChange,
    handleRemoveInOutPair,
    handleDuplicateInOutPair,
    handleClearForm,
    handleImprovePrompt,
    handleUndoImprove,
    handleRedoImprove,
    handleSaveAsAgent,
    handleSubmit,
    getLastSessionScoreByTestIndex,
    showError,
    showInfo,
    clearLogs,
    clearOutputFromLocalStorage,
    logger,
  } = useFormComponent();

  if (isLoadingForm)
    return (
      <form>
        <div id="formcontainer" className="space-y-4">
          <div className="margin-top-1rem">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </form>
    );

  return (
    <form onSubmit={handleSubmit}>
      <div id="formcontainer" className={`space-y-6 ${isFullscreen ? "isFullsceen" : ""}`}>
        <div className="w-full">
          <InstructionsEditor
            instructions={formData.instructions}
            instructionsRows={instructionsRows}
            isLoading={isLoading}
            isImprovingPrompt={isImprovingPrompt}
            hasProviders={!!settings?.providers?.length}
            previousInstructions={previousInstructions}
            improvedInstructions={improvedInstructions}
            onInstructionsChange={(e) => handleChange("instructions", e.target.value)}
            onInstructionsFocus={() => setInstructionsRows(26)}
            onInstructionsBlur={() => setInstructionsRows(4)}
            onImprove={handleImprovePrompt}
            onUndo={handleUndoImprove}
            onRedo={handleRedoImprove}
            onCompare={() => setIsDiffModalOpen(true)}
          />
        </div>

        <div className="filtersContainer w-full">
          <TestPairsSection
            inOutPairs={formData.inOutPairs}
            isLoading={isLoading}
            isImprovingPrompt={isImprovingPrompt}
            fillingOutputIndex={fillingOutputIndex}
            testPairRowFocused={testPairRowFocused}
            onInputChange={(idx, value) => handleChange("inOutPairs.in", value, idx)}
            onOutputChange={(idx, value) => handleChange("inOutPairs.out", value, idx)}
            onInputFocus={setTestPairRowFocused}
            onInputBlur={() => setTestPairRowFocused(null)}
            onOutputFocus={setTestPairRowFocused}
            onOutputBlur={() => setTestPairRowFocused(null)}
            onSettingsClick={(idx) => {
              setSelectedTestIdx(idx);
              setIsTestSettingsOpen(true);
            }}
            onFillOutput={handleFillOutput}
            onDuplicate={handleDuplicateInOutPair}
            onRemove={handleRemoveInOutPair}
            onRemoveCheckType={(idx, checkTypeId) =>
              handleTestSettingsChange(
                idx,
                "checkTypes",
                formData.inOutPairs[idx].settings.checkTypes.filter((c) => c !== checkTypeId)
              )
            }
            onRemoveJsonSchema={(idx) => handleTestSettingsChange(idx, "useJsonSchema", false)}
            onRemoveContext={(idx) => handleTestContextChange(idx, null)}
            onRemoveKnowledgeBases={(idx) => handleTestKnowledgeBasesChange(idx, [])}
            onRemoveImages={(idx) => handleTestSettingsChange(idx, "images", [])}
            onRemoveModel={(idx) => handleTestSettingsChange(idx, "model", null)}
            onAddPair={handleAddInOutPair}
            getLastSessionScoreByTestIndex={getLastSessionScoreByTestIndex}
          />
        </div>

        <SettingsSection
          tools={tools}
          selectedTools={formData.selectedTools}
          allAvailableModels={allAvailableModels}
          coreModel={formData.coreModel}
          iterations={formData.iterations}
          improveMode={formData.improveMode}
          isLoading={isLoading}
          onToolsChange={handleToolsChange}
          onModelChange={(selectedItem) => handleChange("coreModel", selectedItem)}
          onIterationsChange={(value) => handleChange("iterations", value)}
          onImproveModeToggle={() => handleChange("improveMode", !formData.improveMode)}
        />

        <div className="w-full"></div>

        <ActionsSection
          settings={settings}
          formData={formData}
          isLoading={isLoading}
          isImprovingPrompt={isImprovingPrompt}
          fillingOutputIndex={fillingOutputIndex}
          error={error}
          onSubmit={handleSubmit}
          onChat={() => setIsChatModalOpen(true)}
          onSaveAsAgent={handleSaveAsAgent}
          onClearForm={handleClearForm}
          onNavigate={navigate}
        />
      </div>

      <OutputSection
        isLoading={isLoading}
        isFullscreen={isFullscreen}
        logs={logs}
        currentIteration={currentIteration}
        iterations={formData.iterations}
        improveMode={formData.improveMode}
        outputLog={outputLog}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onClearLogs={clearLogs}
        showError={showError}
        showInfo={showInfo}
        clearOutputFromLocalStorage={clearOutputFromLocalStorage}
        clearLogs={clearLogs}
        logger={logger}
      />

      {/* Test Settings Modal */}
      <TestSettingsModal
        open={isTestSettingsOpen}
        onClose={() => setIsTestSettingsOpen(false)}
        testIndex={selectedTestIdx}
        contexts={contexts}
        availableKnowledgeBases={knowledgeBases}
        availableTools={formData.selectedTools}
        coreModel={formData.coreModel}
        defaultEmbeddingModel={getDefaultEmbeddingModel(
          settings.providers,
          settings.defaultProviderId
        )}
        selectedContext={
          selectedTestIdx !== null ? formData.inOutPairs[selectedTestIdx]?.settings?.context : null
        }
        selectedCheckTypes={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.checkTypes
            : DEFAULT_CHECK_TYPES
        }
        selectedModel={
          selectedTestIdx !== null ? formData.inOutPairs[selectedTestIdx]?.settings?.model : null
        }
        selectedEmbeddingModel={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.embeddingModel
            : null
        }
        selectedUseJsonSchema={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.useJsonSchema
            : false
        }
        selectedJsonSchema={
          selectedTestIdx !== null ? formData.inOutPairs[selectedTestIdx]?.settings?.jsonSchema : ""
        }
        selectedJsonSchemaStrict={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.jsonSchemaStrict
            : false
        }
        selectedToolsCalled={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.toolsCalled
            : []
        }
        selectedKnowledgeBases={
          selectedTestIdx !== null
            ? formData.inOutPairs[selectedTestIdx]?.settings?.knowledgeBases
            : []
        }
        selectedImages={
          selectedTestIdx !== null ? formData.inOutPairs[selectedTestIdx]?.settings?.images : []
        }
        testOutput={selectedTestIdx !== null ? formData.inOutPairs[selectedTestIdx]?.out : ""}
        onContextChange={handleTestContextChange}
        onCheckTypesChange={(testIndex, checkTypes) =>
          handleTestSettingsChange(testIndex, "checkTypes", checkTypes)
        }
        onModelChange={(testIndex, model) => handleTestSettingsChange(testIndex, "model", model)}
        onEmbeddingModelChange={(testIndex, embeddingModel) =>
          handleTestSettingsChange(testIndex, "embeddingModel", embeddingModel)
        }
        onUseJsonSchemaChange={(testIndex, useJsonSchema) =>
          handleTestSettingsChange(testIndex, "useJsonSchema", useJsonSchema)
        }
        onJsonSchemaChange={(testIndex, jsonSchema) =>
          handleTestSettingsChange(testIndex, "jsonSchema", jsonSchema)
        }
        onJsonSchemaStrictChange={(testIndex, jsonSchemaStrict) =>
          handleTestSettingsChange(testIndex, "jsonSchemaStrict", jsonSchemaStrict)
        }
        onToolsCalledChange={(testIndex, toolsCalled) =>
          handleTestSettingsChange(testIndex, "toolsCalled", toolsCalled)
        }
        onKnowledgeBasesChange={handleTestKnowledgeBasesChange}
        onImagesChange={(testIndex, images) =>
          handleTestSettingsChange(testIndex, "images", images)
        }
      />

      {/* Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        title="Improved Instructions Diff"
        oldValue={previousInstructions || ""}
        newValue={improvedInstructions || ""}
      />

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        formData={formData}
        onUpdateMessages={(messages) => {
          setFormData((prev) => ({
            ...prev,
            chatMessages: messages,
          }));
        }}
      />
    </form>
  );
};

export default FormComponent;
