/*************** Grok (xAI) API **************/

import { ROLES, GROK_MODELS } from "@utils/constants";

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
      const response = await fetch("https://api.x.ai/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`Grok models error: ${json.error.message}`);
      }
      // Map xAI models to the expected format with metadata
      const models = (json.data || [])
        .filter((model) => model.id.includes("grok"))
        .map((model) => ({
          id: model.id,
          text: model.id,
          // Add model metadata
          contextLength: model.context_length || null,
          supportsTools: true, // Grok models support tools
          supportsVision: model.id?.toLowerCase().includes("vision") || false,
          supportsJsonOutput: true, // Grok supports JSON output
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return models.length > 0 ? models : GROK_MODELS;
    } catch (error) {
      console.warn(`Failed to fetch Grok models: ${error.message}`);
      return GROK_MODELS;
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    try {
      const response = await fetch("https://api.x.ai/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`Grok embeddings error: ${json.error.message}`);
      }
      // Filter for embedding models
      const embeddingModels = (json.data || [])
        .filter((model) => model.id.includes("embed"))
        .map((model) => ({
          id: model.id,
          text: model.id,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return embeddingModels;
    } catch (error) {
      console.warn(`Failed to fetch Grok embeddings: ${error.message}`);
      return [];
    }
  },
  generateAccessToken: async function () {
    // xAI uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const signal = abortSignal || undefined;
    const response = await fetch("https://api.x.ai/v1/embeddings", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify({
        model: modelId,
        input: inputs, // xAI accepts array of strings directly (OpenAI-compatible)
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(`Grok embeddings error: ${json.error.message}`);
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
      images, // Images for current user message
    } = options;
    const maxTokens = providerParams.maxTokens;
    const temperature = providerParams.temperature;
    const signal = abortSignal || undefined;
    const additionalParams = {};

    // Helper function to build content array with images (OpenAI-compatible)
    const buildContentWithImages = (text, images) => {
      if (!images || images.length === 0) {
        return text || "";
      }
      const contentParts = [];
      if (text) {
        contentParts.push({ type: "text", text: text });
      }
      images.forEach((img) => {
        const dataUrl = img.dataUrl || img.url;
        contentParts.push({
          type: "image_url",
          image_url: {
            url: dataUrl,
            detail: "auto",
          },
        });
      });
      return contentParts;
    };

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

    // Handle tools if provided (xAI uses OpenAI-compatible format)
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
                content: buildContentWithImages(c?.message || "", c?.images),
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
                content: buildContentWithImages(prompt, images), // Include images for current user message
              },
            ]
          : []),
      ],
    };

    // Enable streaming if onChunk callback is provided
    if (onChunk) {
      requestBody.stream = true;

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API error: ${response.status} ${errorText}`);
      }

      // Process streaming response (xAI uses OpenAI-compatible SSE format)
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
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(`Grok error (model: ${modelId}): ${json.error.message}`);
    }

    // Return response (xAI's response is already OpenAI-compatible)
    return json;
  },
};
