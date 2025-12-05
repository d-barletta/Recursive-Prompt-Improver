/*************** LM Studio Local API **************/
// LM Studio is a local AI server that exposes an OpenAI-compatible API
// Default endpoint: http://localhost:1234/v1

import { ROLES } from "@utils/constants";

// Maximum length for log truncation in error messages
const LOG_TRUNCATION_LENGTH = 100;

// Common embedding model name patterns for various providers
const EMBEDDING_MODEL_PATTERNS = [
  "embed", // OpenAI: text-embedding-*, nomic-embed-text, etc.
  "bge", // BAAI BGE models
  "e5", // Microsoft E5 models
  "sentence-transformer", // Sentence transformers
  "gte", // Alibaba GTE models
  "minilm", // MiniLM models
];

const isEmbeddingModel = (modelId) => {
  const lowerId = modelId.toLowerCase();
  return EMBEDDING_MODEL_PATTERNS.some((pattern) => lowerId.includes(pattern));
};

export const AI_API = {
  getDefaultHeaders: function () {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer lm-studio", // LM Studio uses placeholder API key
      },
    };
  },
  fetchAvailableModels: async function (lmstudioUrl) {
    try {
      const response = await fetch(`${lmstudioUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`LM Studio models error: ${json.error.message || json.error}`);
      }
      // Filter out embedding models and add metadata
      const models = (json.data || [])
        .filter((model) => !isEmbeddingModel(model.id))
        .map((model) => ({
          id: model.id,
          text: model.id,
          // Add model metadata (LM Studio provides limited info)
          contextLength: model.context_length || null,
          supportsTools: true, // LM Studio models typically support tools
          supportsVision:
            model.id?.toLowerCase().includes("vision") ||
            model.id?.toLowerCase().includes("llava") ||
            false,
          supportsJsonOutput: true, // LM Studio supports JSON output
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return models;
    } catch (error) {
      throw new Error(`Failed to fetch LM Studio models: ${error.message}`);
    }
  },
  fetchAvailableEmbeddings: async function (lmstudioUrl) {
    try {
      const response = await fetch(`${lmstudioUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`LM Studio embeddings error: ${json.error.message || json.error}`);
      }
      // Filter for embedding models using common naming patterns
      const embeddingModels = (json.data || [])
        .filter((model) => isEmbeddingModel(model.id))
        .map((model) => ({
          id: model.id,
          text: model.id,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return embeddingModels;
    } catch (error) {
      throw new Error(`Failed to fetch LM Studio embeddings: ${error.message}`);
    }
  },
  generateAccessToken: async function () {
    // LM Studio local API doesn't need authentication
    return Promise.resolve({ access_token: "local" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const lmstudioUrl = providerParams.lmstudioUrl || "http://localhost:1234/v1";
    const signal = abortSignal || undefined;
    const response = await fetch(`${lmstudioUrl}/embeddings`, {
      ...this.getDefaultHeaders(),
      signal,
      body: JSON.stringify({
        model: modelId,
        input: inputs, // OpenAI API accepts array of strings directly
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(`LM Studio embeddings error: ${json.error.message || json.error}`);
    }
    // Transform response to match expected format
    return {
      results: json.data.map((item) => ({
        embedding: item.embedding,
      })),
    };
  },
  oneShotPrompt: async function (systemPrompt, prompt, modelId, options = {}) {
    const {
      context,
      abortSignal,
      jsonSchema,
      jsonValid,
      jsonStrict,
      tools,
      providerParams,
      onChunk,
    } = options;
    const lmstudioUrl = providerParams.lmstudioUrl || "http://localhost:1234/v1";
    const maxTokens = providerParams.maxTokens;
    const temperature = providerParams.temperature;
    const signal = abortSignal || undefined;
    const additionalParams = {};

    // Handle JSON schema and JSON object response formats
    if (jsonSchema) {
      additionalParams.response_format = {
        type: "json_schema",
        json_schema: {
          name: "promptschema",
          schema: jsonSchema,
          strict: !!jsonStrict,
        },
      };
    } else if (jsonValid) {
      additionalParams.response_format = {
        type: "json_object",
      };
    }

    // Handle tools if provided (OpenAI API specification)
    if (tools && tools.length > 0) {
      additionalParams.tools = tools.map((tool) => {
        // Parse parameters schema if it's a string
        let parametersSchema = tool.parameters || {};
        if (typeof parametersSchema === "string") {
          try {
            parametersSchema = JSON.parse(parametersSchema);
          } catch (e) {
            parametersSchema = {};
          }
        }

        return {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description || "",
            parameters: {
              type: "object",
              properties: parametersSchema.properties || {},
              required: parametersSchema.required || [],
            },
          },
        };
      });
    }

    const requestBody = {
      model: modelId,
      max_tokens: maxTokens,
      temperature: temperature,
      ...additionalParams,
      messages: [
        {
          role: ROLES.SYSTEM,
          content: systemPrompt,
        },
        ...(context?.length
          ? context.map((c) => {
              const msg = {
                role: c?.role || ROLES.USER,
                content: c?.message || "",
              };
              // Add tool_calls for assistant messages
              if (c?.role === ROLES.ASSISTANT && c?.toolCalls?.length > 0) {
                msg.tool_calls = c.toolCalls;
              }
              // Add tool_call_id for tool messages
              if (c?.role === ROLES.TOOL && c?.toolId) {
                msg.tool_call_id = c.toolId;
              }
              return msg;
            })
          : []),
        // Only add user message if prompt is not empty
        // This allows tool messages to be the last message in context
        ...(prompt
          ? [
              {
                role: ROLES.USER,
                content: prompt,
              },
            ]
          : []),
      ],
    };

    // Enable streaming if onChunk callback is provided
    if (onChunk) {
      requestBody.stream = true;

      const response = await fetch(`${lmstudioUrl}/chat/completions`, {
        ...this.getDefaultHeaders(),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LM Studio API error: ${response.status} ${errorText}`);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullContent = "";
      let toolCalls = [];
      let finishReason = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const jsonStr = trimmed.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              // Capture finish_reason from the final chunk
              if (data.choices?.[0]?.finish_reason) {
                finishReason = data.choices[0].finish_reason;
              }

              if (data.choices?.[0]?.delta) {
                const delta = data.choices[0].delta;

                // Handle content delta
                if (delta.content) {
                  fullContent += delta.content;
                  onChunk(delta.content);
                }

                // Handle tool calls delta
                if (delta.tool_calls) {
                  delta.tool_calls.forEach((toolCallDelta) => {
                    const index = toolCallDelta.index;
                    if (!toolCalls[index]) {
                      toolCalls[index] = {
                        id: toolCallDelta.id || "",
                        type: "function",
                        function: {
                          name: "",
                          arguments: "",
                        },
                      };
                    }
                    if (toolCallDelta.id) {
                      toolCalls[index].id = toolCallDelta.id;
                    }
                    if (toolCallDelta.function?.name) {
                      toolCalls[index].function.name += toolCallDelta.function.name;
                    }
                    if (toolCallDelta.function?.arguments) {
                      toolCalls[index].function.arguments += toolCallDelta.function.arguments;
                    }
                  });
                }
              }
            } catch (parseError) {
              // Log the error with context for debugging
              console.warn(
                `Failed to parse SSE chunk: ${parseError.message}. Line content: "${trimmed.substring(0, LOG_TRUNCATION_LENGTH)}${trimmed.length > LOG_TRUNCATION_LENGTH ? "..." : ""}"`
              );
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Return complete response in standard format
      const result = {
        choices: [
          {
            message: {
              content: fullContent,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
            },
            finish_reason: finishReason,
          },
        ],
      };

      return result;
    }

    // Non-streaming mode (original behavior)
    const response = await fetch(`${lmstudioUrl}/chat/completions`, {
      ...this.getDefaultHeaders(),
      signal,
      body: JSON.stringify(requestBody),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(
        `LM Studio chat error (model: ${modelId}): ${json.error.message || json.error}`
      );
    }
    // Return response in OpenAI-compatible format
    return json;
  },
};
