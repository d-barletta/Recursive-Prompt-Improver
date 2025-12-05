/*************** Mistral AI API **************/

import { ROLES } from "@utils/constants";

export const AI_API = {
  getDefaultHeaders: function (providerParams) {
    const apiKey = providerParams.apiKey;
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    };
  },
  fetchAvailableModels: async function (apiKey) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`Mistral models error: ${json.error.message}`);
      }
      // Map Mistral models to the expected format with metadata
      const models = (json.data || []).map((model) => ({
        id: model.id,
        text: model.id,
        // Add model metadata from API response
        contextLength: model.max_context_length || null,
        supportsTools: model.capabilities?.function_calling || false,
        supportsVision: model.capabilities?.vision || false,
        supportsJsonOutput: model.capabilities?.completion_chat || true,
      }));
      return models;
    } catch (error) {
      throw new Error(`Failed to fetch Mistral models: ${error.message}`);
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`Mistral embeddings error: ${json.error.message}`);
      }
      // Filter for embedding models (Mistral embedding models contain "embed" in their id)
      const embeddingModels = (json.data || [])
        .filter((model) => model.id.includes("embed"))
        .map((model) => ({
          id: model.id,
          text: model.id,
        }));
      return embeddingModels;
    } catch (error) {
      throw new Error(`Failed to fetch Mistral embeddings: ${error.message}`);
    }
  },
  generateAccessToken: async function () {
    // Mistral uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const signal = abortSignal || undefined;
    const response = await fetch("https://api.mistral.ai/v1/embeddings", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify({
        model: modelId,
        input: inputs, // Mistral accepts array of strings directly
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(`Mistral embeddings error: ${json.error.message}`);
    }
    // Transform Mistral response to match WatsonX format
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

    // Handle tools if provided (Mistral uses OpenAI-compatible format)
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
                role: ROLES.USER.toLowerCase(),
                content: prompt,
              },
            ]
          : []),
      ],
    };

    // Enable streaming if onChunk callback is provided
    if (onChunk) {
      requestBody.stream = true;

      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API error: ${response.status} ${errorText}`);
      }

      // Process streaming response (Mistral uses OpenAI-compatible SSE format)
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
              console.warn("Failed to parse SSE chunk:", parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Return complete response in standard format
      return {
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
    }

    // Non-streaming mode (original behavior)
    // Mistral uses OpenAI-compatible format
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(`Mistral error (model: ${modelId}): ${json.error.message}`);
    }

    // Return response (Mistral's response is OpenAI-compatible)
    return json;
  },
};
