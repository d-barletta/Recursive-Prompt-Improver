import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useToast } from "@context/ToastContext";
import { useLoading } from "@context/LoadingContext";
import {
  Modal,
  CodeSnippet,
  Grid,
  Column,
  Accordion,
  AccordionItem,
  InlineLoading,
} from "@carbon/react";
import ReactECharts from "echarts-for-react";
import ReactDiffViewer from "@alexbruf/react-diff-viewer";
import "@alexbruf/react-diff-viewer/index.css";
import { formatDateFull } from "@utils/uiUtils";
import { ROLES } from "@utils/constants";
import { parseToolArguments } from "./SessionDetailsModal.utils";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";

const SessionDetailsModal = ({ isOpen, session, onClose, onLoadIntoForm }) => {
  const { showInfo } = useToast();
  const { isLoading } = useLoading();
  const [loaddata, setLoaddata] = useState(false);

  const handleCopy = useCallback(
    (c, type) => {
      showInfo("Copied to clipboard", `${type} content has been copied`);
    },
    [showInfo]
  );

  const getTestChartOpts = useMemo(() => {
    if (!session?.tests?.length) return {};
    const option = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        valueFormatter: (value) => `${value?.toFixed(2)}%`,
      },
      grid: {
        left: "1%",
        right: "1%",
        top: "1%",
        bottom: "20%",
        containLabel: false,
      },
      yAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        axisLabel: {
          show: false,
        },
      },
      legend: {
        show: true,
        orient: "horizontal",
        bottom: "0%", // distance from bottom edge
        left: "center",
        data: session.tests[0]?.map((tg, i) => `${i + 1}° Test`),
      },
      xAxis: {
        type: "category",
        axisTick: { alignWithLabel: true },
        axisLine: {
          show: true,
        },
        axisLabel: {
          show: true,
          formatter: function (value) {
            return value; //`${index + 1}°`;
          },
        },
        boundaryGap: true,
        data: session.tests?.map((tg, i) => `${i + 1}° Iteration`),
      },
      series: session.tests[0]
        ?.map((j, h) => ({
          name: `${h + 1}° Test (Score)`,
          type: "line",
          emphasis: {
            focus: "series",
          },
          data: session.tests?.map((iter) => parseFloat(iter[h].aiScore)),
        }))
        .concat(
          session.tests[0]?.map((j, h) => ({
            name: `${h + 1}° Test (Similarity)`,
            type: "bar",
            barCategoryGap: "30%",
            areaStyle: {},
            emphasis: {
              focus: "series",
            },
            data: session.tests?.map((iter) => parseFloat(iter[h].similarity * 100)),
          }))
        ),
    };
    return option;
  }, [session?.tests]);

  useEffect(() => {
    setTimeout(() => setLoaddata(true), 1000);
  }, []);

  return (
    <Modal
      className={"session-details-modal"}
      open={isOpen}
      modalHeading={`${session?.improveMode === false ? "Test Only" : "Improve & Test"} Session - ${formatDateFull(session?.timestamp)}`}
      primaryButtonText="Close"
      secondaryButtonText={isLoading ? "A session is running" : "Load into Form"}
      onRequestClose={onClose}
      onRequestSubmit={onClose}
      onSecondarySubmit={isLoading ? () => {} : onLoadIntoForm}
      size="lg"
      hasScrollingContent
      preventCloseOnClickOutside
    >
      {!!session && (
        <div className="margin-top-1rem-bottom-1rem">
          <Grid fullWidth className="padding-0">
            <Column lg={6} md={3} sm={3} className="margin-bottom-2rem">
              <h4 className="flex-align-center gap-05">
                <ProviderIcon providerId={session.coreModel.providerId} size={20} />
                Core Model - {session.coreModel.providerName || "Default"}
              </h4>
              <CodeSnippet
                type="single"
                autoAlign={true}
                copyButtonDescription="Copy"
                feedback="Copied"
                className={"codeSnippet"}
                wrapText={true}
                onClick={() =>
                  handleCopy(session?.coreModel?.text || session?.coreModel?.id, "Core Model")
                }
              >
                {session?.coreModel?.text || session?.coreModel?.id || "Unknown model"}
              </CodeSnippet>
            </Column>

            {session?.selectedTools && session.selectedTools.length > 0 && (
              <Column lg={16} md={8} sm={4} className="margin-bottom-2rem">
                <h4>🛠️ Selected Tools</h4>
                <CodeSnippet
                  type="single"
                  autoAlign={true}
                  copyButtonDescription="Copy"
                  feedback="Copied"
                  className={"codeSnippet"}
                  wrapText={true}
                  onClick={() =>
                    handleCopy(
                      session.selectedTools.map((t) => t?.name || "Unknown").join(", "),
                      "Tools"
                    )
                  }
                >
                  {session.selectedTools.map((t) => t?.name || "Unknown").join(", ")}
                </CodeSnippet>
              </Column>
            )}

            <Column lg={16} md={8} sm={4} className="margin-bottom-2rem">
              <h4>✨ Instructions</h4>
              <CodeSnippet
                type="multi"
                autoAlign={true}
                copyButtonDescription="Copy"
                feedback="Copied"
                className={"codeSnippet"}
                wrapText={true}
                onClick={() => handleCopy(session.instructions, "Instructions")}
              >
                {session.instructions}
              </CodeSnippet>
            </Column>

            {session?.settingsModel && (
              <Column lg={8} md={4} sm={4} className="margin-bottom-2rem">
                <h4 className="flex-align-center gap-05">
                  <ProviderIcon providerId={session?.settingsModel?.providerId} size={20} />
                  Default Model - {session?.settingsModel?.providerName || ""}
                </h4>
                <CodeSnippet
                  type="single"
                  autoAlign={true}
                  copyButtonDescription="Copy"
                  feedback="Copied"
                  className={"codeSnippet"}
                  wrapText={true}
                  onClick={() =>
                    handleCopy(
                      session?.settingsModel?.text || session?.settingsModel?.id,
                      "Settings Model"
                    )
                  }
                >
                  {session?.settingsModel?.text || session?.settingsModel?.id || "Unknown model"}
                </CodeSnippet>
              </Column>
            )}

            {session?.settingsEmbeddingModel && (
              <Column lg={8} md={4} sm={4} className="margin-bottom-2rem">
                <h4 className="flex-align-center gap-05">
                  <ProviderIcon
                    providerId={session?.settingsEmbeddingModel?.providerId}
                    size={20}
                  />
                  Default Embedding Model - {session?.settingsEmbeddingModel?.providerName || ""}
                </h4>
                <CodeSnippet
                  type="single"
                  autoAlign={true}
                  copyButtonDescription="Copy"
                  feedback="Copied"
                  className={"codeSnippet"}
                  wrapText={true}
                  onClick={() =>
                    handleCopy(
                      session?.settingsEmbeddingModel?.text || session?.settingsEmbeddingModel?.id,
                      "Settings Embedding Model"
                    )
                  }
                >
                  {session?.settingsEmbeddingModel?.text ||
                    session?.settingsEmbeddingModel?.id ||
                    "Unknown embedding model"}
                </CodeSnippet>
              </Column>
            )}
            {session.improveMode !== false && (
              <>
                <Column lg={16} md={8} sm={4} className="margin-bottom-2rem">
                  <h4>📦 Final Output</h4>
                  <CodeSnippet
                    type="multi"
                    autoAlign={true}
                    copyButtonDescription="Copy"
                    feedback="Copied"
                    className={"codeSnippet"}
                    wrapText={true}
                    onClick={() =>
                      handleCopy(session.output[session.output.length - 1], "Final output")
                    }
                  >
                    {session.output[session.output.length - 1]}
                  </CodeSnippet>
                </Column>
                <Column lg={16} md={8} sm={4} className="margin-bottom-1rem">
                  <Accordion>
                    <AccordionItem title="🆚 Instructions VS Final Output">
                      <ReactDiffViewer
                        showDiffOnly={false}
                        hideLineNumbers={true}
                        useDarkTheme={true}
                        oldValue={session.instructions || ""}
                        newValue={session.output?.[session.output?.length - 1] || ""}
                        splitView={false}
                        compareMethod={"diffWords"}
                        ig
                      />
                    </AccordionItem>
                  </Accordion>
                </Column>
              </>
            )}
            {loaddata && (
              <Column lg={16} md={8} sm={4} className="margin-top-2rem">
                <h4 className="margin-bottom-2rem">🧪 Tests details</h4>
                {session.improveMode !== false && (
                  <ReactECharts
                    theme="dark"
                    className="width-100-height-300px"
                    option={getTestChartOpts}
                  />
                )}
                {session.tests?.map((testGroup, iter) => (
                  <Accordion key={`acc_${iter}`}>
                    {session.tests?.length > 1 && (
                      <h4 className="margin-bottom-1rem-top-1rem">🔄 Iteration {`${iter + 1}`}</h4>
                    )}

                    {session.improveMode !== false && (
                      <AccordionItem
                        key={`iterations_${iter}`}
                        title={`🆚 Instructions VS ${
                          iter === 0 ? "original instructions" : `Iteration ${iter}`
                        }`}
                      >
                        <ReactDiffViewer
                          showDiffOnly={false}
                          hideLineNumbers={true}
                          useDarkTheme={true}
                          oldValue={
                            (iter === 0 ? session.instructions : session.output?.[iter - 1]) || ""
                          }
                          newValue={session.output?.[iter] || ""}
                          splitView={false}
                          compareMethod={"diffWords"}
                          ig
                        />
                      </AccordionItem>
                    )}
                    {testGroup.map((test, pairIndex) => (
                      <AccordionItem
                        className="testAccordionItem"
                        key={`iteration_${pairIndex}`}
                        title={
                          <>
                            <strong>{`Test ${pairIndex + 1}`}</strong>
                            {!!test?.out?.length && (
                              <span className="code-snippet-monospace">
                                {test.isEqual
                                  ? `🟢 100% equal`
                                  : `🎯 Score: ${`${test.aiScore.toFixed(2)}%`.padStart(
                                      6,
                                      "ㅤ "
                                    )} ㅤ ㅤ👯‍♂️ Similarity: ${parseFloat(test.similarity * 100).toFixed(2)}%`}
                              </span>
                            )}
                          </>
                        }
                        open={testGroup.length === 1}
                      >
                        <>
                          {test.settings?.context && (
                            <>
                              <h6 className="margin-top-1rem">💬 Test Context</h6>
                              <CodeSnippet
                                type="multi"
                                autoAlign={true}
                                copyButtonDescription="Copy Name"
                                feedback="Copied"
                                className={"codeSnippet"}
                                wrapText={true}
                                copyText={test.settings.context.name}
                                onClick={() => handleCopy(test.settings.context.name, "Context")}
                              >
                                {`Name: ${test.settings.context.name}\n`}
                                {`Messages: ${test.settings.context.messages.length}\n`}
                                {`ID: ${test.settings.context.id}\n\n`}
                                {"-----------------------\n"}
                                {test.settings.context.messages
                                  .map(
                                    (message) =>
                                      `\nRole: ${message?.role || ROLES.USER}\nText: ${message.message}\n`
                                  )
                                  .join("\n-------------------------\n")}
                              </CodeSnippet>
                            </>
                          )}
                          {test.settings?.model && (
                            <>
                              <h6 className="margin-top-1rem flex-align-center gap-05">
                                <ProviderIcon
                                  providerId={test.settings.model.providerId}
                                  size={16}
                                />
                                Test Model - {test.settings.model.providerName || ""}
                              </h6>
                              <CodeSnippet
                                type="single"
                                autoAlign={true}
                                copyButtonDescription="Copy"
                                feedback="Copied"
                                className={"codeSnippet"}
                                wrapText={true}
                                onClick={() =>
                                  handleCopy(
                                    test.settings.model.text || test.settings.model.id,
                                    "Test Model"
                                  )
                                }
                              >
                                {test.settings.model.text ||
                                  test.settings.model.id ||
                                  "Unknown model"}
                              </CodeSnippet>
                            </>
                          )}
                          {test.settings?.embeddingModel && (
                            <>
                              <h6 className="margin-top-1rem flex-align-center gap-05">
                                <ProviderIcon
                                  providerId={test.settings.embeddingModel.providerId}
                                  size={16}
                                />
                                Embeddings Model - {test.settings.embeddingModel.providerName || ""}
                              </h6>
                              <CodeSnippet
                                type="single"
                                autoAlign={true}
                                copyButtonDescription="Copy"
                                feedback="Copied"
                                className={"codeSnippet"}
                                wrapText={true}
                                onClick={() =>
                                  handleCopy(
                                    test.settings.embeddingModel.text ||
                                      test.settings.embeddingModel.id,
                                    "Embeddings Model"
                                  )
                                }
                              >
                                {test.settings.embeddingModel.text ||
                                  test.settings.embeddingModel.id ||
                                  "Unknown embedding model"}
                              </CodeSnippet>
                            </>
                          )}
                          {/* {test.settings?.checkTypes && (
                          <>
                            <h6 className="margin-top-1rem">✅ Check Types</h6>
                            <CodeSnippet
                              type="single"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.settings.checkTypes.join(", "), "Check Types")}
                            >
                              {test.settings.checkTypes.join(", ")}
                            </CodeSnippet>
                          </>
                        )} */}
                          {test.isJsonValid !== null && test.isJsonValid !== undefined && (
                            <>
                              <h6 className="margin-top-1rem">📋 JSON Validity Check</h6>
                              <CodeSnippet
                                type="single"
                                autoAlign={true}
                                copyButtonDescription="Copy"
                                feedback="Copied"
                                className={"codeSnippet"}
                                wrapText={true}
                                onClick={() =>
                                  handleCopy(
                                    test.isJsonValid ? "Valid JSON" : "Invalid JSON",
                                    "JSON Validity"
                                  )
                                }
                              >
                                {test.isJsonValid ? "✅ Valid JSON" : "🚫 Invalid JSON"}
                              </CodeSnippet>
                            </>
                          )}
                          {test.toolsCallResult && (
                            <>
                              <h6 className="margin-top-1rem">🛠️ Tools Calls Check</h6>
                              <CodeSnippet
                                type={test.toolsCallResult.success ? "single" : "multi"}
                                autoAlign={true}
                                copyButtonDescription="Copy"
                                feedback="Copied"
                                className={"codeSnippet"}
                                wrapText={true}
                                onClick={() =>
                                  handleCopy(
                                    test.toolsCallResult.success
                                      ? `Valid - Called: ${test.toolsCallResult.calledTools?.map((t) => t.name)?.join(", ") || "none"}`
                                      : `Invalid - Missing: ${test.toolsCallResult.missing?.join(", ") || "unknown"}`,
                                    "Tools Call Result"
                                  )
                                }
                              >
                                {test.toolsCallResult.success
                                  ? `✅ Valid - All required tools called`
                                  : `🚫 Invalid - Some tools were not called\nCalled: ${test.toolsCallResult.calledTools?.map((t) => t.name)?.join(", ") || "none"}\nMissing: ${test.toolsCallResult.missing?.join(", ") || "unknown"}`}
                              </CodeSnippet>
                              {test.toolsCallResult.calledTools &&
                                test.toolsCallResult.calledTools.length > 0 && (
                                  <>
                                    <h6 className="margin-top-1rem margin-bottom-1rem">
                                      ☎️ Tool Calls Details
                                    </h6>
                                    {test.toolsCallResult.calledTools.map((tool, idx) => (
                                      <div key={idx} className="margin-bottom-1rem">
                                        <strong>
                                          {tool.name}
                                          {tool.argumentsValid !== null && (
                                            <span className="code-snippet-monospace margin-left-1rem">
                                              {tool.argumentsValid
                                                ? "✅ Arguments valid"
                                                : tool.argumentsValid === false
                                                  ? "⚠️ Arguments invalid"
                                                  : "ℹ️ Arguments not validated"}
                                            </span>
                                          )}
                                          {tool.expectedValuesValid !== null && (
                                            <span className="code-snippet-monospace margin-left-1rem">
                                              {tool.expectedValuesValid
                                                ? "✅ Expected values match"
                                                : tool.expectedValuesValid === false
                                                  ? "⚠️ Expected values mismatch"
                                                  : "ℹ️ Values not validated"}
                                            </span>
                                          )}
                                        </strong>
                                        {tool.expectedParams && (
                                          <>
                                            <h6 className="margin-top-0-5rem-margin-bottom-0-5rem margin-top-1rem">
                                              Expected Parameters
                                            </h6>
                                            <CodeSnippet
                                              type="multi"
                                              autoAlign={true}
                                              copyButtonDescription="Copy"
                                              feedback="Copied"
                                              className={"codeSnippet"}
                                              wrapText={true}
                                              onClick={() =>
                                                handleCopy(
                                                  JSON.stringify(tool.expectedParams, null, 2),
                                                  `${tool.name} Expected Parameters`
                                                )
                                              }
                                            >
                                              {JSON.stringify(tool.expectedParams, null, 2)}
                                            </CodeSnippet>
                                          </>
                                        )}
                                        {tool.expectedValues &&
                                          Object.keys(tool.expectedValues).length > 0 && (
                                            <>
                                              <h6 className="margin-top-0-5rem-margin-bottom-0-5rem margin-top-1rem">
                                                Expected Values
                                              </h6>
                                              <CodeSnippet
                                                type="multi"
                                                autoAlign={true}
                                                copyButtonDescription="Copy"
                                                feedback="Copied"
                                                className={"codeSnippet"}
                                                wrapText={true}
                                                onClick={() =>
                                                  handleCopy(
                                                    JSON.stringify(tool.expectedValues, null, 2),
                                                    `${tool.name} Expected Values`
                                                  )
                                                }
                                              >
                                                {JSON.stringify(tool.expectedValues, null, 2)}
                                              </CodeSnippet>
                                            </>
                                          )}
                                        <h6 className="margin-top-0-5rem-margin-bottom-0-5rem margin-top-1rem">
                                          Actual Arguments
                                        </h6>
                                        <CodeSnippet
                                          type="multi"
                                          autoAlign={true}
                                          copyButtonDescription="Copy"
                                          feedback="Copied"
                                          className={"codeSnippet"}
                                          wrapText={true}
                                          onClick={() =>
                                            handleCopy(
                                              parseToolArguments(tool.arguments),
                                              `${tool.name} Arguments`
                                            )
                                          }
                                        >
                                          {parseToolArguments(tool.arguments)}
                                        </CodeSnippet>
                                      </div>
                                    ))}
                                  </>
                                )}
                            </>
                          )}
                        </>
                        {!!test?.out?.length && (
                          <>
                            <h6 className="margin-top-1rem">📥 Input vs Output</h6>
                            <h6 className="margin-top-1rem">Input</h6>
                            <CodeSnippet
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.in, "Input")}
                            >
                              {test.in}
                            </CodeSnippet>
                            <h6 className="margin-top-1rem">Expected Output</h6>
                            <CodeSnippet
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.out, "Expected output")}
                            >
                              {test.out}
                            </CodeSnippet>
                            <h6 className="margin-top-1rem">Actual Result</h6>
                            <CodeSnippet
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.result, "Actual result")}
                            >
                              {test.result}
                            </CodeSnippet>
                            {test.isEqual ? (
                              <InlineLoading
                                className="margin-top-1rem"
                                description={`Great! Test output is 100% equal to expected result!`}
                                status="finished"
                              />
                            ) : (
                              <>
                                <h6 className="margin-top-1rem">
                                  AI feedback - 🎯 Final Score {test.aiScore}%
                                </h6>
                                <CodeSnippet
                                  type="multi"
                                  autoAlign={true}
                                  copyButtonDescription="Copy"
                                  feedback="Copied"
                                  className={"codeSnippet"}
                                  wrapText={true}
                                >
                                  {test.aiFeedback?.trim()?.length
                                    ? test.aiFeedback
                                    : "No feedback"}
                                </CodeSnippet>
                                <h6 className="margin-top-1rem-bottom-1rem">Comparison</h6>
                                <ReactDiffViewer
                                  showDiffOnly={false}
                                  hideLineNumbers={true}
                                  useDarkTheme={true}
                                  oldValue={test.out || ""}
                                  newValue={test.result || ""}
                                  splitView={false}
                                  compareMethod={"diffWords"}
                                />
                                <h6 className="margin-top-1rem">Scoring details</h6>
                                <CodeSnippet
                                  type="multi"
                                  autoAlign={true}
                                  copyButtonDescription="Copy"
                                  feedback="Copied"
                                  className={"codeSnippet"}
                                  wrapText={true}
                                >
                                  {`Cosine Similarity: ${test.similarity}\n\n`}
                                  {JSON.stringify(test.scores, null, 2)}
                                </CodeSnippet>
                              </>
                            )}
                          </>
                        )}
                      </AccordionItem>
                    ))}
                  </Accordion>
                ))}
              </Column>
            )}
          </Grid>
        </div>
      )}
    </Modal>
  );
};

export default SessionDetailsModal;
