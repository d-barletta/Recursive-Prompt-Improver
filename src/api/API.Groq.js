/*************** Groq API **************/

import { ROLES } from "@utils/constants";

export const AI_API = {
  getDefaultHeaders: function (providerParams) {
    const apiKey = providerParams.apiKey;
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`, // Groq uses API key directly
      },
    };
  },
  fetchAvailableModels: async function (apiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(`Groq models error: ${json.error.message}`);
      }
      // Map Groq models to the expected format with metadata
      const models = (json.data || []).map((model) => ({
        id: model.id,
        text: model.id,
        // Add model metadata from API response
        contextLength: model.context_window || null,
        supportsTools: true, // Groq supports tools for all chat models
        supportsVision: model.id?.toLowerCase().includes("vision") || false,
        supportsJsonOutput: true, // Groq supports JSON output
      }));
      return models;
    } catch (error) {
      throw new Error(`Failed to fetch Groq models: ${error.message}`);
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    // Groq doesn't support embeddings
    return [];
  },
  generateAccessToken: async function () {
    // Groq uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    throw new Error("Embeddings API not available with Groq");
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

    // Handle tools if provided (Groq uses OpenAI-compatible format)
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
              // Add tool_call_id for tool messages (Groq uses OpenAI format)
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

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        ...this.getDefaultHeaders(providerParams),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorText}`);
      }

      // Process streaming response (Groq uses OpenAI-compatible SSE format)
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
    // Groq uses OpenAI-compatible format but with much faster inference
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      ...this.getDefaultHeaders(providerParams),
      signal,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(`Groq error (model: ${modelId}): ${json.error.message}`);
    }

    // Return response (Groq's response is already OpenAI-compatible)
    return json;
  },
};
