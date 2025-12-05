/*************** MAIN LOGIC **************/

import { jsonrepair } from "jsonrepair";
import Ajv from "ajv";
import { AI_API } from "./API";
import { RAG } from "./RAG";
import {
  FEEDBACK_PROMPT,
  IMPROVER_PROMPT,
  INFER_FUNCTION_PROMPT,
  INFER_SCHEMA_PROMPT,
  SCORING_PROMPT,
} from "./PROMPTS";
import { CHECK_TYPES, DEFAULT_CHECK_TYPES, ROLES } from "@utils/constants";
import { SCORE_SCHEMA, FEEDBACK_SCHEMA, IMPROVER_SCHEMA } from "./SCHEMAS";
import { executeTool } from "@utils/toolUtils";
import { TOKENIZER } from "./TOKENIZER";

const CORE = {
  _currentAbortController: null,
  stop: function () {
    if (this._currentAbortController) {
      try {
        this._currentAbortController.abort();
      } catch (e) {
        console.warn("CORE.stop() abort failed", e);
      }
      this._currentAbortController = null;
    }
  },
  run: async function (formData, logger, setCurrentIteration) {
    console.log("CORE.run()", formData);
    // create a fresh abort controller for this run
    this._currentAbortController = new AbortController();
    const signal = this._currentAbortController.signal;

    try {
      // Improve & test
      if (formData?.improveMode === true || formData?.improveMode === "true") {
        return await this.runImprove(formData, logger, setCurrentIteration, signal);
      }

      // Only test
      logger("🧪 TESTING with INSTRUCTIONS:", `${formData.instructions}`);
      const tests = await this.runTests(formData.instructions, formData, logger, signal);
      return { results: null, tests: [tests] };
    } finally {
      // clear controller when finished (either success, error or abort)
      this._currentAbortController = null;
    }
  },
  runImprove: async function (formData, logger, setCurrentIteration, signal) {
    console.log("CORE.improve()", formData);
    const results = [];
    logger("✨ Test current provided instructions");
    // run tests on first run on existing prompt
    const tests = [await this.runTests(formData.instructions, formData, logger, signal, true)];
    // start loop to improve
    for (let i = 0; i < parseInt(formData?.iterations || 1); i++) {
      if (signal?.aborted) throw new Error("Operation aborted");

      logger(`🔄 ITERATION ${i + 1} of ${formData.iterations}`);
      setCurrentIteration && setCurrentIteration(i + 1);
      // take current instruction from previous run or from initial
      const current = i === 0 ? formData.instructions : results[i - 1];
      // take all (unique) feedbacks and add them to the prompt
      const feedbacks = [
        ...new Set(
          tests?.flatMap((pairs) => pairs.map((t) => t.aiFeedback?.trim()).filter(Boolean)) ?? []
        ),
      ];
      let improved = current;
      if (feedbacks?.length) {
        improved = await this.improvePromptByFeedback(
          current,
          feedbacks.join("\n"),
          false,
          formData?.coreModel,
          signal
        );
        if (signal?.aborted) throw new Error("Operation aborted");
        logger("✨ IMPROVED PROMPT:", `${improved}`);
      } else {
        logger("⚠️ NO FEEDBACKS - SKIP IMPROVING PROMPT");
      }

      results.push(improved);
      // run tests on improved prompt - ask for feedback only on last iteration
      const notIsLastIteration = i < parseInt(formData?.iterations || 1) - 1;
      const runTestsResult = await this.runTests(
        improved,
        formData,
        logger,
        signal,
        notIsLastIteration
      );

      tests.push(runTestsResult);
    }

    return { results, tests };
  },
  runTests: async function (prompt, formData, logger, signal, askFeedback = false) {
    console.log("CORE.runTests()", prompt);
    // Process all IN-OUT pairs
    const pairTests = [];
    for (let j = 0; j < formData.inOutPairs.length; j++) {
      if (signal?.aborted) throw new Error("Operation aborted");
      const pair = formData.inOutPairs[j];
      // Get model for this test (use pair-specific model or fall back to core model, or use default from STORAGE if both are null)
      const testModel = pair.settings?.model || formData?.coreModel;
      logger(`🧪 TEST ${j + 1}`);

      logger("🧠 Model:", `${testModel?.text || testModel?.originalText || "Unknown"}`);
      !!pair.settings.context && logger("💬 Context:", `${pair.settings.context.name}`);

      // Get check types for this pair (default to equality check if not specified)
      const checkTypes = pair.settings?.checkTypes || DEFAULT_CHECK_TYPES;
      const shouldCheckEquality = checkTypes.includes(CHECK_TYPES.EQUALITY.id);
      const shouldCheckJsonValid = checkTypes.includes(CHECK_TYPES.JSON_VALID.id);
      const shouldCheckToolsCall = checkTypes.includes(CHECK_TYPES.TOOLS_CALL.id);

      // Prepare test input - enrich with RAG context if knowledge bases are selected
      let testInput = pair.in;
      if (pair.settings?.knowledgeBases && pair.settings.knowledgeBases.length > 0) {
        // Get embedding model for RAG (use test-specific or default)
        const embeddingModel = pair.settings?.embeddingModel || formData?.defaultEmbeddingModel;
        if (embeddingModel) {
          const kbIds = pair.settings.knowledgeBases.map((kb) => kb.id);
          logger("📚 Knowledge Bases:", kbIds.length.toString());
          try {
            const ragResult = await RAG.getRAGContext(
              pair.in,
              kbIds,
              embeddingModel.id,
              embeddingModel.providerId,
              {
                topK: RAG.RAG_CONFIG.TOP_K,
                minSimilarity: RAG.RAG_CONFIG.MIN_SIMILARITY,
                abortSignal: signal,
              }
            );
            if (ragResult.context) {
              testInput = RAG.formatRAGContextMessage(
                ragResult.context,
                ragResult.chunks?.length || 0,
                pair.in
              );
              logger("📖 RAG Context:", `${ragResult.chunks?.length || 0} chunks`);
            }
          } catch (ragError) {
            console.warn("RAG context retrieval failed:", ragError);
            logger("⚠️ RAG Error:", ragError.message || "Failed to retrieve context");
          }
        }
      }

      // Prepare test settings for runSingleTest
      const testSettings = {
        ...pair.settings,
        tools: formData?.selectedTools || [],
        checkTypes: checkTypes,
        maxToolIterations: formData?.maxToolIterations || 5,
        timeLimit: formData?.timeLimit || 60000,
      };

      // Run single test to get the result
      const { result, test } = await this.runSingleTest(
        prompt,
        testInput,
        testSettings,
        testModel,
        signal
      );
      logger("📤 OUTPUT:", `${result}`);

      // Initialize check results
      let isEqual = false;
      let isJsonValid = null;
      let toolsCallResult = null;

      if (signal?.aborted) throw new Error("Operation aborted");

      // Perform equality check if enabled
      if (shouldCheckEquality && result === pair.out.trim()) {
        logger("✅ IS EQUAL - skip scoring and similarity");
        isEqual = true;
      }

      // Perform tools call check if enabled
      if (shouldCheckToolsCall && pair.settings?.toolsCalled?.length > 0) {
        toolsCallResult = this.verifyToolsCalled(test, pair.settings.toolsCalled, logger);
      }

      // Perform JSON validation check if enabled
      if (shouldCheckJsonValid) {
        isJsonValid = this.verifyJsonValid(result, pair.settings, logger);
      }

      // If equality check passed or ut is empty,
      // we can skip scoring and similarity
      if (isEqual || !pair?.out?.trim()?.length) {
        pairTests.push({
          in: pair.in,
          out: pair.out,
          result: result,
          isEqual: !!isEqual,
          isJsonValid: isJsonValid,
          toolsCallResult: toolsCallResult,
          aiScore: 0,
          scores: 0,
          aiFeedback: "",
          similarity: 0,
          settings: pair.settings,
        });
        continue;
      }

      // Run scoring, similarity, and feedback in parallel
      const [scoringResult, similarityResult, feedbackResult] = await Promise.all([
        this.runScoring(pair.out.trim(), result, pair, formData, logger, signal),
        this.runSimilarity(pair.out.trim(), result, pair, logger, signal),
        askFeedback
          ? this.runFeedback(pair.out.trim(), result, formData, logger, signal)
          : Promise.resolve({ feedback: "" }),
      ]);

      pairTests.push({
        in: pair.in,
        out: pair.out,
        result: result,
        isEqual: false,
        isJsonValid: isJsonValid,
        toolsCallResult: toolsCallResult,
        aiScore: scoringResult?.final_score || 0,
        scores: scoringResult?.scores || 0,
        aiFeedback: feedbackResult?.feedback || "",
        similarity: similarityResult || 0,
        settings: pair.settings,
      });
    }
    return pairTests;
  },
  runSingleTest: async function (
    instructions,
    testInput,
    testSettings = {},
    coreModel = null,
    signal = null
  ) {
    console.log("CORE.runSingleTest()", instructions, testInput);

    // Use provided signal or create a new abort controller
    const abortController = signal ? null : new AbortController();
    const abortSignal = signal || abortController.signal;

    try {
      // Get model for this test (use test-specific model or fall back to core model)
      const testModel = testSettings?.model || coreModel;

      if (!testModel) {
        throw new Error("No model specified for test");
      }

      const tools = testSettings?.tools || [];
      const hasTools = tools.length > 0;

      // Parse JSON schema if provided
      let jsonSchema;
      let jsonStrict;
      if (testSettings?.jsonSchema) {
        jsonSchema = JSON.parse(testSettings.jsonSchema);
        jsonStrict = !!testSettings?.jsonSchemaStrict;
      }

      // If no tools, use simple oneShotPrompt
      if (!hasTools) {
        const promptSettings = {
          context: testSettings?.context?.messages,
          abortSignal: abortSignal,
          jsonValid: testSettings?.checkTypes?.includes(CHECK_TYPES.JSON_VALID.id) || false,
          tools: [],
          providerId: testModel?.providerId,
          jsonSchema,
          jsonStrict,
          images: testSettings?.images, // Pass images from test settings
        };

        const test = await AI_API.oneShotPrompt(
          instructions,
          testInput,
          testModel?.id,
          promptSettings
        );
        const result = test?.choices[0]?.message?.content?.trim();
        return { result, test };
      }

      // If tools are available, use the full conversational loop
      const loopResult = await this.executeConversationalLoop({
        systemPrompt: instructions,
        userMessage: testInput,
        images: testSettings?.images, // Pass images from test settings
        modelId: testModel?.id,
        providerId: testModel?.providerId,
        initialMessages: testSettings?.context?.messages
          ? testSettings.context.messages.map((msg) => ({
              role: msg.role,
              content: msg.message,
            }))
          : [],
        tools: tools,
        availableTools: tools,
        ROLES: ROLES,
        maxIterations: testSettings?.maxToolIterations || 5,
        jsonSchema,
        jsonStrict,
        abortSignal: abortSignal,
        executeToolFn: executeTool,
        timeLimit: testSettings?.timeLimit || 60000,
      });

      if (!loopResult.success && loopResult.error !== "Maximum tool execution iterations reached") {
        throw new Error(loopResult.error);
      }

      // Extract the final assistant message as the result
      const messages = loopResult.messages || [];
      const lastAssistantMessage = [...messages].reverse().find((m) => m.role === ROLES.ASSISTANT);

      const result = lastAssistantMessage?.content?.trim() || "";

      // Build a test-like object for tool_calls verification
      // Include all tool calls from all assistant messages
      const allToolCalls = messages
        .filter((m) => m.role === ROLES.ASSISTANT && m.toolCalls)
        .flatMap((m) => m.toolCalls);

      const test = {
        choices: [
          {
            message: {
              content: result,
              tool_calls: allToolCalls,
            },
          },
        ],
        _conversationMessages: messages, // Include full conversation for debugging
      };

      return { result, test };
    } catch (error) {
      console.error("CORE.runSingleTest() ERROR", error);
      throw error;
    }
  },
  runScoring: async function (outA, outB, pair, formData, logger, signal) {
    console.log("CORE.runScoring()", outA, outB);
    try {
      // Get model for scoring (use pair-specific model or fall back to core model)
      const scoringModel = pair.settings?.model || formData?.coreModel;
      const scoringModelId = scoringModel?.id;

      // do AI test on output and expected output
      const scoring = await AI_API.oneShotPrompt(
        SCORING_PROMPT,
        `<REFERENCE>${outA}</REFERENCE> <SUBMISSION>${outB}</SUBMISSION>`,
        scoringModelId,
        {
          abortSignal: signal,
          jsonSchema: SCORE_SCHEMA,
          providerId: scoringModel?.providerId, // Pass providerId for routing
        }
      );
      const repaired = jsonrepair(scoring?.choices[0]?.message?.content);
      const scoringResult = JSON.parse(repaired);
      logger("🎯 AI SCORING:", `${JSON.stringify(scoringResult, null, 2)}`);
      return scoringResult;
    } catch (error) {
      console.log("CORE.runScoring() ERROR", error);
      logger("🚨 AI SCORING FAILED");
      return null;
    }
  },
  runFeedback: async function (outA, outB, formData, logger, signal) {
    console.log("CORE.runFeedback()", outA, outB);
    try {
      // Get model for feedback core model
      const feedbackModel = formData?.coreModel;
      const feedbackModelId = feedbackModel?.id;

      // do AI test on output and expected output
      const feedback = await AI_API.oneShotPrompt(
        FEEDBACK_PROMPT,
        `<REFERENCE>${outA}</REFERENCE> <SUBMISSION>${outB}</SUBMISSION>`,
        feedbackModelId,
        {
          abortSignal: signal,
          jsonSchema: FEEDBACK_SCHEMA,
          providerId: feedbackModel?.providerId, // Pass providerId for routing
        }
      );
      const repaired = jsonrepair(feedback?.choices[0]?.message?.content);
      const feedbackResult = JSON.parse(repaired);
      logger("📝 AI FEEDBACK:", `${JSON.stringify(feedbackResult, null, 2)}`);
      return feedbackResult;
    } catch (error) {
      console.log("CORE.runfeedback() ERROR", error);
      logger("🚨 AI FEEDBACK FAILED");
      return null;
    }
  },
  runSimilarity: async function (outA, outB, pair, logger, signal) {
    console.log("CORE.runSimilarity()", outA, outB);
    try {
      // Get embeddings model for similarity (use pair-specific or fall back to default from STORAGE if null)
      const embeddingModel = pair.settings?.embeddingModel;
      const embeddingModelId = embeddingModel?.id || undefined;
      const embeddingProviderId = embeddingModel?.providerId || undefined;

      const similarity = await AI_API.embeddingsGet(
        [outA, outB],
        embeddingModelId,
        signal,
        embeddingProviderId // Pass providerId for routing
      );
      const emb1 = similarity?.results[0]?.embedding;
      const emb2 = similarity?.results[1]?.embedding;
      if (!emb1 || !emb2) {
        logger("🚨 GET EMBEDDINGS FAILED");
        return null;
      }
      const similarityResult = this.cosineSimilarity(emb1, emb2);
      logger("👯‍♂️ COSINE SIMILARITY:", `${similarityResult}`);
      return similarityResult;
    } catch (error) {
      console.log("CORE.runSimilarity() ERROR", error);
      logger("🚨 COSINE SIMILARITY FAILED");
      return null;
    }
  },
  improvePromptByFeedback: async function (
    current,
    feedback,
    includeSummary,
    coreModel,
    existingSignal
  ) {
    console.log("CORE.improvePromptByFeedback()", current, feedback);
    // create a fresh abort controller for this run
    this._currentAbortController = new AbortController();
    const signal = existingSignal || this._currentAbortController.signal;
    const newPrompt = await AI_API.oneShotPrompt(
      IMPROVER_PROMPT,
      `<INSTRUCTIONS>${current}</INSTRUCTIONS> <FEEDBACKS>${feedback}</FEEDBACKS>`,
      coreModel?.id || null, //default core model
      {
        abortSignal: signal,
        jsonSchema: IMPROVER_SCHEMA,
        providerId: coreModel?.providerId || null, //default provider
      }
    );
    const json = JSON.parse(newPrompt?.choices[0]?.message?.content);
    return includeSummary ? json : json?.improvedPrompt;
  },
  generateSchema: async function (name, description) {
    console.log("CORE.generateSchema()", name, description);
    // create a fresh abort controller for this run
    this._currentAbortController = new AbortController();
    const signal = this._currentAbortController.signal;
    const schema = await AI_API.oneShotPrompt(
      INFER_SCHEMA_PROMPT,
      `<NAME>${name}</NAME> <DESCRIPTION>${description}</DESCRIPTION>`,
      null, //default core model
      {
        abortSignal: signal,
        jsonValid: true,
      }
    );
    return JSON.parse(schema?.choices[0]?.message?.content?.trim());
  },
  generateFunction: async function (name, description, schema, signature) {
    console.log("CORE.generateFunction()", name, description, schema, signature);
    // create a fresh abort controller for this run
    this._currentAbortController = new AbortController();
    const signal = this._currentAbortController.signal;
    const customFn = await AI_API.oneShotPrompt(
      INFER_FUNCTION_PROMPT,
      `<NAME>${name}</NAME>
        <DESCRIPTION>${description}</DESCRIPTION>
        <JSONSCHEMA>${schema}</JSONSCHEMA>
        <SIGNATURE>${signature}</SIGNATURE>`,
      null, //default core model
      {
        abortSignal: signal,
      }
    );
    return customFn?.choices[0]?.message?.content?.trim();
  },
  verifyToolsCalled: function (test, expectedToolsCalled, logger) {
    // Extract tool calls from the test response
    const expectedTools = expectedToolsCalled.map((t) => t.name || "Unnamed tool");
    logger(`🔧 TOOLS CALL CHECK: Expected tools: ${expectedTools.join(", ")}`);

    // Extract tool calls from API response
    const toolsCalled = test?.choices[0]?.message?.tool_calls || [];
    const calledToolDetails = toolsCalled
      .map((tc) => ({
        name: tc?.function?.name,
        arguments: tc?.function?.arguments,
      }))
      .filter((t) => t.name);

    const calledToolNames = calledToolDetails.map((t) => t.name);

    if (calledToolNames.length > 0) {
      const allExpectedCalled = expectedTools.every((expectedTool) =>
        calledToolNames.includes(expectedTool)
      );

      if (allExpectedCalled) {
        // Verify arguments for each called tool
        const toolDetails = calledToolDetails.map((calledTool) => {
          const expectedToolDef = expectedToolsCalled.find((t) => t.name === calledTool.name);

          let argumentsValid = null;
          let expectedParams = null;
          let actualParams = null;
          let expectedValues = null;
          let expectedValuesValid = null;

          // Check if tool has parameter schema defined
          if (expectedToolDef && expectedToolDef.parameters) {
            try {
              // Parse expected parameters schema
              let parametersSchema = expectedToolDef.parameters;
              if (typeof parametersSchema === "string") {
                parametersSchema = JSON.parse(parametersSchema);
              }
              expectedParams = parametersSchema.properties || {};

              // Parse actual arguments - handle double-encoded JSON strings
              let actualParams = calledTool.arguments || {};
              if (typeof actualParams === "string") {
                try {
                  actualParams = JSON.parse(actualParams);
                  // Check if it's still a string after first parse (double-encoded)
                  if (typeof actualParams === "string") {
                    actualParams = JSON.parse(actualParams);
                  }
                } catch (e) {
                  logger(`⚠️ ${calledTool.name} - Could not parse arguments`);
                  actualParams = {};
                }
              }

              // Verify that called arguments match expected parameters
              const providedArgs = Object.keys(actualParams);

              // Check if all required parameters are provided
              const requiredParams = parametersSchema.required || [];
              const allRequiredProvided = requiredParams.every((param) =>
                providedArgs.includes(param)
              );

              argumentsValid = allRequiredProvided;

              if (argumentsValid) {
                logger(`✅ ${calledTool.name} - Arguments valid: ${providedArgs.join(", ")}`);
              } else {
                const missingParams = requiredParams.filter((p) => !providedArgs.includes(p));
                logger(
                  `⚠️ ${calledTool.name} - Missing required parameters: ${missingParams.join(", ")}`
                );
              }

              // Verify expected parameter values if specified
              if (
                expectedToolDef.expectedParams &&
                Object.keys(expectedToolDef.expectedParams).length > 0
              ) {
                expectedValues = expectedToolDef.expectedParams;
                const mismatches = [];

                Object.entries(expectedValues).forEach(([paramName, expectedValue]) => {
                  // Only verify if an expected value was specified (non-empty)
                  if (
                    expectedValue === null ||
                    expectedValue === undefined ||
                    String(expectedValue).trim() === ""
                  ) {
                    return; // Skip empty/null expected values
                  }

                  const actualValue = actualParams[paramName];

                  // Try to parse expected value as JSON if it looks like JSON
                  let parsedExpectedValue = expectedValue;
                  if (typeof expectedValue === "string") {
                    const trimmed = expectedValue.trim();
                    if (
                      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
                      (trimmed.startsWith("{") && trimmed.endsWith("}"))
                    ) {
                      try {
                        parsedExpectedValue = JSON.parse(trimmed);
                      } catch (e) {
                        // Keep as string if parsing fails
                      }
                    }
                  }

                  // Compare values with type-aware comparison
                  let valuesMatch = false;
                  if (typeof parsedExpectedValue === "object" && parsedExpectedValue !== null) {
                    // For objects and arrays, use JSON comparison
                    valuesMatch =
                      JSON.stringify(actualValue) === JSON.stringify(parsedExpectedValue);
                  } else {
                    // For primitives, try multiple comparison strategies
                    valuesMatch =
                      actualValue === parsedExpectedValue || // Exact match
                      String(actualValue) === String(parsedExpectedValue) || // String comparison
                      Number(actualValue) === Number(parsedExpectedValue); // Numeric comparison
                  }

                  if (!valuesMatch) {
                    mismatches.push({
                      param: paramName,
                      expected: parsedExpectedValue,
                      actual: actualValue,
                    });
                  }
                });

                expectedValuesValid = mismatches.length === 0;

                if (expectedValuesValid) {
                  logger(`✅ ${calledTool.name} - Expected parameter values match`);
                } else {
                  mismatches.forEach((m) => {
                    const expectedStr =
                      typeof m.expected === "object"
                        ? JSON.stringify(m.expected)
                        : String(m.expected);
                    const actualStr =
                      typeof m.actual === "object" ? JSON.stringify(m.actual) : String(m.actual);
                    logger(
                      `⚠️ ${calledTool.name} - Parameter mismatch: ${m.param} - expected: ${expectedStr}, got: ${actualStr}`
                    );
                  });
                }
              }
            } catch (e) {
              logger(`⚠️ ${calledTool.name} - Could not validate arguments schema`);
              argumentsValid = null;
            }
          }

          return {
            name: calledTool.name,
            arguments: calledTool.arguments,
            argumentsValid,
            expectedParams,
            actualParams,
            expectedValues,
            expectedValuesValid,
          };
        });

        logger(`✅ TOOLS CALL VALID: ${calledToolNames.join(", ")}`);
        return {
          success: true,
          calledTools: toolDetails,
        };
      } else {
        const missing = expectedTools.filter((t) => !calledToolNames.includes(t));
        logger(`🚫 TOOLS CALL INVALID: Missing tools: ${missing.join(", ")}`);
        return {
          success: false,
          calledTools: calledToolDetails.map((t) => ({
            name: t.name,
            arguments: t.arguments,
          })),
          missing,
        };
      }
    } else {
      logger("🚫 TOOLS CALL INVALID: No tools were called");
      return { success: false, calledTools: [], missing: expectedTools };
    }
  },
  verifyJsonValid: function (result, settings, logger) {
    try {
      const parsedJson = JSON.parse(result);
      logger("✅ JSON VALID");

      // Perform JSON schema validation if enabled
      if (settings?.useJsonSchema && settings?.jsonSchema) {
        try {
          const schema = JSON.parse(settings.jsonSchema);
          const ajv = new Ajv({ strict: settings?.jsonSchemaStrict });
          const validate = ajv.compile(schema);
          const valid = validate(parsedJson);

          if (valid) {
            logger("✅ JSON SCHEMA VALID");
            return true;
          } else {
            const errors =
              validate.errors?.map((err) => `${err.instancePath} ${err.message}`).join(", ") ||
              "Unknown error";
            logger(`🚫 JSON SCHEMA INVALID: ${errors}`);
            return false;
          }
        } catch (schemaError) {
          logger(`🚫 JSON SCHEMA ERROR: ${schemaError.message}`);
          return false;
        }
      }

      return true;
    } catch (e) {
      logger(`🚫 JSON INVALID: ${e.message}`);
      return false;
    }
  },
  cosineSimilarity: function (a, b) {
    let dot = 0.0,
      na = 0.0,
      nb = 0.0;
    const n = a.length;
    for (let i = 0; i < n; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
  },
  fetchAvailableModels: async function (providerId, provider) {
    try {
      const models = await AI_API.fetchAvailableModels(providerId, provider);
      return models;
    } catch (error) {
      console.error("CORE.fetchAvailableModels() error:", error);
      throw error;
    }
  },
  fetchAvailableEmbeddings: async function (providerId, provider) {
    try {
      const embeddings = await AI_API.fetchAvailableEmbeddings(providerId, provider);
      return embeddings;
    } catch (error) {
      console.error("CORE.fetchAvailableEmbeddings() error:", error);
      throw error;
    }
  },
  // private
  chatMessage: async function (systemPrompt, userMessage, modelId, providerId, options = {}) {
    const { context, tools, jsonSchema, jsonStrict, abortSignal, onChunk, images } = options;

    try {
      const response = await AI_API.oneShotPrompt(systemPrompt, userMessage, modelId, {
        providerId,
        context,
        tools,
        jsonSchema,
        jsonStrict,
        abortSignal,
        onChunk, // Pass streaming callback through to provider API
        images, // Pass images for current user message
      });

      return response;
    } catch (error) {
      console.error("CORE.chatMessage() error:", error);
      throw error;
    }
  },
  /**
   * Execute a conversational loop with tool execution support
   * Handles AI responses, tool calls, and iterative follow-ups
   *
   * @param {Object} params - Configuration object
   * @param {string} params.systemPrompt - System instructions for the AI
   * @param {string} params.userMessage - Initial user message
   * @param {string} params.modelId - Model ID to use
   * @param {string} params.providerId - Provider ID
   * @param {Array} params.initialMessages - Previous conversation messages
   * @param {Array} params.tools - Available tools for execution
   * @param {Array} params.availableTools - Tool definitions for execution
   * @param {Object} params.ROLES - Roles constants
   * @param {number} params.maxIterations - Maximum tool execution loops (default: 5)
   * @param {Function} params.onMessageUpdate - Callback when messages are updated
   * @param {Function} params.onStreamChunk - Callback for streaming text chunks (textDelta) => void
   * @param {Function} params.executeToolFn - Tool execution function with signature (toolCall, availableTools, timeout)
   * @param {number} params.timeLimit - Tool execution timeout in milliseconds (default: 60000)
   * @returns {Promise<Object>} - Returns { success: boolean, messages: Array, error: string }
   */
  executeConversationalLoop: async function ({
    systemPrompt,
    userMessage,
    images, // NEW: Array of image objects with dataUrl and mimeType
    modelId,
    providerId,
    initialMessages = [],
    tools = [],
    availableTools = [],
    ROLES,
    maxIterations = 5,
    jsonSchema,
    jsonStrict,
    onMessageUpdate,
    onStreamChunk, // NEW: Callback for streaming chunks
    executeToolFn, // Renamed to avoid confusion with the call
    timeLimit = 60000, // Tool execution timeout in ms (default 30 seconds)
    abortSignal, // AbortSignal for cancellation
    initialRole,
  }) {
    try {
      // Allow initialRole to be passed, default to ROLES.USER
      // If userMessage is provided, add it as initial message
      // If empty/null/undefined, continue from initialMessages without adding new message
      let currentMessages;
      if (userMessage !== null && userMessage !== undefined && userMessage !== "") {
        const initialMsg = {
          role: initialRole || ROLES.USER,
          content: userMessage,
          images: images?.length > 0 ? images : undefined, // Include images if present
        };
        currentMessages = [...initialMessages, initialMsg];
      } else {
        // Continue from existing messages without adding new message
        currentMessages = [...initialMessages];
      }

      // Guard against empty messages array
      if (currentMessages.length === 0) {
        throw new Error("No messages to process - conversation cannot start with empty state");
      }

      let iterationCount = 0;
      let nextToolCallNum = 0;

      // Notify initial message
      if (onMessageUpdate) {
        onMessageUpdate([...currentMessages]);
      }

      // Loop to handle tool/agent execution and follow-up AI responses
      while (iterationCount < maxIterations) {
        // Check if aborted
        if (abortSignal?.aborted) {
          throw new Error("Conversation aborted by user");
        }

        iterationCount++;

        const lastMessage = currentMessages[currentMessages.length - 1];

        // If last message is a TOOL message, include it in context instead of as user message
        // This preserves the role when agents execute other agents as tools
        let context, userMessageContent, userMessageImages;
        if (lastMessage.role === ROLES.TOOL) {
          // Include all messages in context
          context = this.rebuildContextFromMessages(currentMessages, ROLES);
          userMessageContent = ""; // Empty user message since everything is in context
          userMessageImages = undefined;
        } else {
          // Build context from current conversation state (excluding the last message)
          context = this.rebuildContextFromMessages(currentMessages.slice(0, -1), ROLES);
          userMessageContent = lastMessage.content;
          userMessageImages = lastMessage.images; // Pass images from last user message
        }

        // Call CORE.chatMessage
        const response = await this.chatMessage(
          systemPrompt,
          userMessageContent,
          modelId,
          providerId,
          {
            context,
            tools,
            jsonSchema,
            jsonStrict,
            abortSignal,
            onChunk: onStreamChunk, // Pass streaming callback through to provider API
            images: userMessageImages, // Pass images for current user message
          }
        );

        // Extract the response data
        const assistantMessageContent =
          typeof response === "string" ? response : response?.choices?.[0]?.message?.content || "";

        const toolCalls = response?.choices?.[0]?.message?.tool_calls || [];
        const finishReason = response?.choices?.[0]?.finish_reason;

        // Debug logging for tool calls received from API
        if (toolCalls.length > 0) {
          console.log("[executeConversationalLoop] Tool calls received from API:", {
            count: toolCalls.length,
            toolCalls: toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.function?.name,
              hasArguments: !!tc.function?.arguments,
              argumentsType: typeof tc.function?.arguments,
              arguments: tc.function?.arguments,
            })),
          });
        }

        // AI responses are always ASSISTANT messages during the conversational loop
        // The initialRole only affects the first message, not AI responses
        const responseMessage = {
          role: ROLES.ASSISTANT,
          content: assistantMessageContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          // Include finish_reason to indicate if output was truncated due to max tokens
          finishReason: finishReason,
        };

        currentMessages.push(responseMessage);

        // Notify message update
        if (onMessageUpdate) {
          onMessageUpdate([...currentMessages]);
        }

        // If no tool calls, we're done
        if (!toolCalls || toolCalls.length === 0) {
          nextToolCallNum = 0;
          break;
        }
        nextToolCallNum = toolCalls.length;

        // Execute all tool calls and add their responses
        for (const toolCall of toolCalls) {
          // Use the provided executeToolFn if available, otherwise throw error
          if (!executeToolFn) {
            throw new Error("executeToolFn is required for tool execution");
          }

          const toolResult = await executeToolFn(toolCall, availableTools, timeLimit);

          // Add tool response message
          const toolMessage = {
            role: ROLES.TOOL,
            content: toolResult,
            toolId: toolCall.id,
            toolName: toolCall.function?.name,
          };

          currentMessages.push(toolMessage);

          // Notify message update
          if (onMessageUpdate) {
            onMessageUpdate([...currentMessages]);
          }
        }

        // Continue loop to let AI process the tool results
      }

      // Check if we hit max iterations
      if (iterationCount >= maxIterations && nextToolCallNum > 0) {
        console.warn("Maximum tool execution iterations reached");
        // throw new Error("Maximum tool execution iterations reached");
        return {
          success: false,
          messages: currentMessages,
          error: "Maximum tool execution iterations reached",
        };
      }

      return {
        success: true,
        messages: currentMessages,
        error: null,
      };
    } catch (error) {
      console.error("Error in conversational loop:", error);
      return {
        success: false,
        messages: [],
        error: error?.message || String(error),
      };
    }
  },
  /**
   * Rebuild context array from chat messages for API calls
   * Transforms UI message format to API context format including tool information
   * @param {Array} messages - Array of message objects from chat state
   * @param {Object} ROLES - Roles constants object
   * @returns {Array|undefined} - Context array for API or undefined if no messages
   */
  rebuildContextFromMessages: function (messages, ROLES) {
    if (!messages || messages.length === 0) {
      return undefined;
    }

    return messages.map((msg) => {
      const contextMsg = {
        role: msg.role,
        message: msg.content,
      };

      // Include images for user messages
      if (msg.role === ROLES.USER && msg.images && msg.images.length > 0) {
        contextMsg.images = msg.images;
      }

      // Include tool_calls for assistant messages
      if (msg.role === ROLES.ASSISTANT && msg.toolCalls) {
        contextMsg.toolCalls = msg.toolCalls;
      }

      // Include tool_call_id and tool_name for tool messages
      if (msg.role === ROLES.TOOL) {
        if (msg.toolId) {
          contextMsg.toolId = msg.toolId;
        }
        if (msg.toolName) {
          contextMsg.toolName = msg.toolName;
        }
      }

      return contextMsg;
    });
  },
  /**
   * Count tokens for text or messages array
   * @param {string|Array} input - Text string or messages array (conversation)
   * @param {Object} options - Options object
   * @param {string} options.providerId - Provider ID (chatgpt, anthropic, ollama, etc.)
   * @param {string} options.modelId - Model ID for more accurate tokenization
   * @returns {Promise<Object>} Token count result with count and provider info
   */
  countTokens: async function (input, options = {}) {
    return TOKENIZER.countTokens(input, options);
  },
  /**
   * Count tokens for multiple providers at once
   * @param {string|Array} input - Text string or messages array
   * @param {Array<string>} providerIds - Array of provider IDs
   * @param {string} modelId - Optional model ID
   * @returns {Promise<Object>} Object with token counts per provider
   */
  countTokensMultiProvider: async function (input, providerIds = [], modelId = null) {
    return TOKENIZER.countTokensMultiProvider(input, providerIds, modelId);
  },
  /**
   * Estimate token count (simple character-based estimation)
   * @param {string|Array} input - Text string or messages array
   * @returns {number} Estimated token count
   */
  estimateTokenCount: function (input) {
    return TOKENIZER.estimateTokenCount(input);
  },
  /**
   * Count tokens across all providers and return the average
   * @param {string|Array} input - Text string or messages array
   * @param {Array<string>} providerIds - Optional array of provider IDs
   * @param {string} modelId - Optional model ID
   * @returns {Promise<Object>} Object with average token count and per-provider details
   */
  countTokensAverage: async function (input, providerIds = [], modelId = null) {
    return TOKENIZER.countTokensAverage(input, providerIds, modelId);
  },
};

export { CORE, TOKENIZER };
