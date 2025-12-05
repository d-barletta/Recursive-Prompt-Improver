/*************** HuggingFace Inference API **************/

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
      // Fetch text-generation models from HuggingFace API
      const response = await fetch(
        "https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&limit=50",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace models error: ${response.status} ${errorText}`);
      }
      const json = await response.json();
      if (json.error) {
        throw new Error(`HuggingFace models error: ${json.error}`);
      }
      // Map HuggingFace models to the expected format with metadata
      const models = (json || []).map((model) => ({
        id: model.id,
        text: model.id,
        // Add model metadata from HuggingFace response if available
        contextLength: model.config?.max_position_embeddings || null,
        supportsTools: true, // Assume tools support for Inference API
        supportsVision: model.pipeline_tag === "image-text-to-text" || false,
        supportsJsonOutput: true, // Inference API supports JSON output
      }));
      return models;
    } catch (error) {
      throw new Error(`Failed to fetch HuggingFace models: ${error.message}`);
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    try {
      // Fetch feature-extraction (embeddings) models from HuggingFace API
      const response = await fetch(
        "https://huggingface.co/api/models?pipeline_tag=feature-extraction&sort=downloads&limit=50",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace embeddings error: ${response.status} ${errorText}`);
      }
      const json = await response.json();
      if (json.error) {
        throw new Error(`HuggingFace embeddings error: ${json.error}`);
      }
      // Map HuggingFace models to the expected format
      const models = (json || []).map((model) => ({
        id: model.id,
        text: model.id,
      }));
      return models;
    } catch (error) {
      throw new Error(`Failed to fetch HuggingFace embeddings: ${error.message}`);
    }
  },
  generateAccessToken: async function () {
    // HuggingFace uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const signal = abortSignal || undefined;
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${modelId}`, {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify({
        inputs: inputs,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace embeddings error: ${response.status} ${errorText}`);
    }
    const json = await response.json();
    if (json.error) {
      throw new Error(`HuggingFace embeddings error: ${json.error}`);
    }
    // Transform HuggingFace response to match expected format
    // HuggingFace returns array of embeddings directly
    return {
      results: Array.isArray(json)
        ? json.map((embedding) => ({
            embedding: Array.isArray(embedding) ? embedding : embedding.embedding || embedding,
          }))
        : [{ embedding: json }],
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

    // Handle tools if provided (OpenAI-compatible format)
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

      const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
      }

      // Process streaming response (OpenAI-compatible SSE format)
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
    // HuggingFace uses OpenAI-compatible format for chat completions
    const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(`HuggingFace error (model: ${modelId}): ${json.error}`);
    }

    // Return response (HuggingFace's response is OpenAI-compatible)
    return json;
  },
};
