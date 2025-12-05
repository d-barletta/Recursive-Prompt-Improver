/*************** Azure OpenAI API **************/

import { ROLES, AZURE_MODELS, AZURE_EMBEDDINGS } from "@utils/constants";

export const AI_API = {
  getDefaultHeaders: function (providerParams) {
    const apiKey = providerParams.apiKey;
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
    };
  },
  fetchAvailableModels: async function (_apiKey, _azureEndpoint, _apiVersion = "2024-10-21") {
    // Azure OpenAI doesn't have a public models list API - deployments are configured in Azure Portal
    // Return hardcoded list of common Azure OpenAI models
    return AZURE_MODELS;
  },
  fetchAvailableEmbeddings: async function (_apiKey, _azureEndpoint, _apiVersion = "2024-10-21") {
    // Azure OpenAI doesn't have a public embeddings list API
    // Return hardcoded list of common Azure OpenAI embedding models
    return AZURE_EMBEDDINGS;
  },
  generateAccessToken: async function () {
    // Azure OpenAI uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const signal = abortSignal || undefined;
    const azureEndpoint = providerParams.azureEndpoint;
    const apiVersion = providerParams.azureApiVersion || "2024-10-21";

    // Azure OpenAI embeddings endpoint format:
    // https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/embeddings?api-version={api-version}
    const response = await fetch(
      `${azureEndpoint}/openai/deployments/${modelId}/embeddings?api-version=${apiVersion}`,
      {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify({
          input: inputs, // Azure accepts array of strings directly
        }),
      }
    );
    const json = await response.json();
    if (json.error) {
      throw new Error(`Azure embeddings error: ${json.error.message}`);
    }
    // Transform response to match WatsonX format
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
    const azureEndpoint = providerParams.azureEndpoint;
    const apiVersion = providerParams.azureApiVersion || "2024-10-21";
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

    // Handle tools if provided (Azure uses OpenAI-compatible format)
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
      max_tokens: maxTokens,
      temperature: temperature,
      ...additionalParams,
      messages: [
        {
          role: ROLES.SYSTEM.toLowerCase(),
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

    // Azure OpenAI chat completions endpoint format:
    // https://{resource-name}.openai.azure.com/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}
    const endpoint = `${azureEndpoint}/openai/deployments/${modelId}/chat/completions?api-version=${apiVersion}`;

    // Enable streaming if onChunk callback is provided
    if (onChunk) {
      requestBody.stream = true;

      const response = await fetch(endpoint, {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.status} ${errorText}`);
      }

      // Process streaming response (Azure uses OpenAI-compatible SSE format)
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
    const response = await fetch(endpoint, {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(`Azure OpenAI error (model: ${modelId}): ${json.error.message}`);
    }

    // Return response (Azure's response is already OpenAI-compatible)
    return json;
  },
};
