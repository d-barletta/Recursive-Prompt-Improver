/*************** Gemini API **************/

import { ROLES, GEMINI_MODELS, OPENAI_EMBEDDINGS } from "@utils/constants";

export const AI_API = {
  getDefaultHeaders: function (providerParams) {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };
  },
  fetchAvailableModels: async function (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const json = await response.json();
      if (json.error) {
        throw new Error(`Gemini models error: ${json.error.message}`);
      }
      // Filter for generative models and map to expected format with metadata
      const models = (json.models || [])
        .filter((model) => model.supportedGenerationMethods?.includes("generateContent"))
        .map((model) => ({
          id: model.name.replace("models/", ""),
          text: model.displayName || model.name.replace("models/", ""),
          // Add model metadata from API response
          contextLength: model.inputTokenLimit || null,
          supportsTools: model.supportedGenerationMethods?.includes("generateContent") || false,
          // Vision support is determined by model name pattern (e.g., gemini-pro-vision, gemini-1.5-pro with vision)
          supportsVision:
            model.name?.toLowerCase().includes("vision") ||
            model.name?.toLowerCase().includes("gemini-1.5") ||
            model.name?.toLowerCase().includes("gemini-2") ||
            false,
          supportsJsonOutput: true, // Gemini supports JSON output for all generative models
        }));
      return models.length > 0 ? models : GEMINI_MODELS;
    } catch (error) {
      // Return hardcoded list if API call fails
      console.warn(`Failed to fetch Gemini models: ${error.message}`);
      return GEMINI_MODELS;
    }
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const json = await response.json();
      if (json.error) {
        throw new Error(`Gemini embeddings error: ${json.error.message}`);
      }
      // Filter for embedding models
      const embeddingModels = (json.models || [])
        .filter((model) => model.supportedGenerationMethods?.includes("embedContent"))
        .map((model) => ({
          id: model.name.replace("models/", ""),
          text: model.displayName || model.name.replace("models/", ""),
        }));
      return embeddingModels.length > 0 ? embeddingModels : OPENAI_EMBEDDINGS;
    } catch (error) {
      // Return hardcoded list if API call fails
      console.warn(`Failed to fetch Gemini embeddings: ${error.message}`);
      return OPENAI_EMBEDDINGS;
    }
  },
  generateAccessToken: async function () {
    // Gemini uses API key as URL parameter, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    const apiKey = providerParams.apiKey;
    const signal = abortSignal || undefined;

    // Batch requests for each input
    const embeddings = await Promise.all(
      inputs.map(async (text, index) => {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/${modelId}:embedContent?key=${apiKey}`,
            {
              ...this.getDefaultHeaders(providerParams),
              signal,
              body: JSON.stringify({
                model: modelId,
                content: { parts: [{ text }] },
                taskType: "RETRIEVAL_DOCUMENT",
              }),
            }
          );

          const json = await response.json();
          if (json.error) {
            throw new Error(`Gemini embeddings error for input ${index}: ${json.error.message}`);
          }
          return json.embedding;
        } catch (error) {
          throw new Error(`Failed to get Gemini embeddings for input ${index}: ${error.message}`);
        }
      })
    );

    // Transform Gemini response to match WatsonX format
    return {
      results: embeddings.map((embedding) => ({
        embedding: embedding.values,
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
    const apiKey = providerParams.apiKey;
    const maxTokens = providerParams.maxTokens;
    const temperature = providerParams.temperature;
    const signal = abortSignal || undefined;

    // Helper function to build parts array with images for Gemini
    const buildPartsWithImages = (text, images) => {
      const parts = [];
      if (text) {
        parts.push({ text: text });
      }
      if (images && images.length > 0) {
        images.forEach((img) => {
          // Extract base64 data and MIME type from dataUrl
          const dataUrl = img.dataUrl || img.url;
          if (!dataUrl) return; // Skip if no valid dataUrl
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            parts.push({
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            });
          }
        });
      }
      return parts.length > 0 ? parts : [{ text: "" }];
    };

    // Build contents array for Gemini format
    const contents = [];

    // Add system prompt if present
    if (systemPrompt) {
      contents.push({
        role: ROLES.USER,
        parts: [{ text: `[System Instructions]\n${systemPrompt}` }],
      });
    }

    // Add context messages if present
    if (context?.length) {
      context.forEach((c) => {
        // Handle tool response messages
        if (c?.role === ROLES.TOOL) {
          contents.push({
            role: ROLES.USER,
            parts: [
              {
                functionResponse: {
                  name: c?.toolName || "unknown",
                  response: {
                    content: c?.message || "",
                  },
                },
              },
            ],
          });
        }
        // Handle assistant messages with tool calls
        else if (c?.role === ROLES.ASSISTANT && c?.toolCalls?.length > 0) {
          const parts = [];
          // Add text content if present
          if (c?.message) {
            parts.push({ text: c.message });
          }
          // Add function calls
          c.toolCalls.forEach((tc) => {
            const args =
              typeof tc.function?.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : tc.function?.arguments || {};
            parts.push({
              functionCall: {
                name: tc.function?.name,
                args: args,
              },
            });
          });
          contents.push({
            role: "model",
            parts: parts,
          });
        }
        // Handle regular user/assistant messages (with potential images)
        else {
          contents.push({
            role: c?.role === ROLES.ASSISTANT ? "model" : ROLES.USER,
            parts: buildPartsWithImages(c?.message || "", c?.images),
          });
        }
      });
    }

    // Only add user message if prompt is not empty
    // This allows tool messages to be the last message in context
    if (prompt) {
      contents.push({
        role: ROLES.USER,
        parts: buildPartsWithImages(prompt, images), // Include images for current user message
      });
    }

    const requestBody = {
      contents: contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      },
    };

    // Handle JSON mode (Gemini supports JSON response)
    if (jsonSchema || jsonValid) {
      requestBody.generationConfig.response_mime_type = "application/json";
      if (jsonSchema) {
        requestBody.generationConfig.response_schema = jsonSchema;
      }
    }

    // Handle tools if provided (Gemini API specification)
    if (tools && tools.length > 0) {
      requestBody.tools = [
        {
          functionDeclarations: tools.map((tool) => {
            // Parse parameters schema if it's a string
            let parametersSchema = tool.parameters || {};
            if (typeof parametersSchema === "string") {
              try {
                parametersSchema = JSON.parse(parametersSchema);
              } catch (e) {
                parametersSchema = {};
              }
            }

            // Ensure the schema follows OpenAPI format expected by Gemini
            // If the schema already has type: "object", use it as-is
            // Otherwise wrap the properties in the correct structure
            let schemaToUse;
            if (parametersSchema.type === "object") {
              schemaToUse = parametersSchema;
            } else if (parametersSchema.properties) {
              schemaToUse = {
                type: "object",
                properties: parametersSchema.properties,
                required: parametersSchema.required || [],
              };
            } else {
              // If no properties, create minimal valid schema
              schemaToUse = {
                type: "object",
                properties: {},
              };
            }

            return {
              name: tool.name,
              description: tool.description || "",
              parameters: schemaToUse,
            };
          }),
        },
      ];
    }

    // Streaming mode
    if (onChunk) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`,
        {
          ...this.getDefaultHeaders(),
          signal,
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullContent = "";
      let functionCalls = [];
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
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            try {
              const jsonStr = trimmed.slice(6); // Remove "data: " prefix
              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(`Gemini error (model: ${modelId}): ${data.error.message}`);
              }

              // Check for blocked content
              if (
                data.promptFeedback?.blockReason ||
                data.candidates?.[0]?.finishReason === "SAFETY"
              ) {
                throw new Error("Content blocked by Gemini safety settings");
              }

              const candidate = data.candidates?.[0];

              // Capture finishReason - Gemini uses "MAX_TOKENS" when output is truncated
              if (candidate?.finishReason) {
                // Map Gemini finishReason to OpenAI-compatible format
                finishReason =
                  candidate.finishReason === "MAX_TOKENS" ? "length" : candidate.finishReason;
              }

              if (candidate?.content?.parts) {
                candidate.content.parts.forEach((part) => {
                  // Handle text content
                  if (part.text) {
                    fullContent += part.text;
                    onChunk(part.text);
                  }
                  // Handle function calls
                  if (part.functionCall) {
                    functionCalls.push(part.functionCall);
                  }
                });
              }
            } catch (parseError) {
              console.warn("Failed to parse Gemini chunk:", parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Convert function calls to standard format
      const toolCalls = functionCalls.map((fc, index) => ({
        id: `call_${index}`,
        type: "function",
        function: {
          name: fc.name,
          arguments: JSON.stringify(fc.args),
        },
      }));

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        ...this.getDefaultHeaders(),
        signal,
        body: JSON.stringify(requestBody),
      }
    );

    const json = await response.json();
    if (json.error) {
      throw new Error(`Gemini error (model: ${modelId}): ${json.error.message}`);
    }

    // Check for blocked content
    if (json.promptFeedback?.blockReason || json.candidates?.[0]?.finishReason === "SAFETY") {
      throw new Error("Content blocked by Gemini safety settings");
    }

    // Transform Gemini response to match WatsonX format
    const candidate = json.candidates[0];
    return {
      choices: [
        {
          message: {
            content: candidate.content.parts.find((p) => p.text)?.text || "",
            tool_calls: candidate.content.parts
              .filter((p) => p.functionCall)
              .map((p, index) => ({
                id: `call_${index}`,
                type: "function",
                function: {
                  name: p.functionCall.name,
                  arguments: JSON.stringify(p.functionCall.args),
                },
              })),
          },
        },
      ],
    };
  },
};
