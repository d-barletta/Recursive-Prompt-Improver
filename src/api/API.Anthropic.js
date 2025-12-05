/*************** Anthropic Claude API **************/

import { ROLES, ANTHROPIC_MODELS } from "@utils/constants";

export const AI_API = {
  getDefaultHeaders: function (providerParams, useStructuredOutputs = false) {
    const apiKey = providerParams.apiKey;
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    };
    // Add beta header for structured outputs (JSON schema support)
    if (useStructuredOutputs) {
      headers["anthropic-beta"] = "structured-outputs-2025-11-13";
    }
    return {
      method: "POST",
      headers: headers,
    };
  },
  fetchAvailableModels: async function (apiKey) {
    // Anthropic doesn't have a public models API endpoint
    // Return hardcoded list of known models
    return ANTHROPIC_MODELS;
  },
  fetchAvailableEmbeddings: async function (apiKey) {
    // Anthropic doesn't support embeddings
    return [];
  },
  generateAccessToken: async function () {
    // Anthropic uses API key directly, no token generation needed
    return Promise.resolve({ access_token: "not-needed" });
  },
  embeddingsGet: async function (inputs, modelId, abortSignal, providerParams) {
    throw new Error("Embeddings API not available with Anthropic Claude");
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

    // Helper function to build content array with images for Anthropic
    const buildContentWithImages = (text, images) => {
      if (!images || images.length === 0) {
        return text || "";
      }
      // Build content array with text and images
      const contentParts = [];
      // Add images first (Anthropic recommends images before text)
      images.forEach((img) => {
        // Extract base64 data and media type from dataUrl (format: data:image/jpeg;base64,...)
        const dataUrl = img.dataUrl || img.url;
        if (!dataUrl) return; // Skip if no valid dataUrl
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mediaType = match[1];
          const base64Data = match[2];
          contentParts.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          });
        }
      });
      if (text) {
        contentParts.push({ type: "text", text: text });
      }
      return contentParts;
    };

    // Build messages array with Anthropic roles
    const messages = [];

    // Add context messages if present
    if (context?.length) {
      context.forEach((c) => {
        // Handle tool result messages (role: "user" with tool_result content)
        if (c?.role === ROLES.TOOL && c?.toolId) {
          messages.push({
            role: ROLES.USER,
            content: [
              {
                type: "tool_result",
                tool_use_id: c.toolId,
                content: c?.message || "",
              },
            ],
          });
        }
        // Handle assistant messages with tool_calls
        else if (c?.role === ROLES.ASSISTANT && c?.toolCalls?.length > 0) {
          messages.push({
            role: ROLES.ASSISTANT,
            content: [
              ...(c?.message ? [{ type: "text", text: c.message }] : []),
              ...c.toolCalls.map((tc) => {
                const args =
                  typeof tc.function?.arguments === "string"
                    ? JSON.parse(tc.function.arguments)
                    : tc.function?.arguments || {};
                return {
                  type: "tool_use",
                  id: tc.id,
                  name: tc.function?.name,
                  input: args,
                };
              }),
            ],
          });
        }
        // Handle regular user/assistant messages (with potential images)
        else {
          messages.push({
            role: c?.role === ROLES.ASSISTANT ? ROLES.ASSISTANT : ROLES.USER,
            content: buildContentWithImages(c?.message || "", c?.images),
          });
        }
      });
    }

    // Only add user message if prompt is not empty
    // This allows tool messages to be the last message in context
    if (prompt) {
      messages.push({
        role: ROLES.USER,
        content: buildContentWithImages(prompt, images),
      });
    }

    const requestBody = {
      model: modelId,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: messages,
      system: systemPrompt, // Anthropic requires system prompt separately
    };

    // Determine if we need structured outputs header
    const useStructuredOutputs = !!jsonSchema;

    // Handle JSON schema structured output (Anthropic beta feature)
    if (jsonSchema) {
      requestBody.output_format = {
        type: "json_schema",
        schema: jsonSchema,
      };
    }

    // Handle tools if provided (Anthropic API specification)
    if (tools && tools.length > 0) {
      requestBody.tools = tools.map((tool) => {
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
          name: tool.name,
          description: tool.description || "",
          input_schema: {
            type: "object",
            properties: parametersSchema.properties || {},
            required: parametersSchema.required || [],
          },
        };
      });
    }

    // Enable streaming if onChunk callback is provided
    if (onChunk) {
      requestBody.stream = true;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        ...this.getDefaultHeaders(providerParams, useStructuredOutputs),
        signal,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
      }

      // Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullContent = "";
      let toolUseBlocks = [];
      let stopReason = null;

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

              // Handle different event types
              if (data.type === "content_block_delta") {
                if (data.delta?.type === "text_delta") {
                  const text = data.delta.text;
                  fullContent += text;
                  onChunk(text);
                } else if (data.delta?.type === "input_json_delta") {
                  // Tool input is being streamed, accumulate it
                  const index = data.index;
                  if (!toolUseBlocks[index]) {
                    toolUseBlocks[index] = { partial_json: "" };
                  }
                  toolUseBlocks[index].partial_json += data.delta.partial_json;
                }
              } else if (data.type === "content_block_start") {
                if (data.content_block?.type === "tool_use") {
                  const index = data.index;
                  toolUseBlocks[index] = {
                    id: data.content_block.id,
                    name: data.content_block.name,
                    partial_json: "",
                  };
                }
              } else if (data.type === "message_delta" && data.delta?.stop_reason) {
                // Capture stop_reason from message_delta event
                // Anthropic uses "max_tokens" as stop_reason when output is truncated
                stopReason = data.delta.stop_reason;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE chunk:", parseError);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Convert tool use blocks to standard format
      const toolCalls = toolUseBlocks
        .filter((block) => block && block.id)
        .map((block) => ({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: block.partial_json,
          },
        }));

      // Map Anthropic stop_reason to OpenAI-compatible finish_reason
      // Anthropic uses "max_tokens", OpenAI uses "length"
      const finishReason = stopReason === "max_tokens" ? "length" : stopReason;

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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      ...this.getDefaultHeaders(providerParams, useStructuredOutputs),
      signal,
      body: JSON.stringify(requestBody),
    });

    const json = await response.json();
    if (json.error) {
      throw new Error(`Anthropic error (model: ${modelId}): ${json.error.message}`);
    }

    // Transform Anthropic response to match WatsonX format
    return {
      choices: [
        {
          message: {
            content: json.content.find((c) => c.type === "text")?.text || "",
            tool_calls: json.content
              .filter((c) => c.type === "tool_use")
              .map((c) => ({
                id: c.id,
                type: "function",
                function: {
                  name: c.name,
                  arguments: JSON.stringify(c.input),
                },
              })),
          },
        },
      ],
    };
  },
};
