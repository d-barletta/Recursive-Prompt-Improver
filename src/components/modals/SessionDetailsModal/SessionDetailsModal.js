import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useToast } from "@context/ToastContext";
import { useLoading } from "@context/LoadingContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Spinner } from "@/components/ui/spinner";
import { Copy } from "lucide-react";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {session?.improveMode === false ? "Test Only" : "Improve & Test"} Session -{" "}
            {formatDateFull(session?.timestamp)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
        {!!session && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <ProviderIcon providerId={session.coreModel.providerId} size={20} />
                  Core Model - {session.coreModel.providerName || "Default"}
                </h4>
                <div
                  className="relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80"
                  onClick={() =>
                    handleCopy(session?.coreModel?.text || session?.coreModel?.id, "Core Model")
                  }
                >
                  <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                  <div className="pr-8 break-all">
                    {session?.coreModel?.text || session?.coreModel?.id || "Unknown model"}
                  </div>
                </div>
              </div>

              {session?.selectedTools && session.selectedTools.length > 0 && (
                <div className="col-span-2">
                  <h4 className="text-sm font-semibold mb-2">🛠️ Selected Tools</h4>
                  <div
                    className="relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80"
                    onClick={() =>
                      handleCopy(
                        session.selectedTools.map((t) => t?.name || "Unknown").join(", "),
                        "Tools"
                      )
                    }
                  >
                    <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                    <div className="pr-8 break-all">
                      {session.selectedTools.map((t) => t?.name || "Unknown").join(", ")}
                    </div>
                  </div>
                </div>
              )}

              <div className="col-span-2">
                <h4 className="text-sm font-semibold mb-2">✨ Instructions</h4>
                <div
                  className="relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80 whitespace-pre-wrap"
                  onClick={() => handleCopy(session.instructions, "Instructions")}
                >
                  <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                  <div className="pr-8">{session.instructions}</div>
                </div>
              </div>

              {session?.settingsModel && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <ProviderIcon providerId={session?.settingsModel?.providerId} size={20} />
                    Default Model - {session?.settingsModel?.providerName || ""}
                  </h4>
                  <div
                    className="relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80"
                    onClick={() =>
                      handleCopy(
                        session?.settingsModel?.text || session?.settingsModel?.id,
                        "Settings Model"
                      )
                    }
                  >
                    <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                    <div className="pr-8 break-all">
                      {session?.settingsModel?.text || session?.settingsModel?.id || "Unknown model"}
                    </div>
                  </div>
                </div>
              )}

              {session?.settingsEmbeddingModel && (
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <ProviderIcon
                      providerId={session?.settingsEmbeddingModel?.providerId}
                      size={20}
                    />
                    Default Embedding Model - {session?.settingsEmbeddingModel?.providerName || ""}
                  </h4>
                  <div
                    className="relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80"
                    onClick={() =>
                      handleCopy(
                        session?.settingsEmbeddingModel?.text || session?.settingsEmbeddingModel?.id,
                        "Settings Embedding Model"
                      )
                    }
                  >
                    <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
                    <div className="pr-8 break-all">
                      {session?.settingsEmbeddingModel?.text ||
                        session?.settingsEmbeddingModel?.id ||
                        "Unknown embedding model"}
                    </div>
                  </div>
                </div>
              )}
            {session.improveMode !== false && (
              <>
                <div className="col-span-2 mb-8">
                  <h4>📦 Final Output</h4>
                  <CodeBlock
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
                  </CodeBlock>
                </div>
                <div className="col-span-2 mb-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="🆚 Instructions VS Final Output">
                      <AccordionTrigger>🆚 Instructions VS Final Output</AccordionTrigger>
                      <AccordionContent>
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
                    </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </>
            )}
            {loaddata && (
              <div className="col-span-2 mt-8">
                <h4 className="margin-bottom-2rem">🧪 Tests details</h4>
                {session.improveMode !== false && (
                  <ReactECharts
                    theme="dark"
                    className="width-100-height-300px"
                    option={getTestChartOpts}
                  />
                )}
                {session.tests?.map((testGroup, iter) => (
                  <Accordion type="single" collapsible className="w-full" key={`acc_${iter}`}>
                    {session.tests?.length > 1 && (
                      <h4 className="margin-bottom-1rem-top-1rem">🔄 Iteration {`${iter + 1}`}</h4>
                    )}

                    {session.improveMode !== false && (
                      <AccordionItem
                        key={`iterations_${iter}`}
                        value={`iterations_${iter}`}
                      >
                        <AccordionTrigger>
                          {`🆚 Instructions VS ${
                            iter === 0 ? "original instructions" : `Iteration ${iter}`
                          }`}
                        </AccordionTrigger>
                        <AccordionContent>
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
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    {testGroup.map((test, pairIndex) => (
                      <AccordionItem
                        className="testAccordionItem"
                        key={`iteration_${pairIndex}`}
                        value={`iteration_${pairIndex}`}
                      >
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <strong>{`Test ${pairIndex + 1}`}</strong>
                            {!!test?.out?.length && (
                              <span className="font-mono text-xs">
                                {test.isEqual
                                  ? `🟢 100% equal`
                                  : `🎯 Score: ${test.aiScore.toFixed(2)}% ㅤ 👯‍♂️ Similarity: ${parseFloat(test.similarity * 100).toFixed(2)}%`}
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {test.settings?.context && (
                            <>
                              <h6 className="margin-top-1rem">💬 Test Context</h6>
                              <CodeBlock
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
                              </CodeBlock>
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
                              <CodeBlock
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
                              </CodeBlock>
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
                              <CodeBlock
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
                              </CodeBlock>
                            </>
                          )}
                          {/* {test.settings?.checkTypes && (
                          <>
                            <h6 className="margin-top-1rem">✅ Check Types</h6>
                            <CodeBlock
                              type="single"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.settings.checkTypes.join(", "), "Check Types")}
                            >
                              {test.settings.checkTypes.join(", ")}
                            </CodeBlock>
                          </>
                        )} */}
                          {test.isJsonValid !== null && test.isJsonValid !== undefined && (
                            <>
                              <h6 className="margin-top-1rem">📋 JSON Validity Check</h6>
                              <CodeBlock
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
                              </CodeBlock>
                            </>
                          )}
                          {test.toolsCallResult && (
                            <>
                              <h6 className="margin-top-1rem">🛠️ Tools Calls Check</h6>
                              <CodeBlock
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
                              </CodeBlock>
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
                                            <CodeBlock
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
                                            </CodeBlock>
                                          </>
                                        )}
                                        {tool.expectedValues &&
                                          Object.keys(tool.expectedValues).length > 0 && (
                                            <>
                                              <h6 className="margin-top-0-5rem-margin-bottom-0-5rem margin-top-1rem">
                                                Expected Values
                                              </h6>
                                              <CodeBlock
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
                                              </CodeBlock>
                                            </>
                                          )}
                                        <h6 className="margin-top-0-5rem-margin-bottom-0-5rem margin-top-1rem">
                                          Actual Arguments
                                        </h6>
                                        <CodeBlock
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
                                        </CodeBlock>
                                      </div>
                                    ))}
                                  </>
                                )}
                            </>
                          )}
                        {!!test?.out?.length && (
                          <>
                            <h6 className="margin-top-1rem">📥 Input vs Output</h6>
                            <h6 className="margin-top-1rem">Input</h6>
                            <CodeBlock
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.in, "Input")}
                            >
                              {test.in}
                            </CodeBlock>
                            <h6 className="margin-top-1rem">Expected Output</h6>
                            <CodeBlock
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.out, "Expected output")}
                            >
                              {test.out}
                            </CodeBlock>
                            <h6 className="margin-top-1rem">Actual Result</h6>
                            <CodeBlock
                              type="multi"
                              autoAlign={true}
                              copyButtonDescription="Copy"
                              feedback="Copied"
                              className={"codeSnippet"}
                              wrapText={true}
                              onClick={() => handleCopy(test.result, "Actual result")}
                            >
                              {test.result}
                            </CodeBlock>
                            {test.isEqual ? (
                              <div className="flex items-center gap-2 mt-4 text-green-500">
                                <span className="text-sm">
                                  ✓ Great! Test output is 100% equal to expected result!
                                </span>
                              </div>
                            ) : (
                              <>
                                <h6 className="margin-top-1rem">
                                  AI feedback - 🎯 Final Score {test.aiScore}%
                                </h6>
                                <CodeBlock
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
                                </CodeBlock>
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
                                <CodeBlock
                                  type="multi"
                                  autoAlign={true}
                                  copyButtonDescription="Copy"
                                  feedback="Copied"
                                  className={"codeSnippet"}
                                  wrapText={true}
                                >
                                  {`Cosine Similarity: ${test.similarity}\n\n`}
                                  {JSON.stringify(test.scores, null, 2)}
                                </CodeBlock>
                              </>
                            )}
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    ))}
                  </Accordion>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={isLoading ? () => {} : onLoadIntoForm}
            disabled={isLoading}
          >
            {isLoading ? "A session is running" : "Load into Form"}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for code display with copy functionality
const CodeBlock = ({ children, onClick, multiline = false }) => (
  <div
    className={`relative p-3 bg-muted rounded border font-mono text-sm cursor-pointer hover:bg-muted/80 ${
      multiline ? "whitespace-pre-wrap" : ""
    }`}
    onClick={onClick}
  >
    <Copy className="absolute top-2 right-2 h-4 w-4 text-muted-foreground" />
    <div className="pr-8 break-all">{children}</div>
  </div>
);

export default SessionDetailsModal;
