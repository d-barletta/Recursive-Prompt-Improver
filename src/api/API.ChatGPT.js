/*************** ChatGPT API **************/

import { ROLES } from "@utils/constants";

// Known OpenAI model metadata (API doesn't provide context window info)
const OPENAI_MODEL_METADATA = {
  "gpt-4o": { contextLength: 128000, supportsVision: true },
  "gpt-4o-mini": { contextLength: 128000, supportsVision: true },
  "gpt-4-turbo": { contextLength: 128000, supportsVision: true },
  "gpt-4-turbo-preview": { contextLength: 128000, supportsVision: false },
  "gpt-4": { contextLength: 8192, supportsVision: false },
  "gpt-4-32k": { contextLength: 32768, supportsVision: false },
  "gpt-3.5-turbo": { contextLength: 16385, supportsVision: false },
  "gpt-3.5-turbo-16k": { contextLength: 16385, supportsVision: false },
};

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
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`OpenAI models error: ${json.error.message}`);
      }
      // Filter for chat models and sort by id
      const chatModels = json.data
        .filter((model) => model.id.includes("gpt"))
        .map((model) => {
          // Look up metadata from known models, or use defaults
          const metadata = OPENAI_MODEL_METADATA[model.id] || {};
          return {
            id: model.id,
            text: model.id,
            // Add model metadata (from known models or defaults)
            contextLength: metadata.contextLength || null,
            supportsTools: true, // All GPT models support tools
            supportsVision: metadata.supportsVision || false,
            supportsJsonOutput: true, // All GPT models support JSON output
          };
        })
        .sort((a, b) => a.id.localeCompare(b.id));
      return chatModels;
    } catch (error) {
      throw new Error(`Failed to fetch OpenAI models: ${error.message}`);
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`OpenAI embeddings error: ${json.error.message}`);
      }
      // Filter for embedding models and sort by id
      const embeddingModels = json.data
        .filter((model) => model.id.includes("embedding"))
        .map((model) => ({
          id: model.id,
          text: model.id,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
      return embeddingModels;
    } catch (error) {
      throw new Error(`Failed to fetch OpenAI embeddings: ${error.message}`);
    }
  },
  generateAccessToken: async function () {
    // OpenAI doesn't need token generation - API key is used directly
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const signal = abortSignal || undefined;
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify({
        model: modelId,
        input: inputs, // OpenAI accepts array of strings directly
      }),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(`ChatGPT embeddings error: ${json.error.message}`);
    }
    // Transform OpenAI response to match WatsonX format
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

    // Helper function to build content array with images
    const buildContentWithImages = (text, images) => {
      if (!images || images.length === 0) {
        return text || "";
      }
      // Build content array with text and images
      const contentParts = [];
      if (text) {
        contentParts.push({ type: "text", text: text });
      }
      images.forEach((img) => {
        // Extract base64 data from dataUrl (format: data:image/jpeg;base64,...)
        const dataUrl = img.dataUrl || img.url;
        contentParts.push({
          type: "image_url",
          image_url: {
            url: dataUrl,
            detail: "auto", // Can be "low", "high", or "auto"
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
          strict: !!jsonStrict, //false will allow the model to return additional fields
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
          role: ROLES.SYSTEM.toLowerCase(),
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
        // This allows tool messages to be the last message in context
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

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ChatGPT API error: ${response.status} ${errorText}`);
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
              console.warn("Failed to parse SSE chunk:", parseError);
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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });
    const json = await response.json();
    if (json.error) {
      throw new Error(`ChatGPT chat error (model: ${modelId}): ${json.error.message}`);
    }
    // Return response in WatsonX-compatible format
    return json;
  },
};
