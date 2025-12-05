export const MAX_NUM_TESTS = 10;

/*************** CHECK TYPES **************/

export const CHECK_TYPES = {
  EQUALITY: {
    id: "equality",
    label: "Equality check (required)",
    disabled: true,
  },
  TOOLS_CALL: {
    id: "tools_call",
    label: "Tools call (available tools)",
    mutuallyExclusiveWith: ["json_valid"],
  },
  JSON_VALID: {
    id: "json_valid",
    label: "JSON valid",
    mutuallyExclusiveWith: ["tools_call"],
  },
};

export const CHECK_TYPE_ITEMS = [
  CHECK_TYPES.EQUALITY,
  CHECK_TYPES.TOOLS_CALL,
  CHECK_TYPES.JSON_VALID,
];

export const DEFAULT_CHECK_TYPES = [CHECK_TYPES.EQUALITY.id];

/*************** API PROVIDERS **************/

export const API_PROVIDERS = [
  { id: "ollama", text: "Ollama" },
  { id: "lmstudio", text: "LM Studio" },
  { id: "chatgpt", text: "OpenAI" },
  { id: "anthropic", text: "Anthropic" },
  { id: "gemini", text: "Gemini" },
  { id: "huggingface", text: "HuggingFace" },
  { id: "watsonx", text: "WatsonX" },
  { id: "azure", text: "Azure" },
  { id: "openaicompat", text: "OpenAI Compatible" },
  { id: "groq", text: "Groq" },
  { id: "grok", text: "Grok (xAI)" },
  { id: "perplexity", text: "Perplexity" },
  { id: "mistral", text: "Mistral" },
];

export const DEFAULT_PROVIDER = API_PROVIDERS[0]; // WatsonX

/*************** WATSONX URLS BY REGION **************/

export const WATSONX_URLS = [
  {
    id: "us-south",
    text: "Dallas (us-south)",
    url: "https://us-south.ml.cloud.ibm.com",
  },
  {
    id: "eu-de",
    text: "Frankfurt (eu-de)",
    url: "https://eu-de.ml.cloud.ibm.com",
  },
  {
    id: "eu-gb",
    text: "London (eu-gb)",
    url: "https://eu-gb.ml.cloud.ibm.com",
  },
  {
    id: "jp-tok",
    text: "Tokyo (jp-tok)",
    url: "https://jp-tok.ml.cloud.ibm.com",
  },
];

export const DEFAULT_WATSONX_URL = WATSONX_URLS[0]; // Dallas

/*************** LOCAL STORAGE KEYS **************/

export const STORAGE_KEYS = {
  // Multi-provider keys
  PROVIDERS: "providers",
  DEFAULT_PROVIDER_ID: "defaultProviderId",
  // Global settings keys
  MAX_TOKENS: "max_tokens",
  TIME_LIMIT: "time_limit",
  TEMPERATURE: "temperature",
  MAX_TOOL_ITERATIONS: "max_tool_iterations",
  ACCESS_TOKEN: "myAccessToken",
  // Data keys
  FORM_DATA: "formData",
  SESSIONS: "sessions",
  OUTPUT_LOGS: "outputLogs",
  CONTEXTS: "contexts",
  TOOLS: "tools",
  AGENTS: "agents",
  MCP_SERVERS: "mcpServers",
  MCP_SERVER_CONFIG: "mcpServerConfig",
  KNOWLEDGE_BASES: "knowledgeBases",
  // Prompt improvement history
  PREVIOUS_INSTRUCTIONS: "previousInstructions",
  IMPROVED_INSTRUCTIONS: "improvedInstructions",
  // Environment variables
  ENVIRONMENT_VARIABLES: "environmentVariables",
  // UI state
  HAS_SEEN_WELCOME: "hasSeenWelcome",
};

/*************** MODEL ITEMS BY PROVIDER **************/
// Model metadata: contextLength (max tokens), supportsTools, supportsVision, supportsJsonOutput

export const WATSONX_MODELS = [
  {
    id: "ibm/granite-4-h-small",
    text: "Granite 4 H-Small",
    contextLength: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "ibm/granite-3-3-8b-instruct",
    text: "Granite 3.3 8B",
    contextLength: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "ibm/granite-3-8b-instruct",
    text: "Granite 3 8B",
    contextLength: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "meta-llama/llama-3-3-70b-instruct",
    text: "Llama 3.3 70B",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
    text: "Llama 4 Maverick 17B",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "mistralai/mistral-medium-2505",
    text: "Mistral Medium 3 2505",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "openai/gpt-oss-120b",
    text: "GPT OSS 120B",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

export const CHATGPT_MODELS = [
  {
    id: "gpt-4o",
    text: "GPT-4o",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-4o-mini",
    text: "GPT-4o Mini",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-4-turbo",
    text: "GPT-4 Turbo",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-3.5-turbo",
    text: "GPT-3.5 Turbo",
    contextLength: 16385,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

export const ANTHROPIC_MODELS = [
  {
    id: "claude-sonnet-4-5",
    text: "Claude Sonnet 4.5",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "claude-haiku-4-5",
    text: "Claude Haiku 4.5",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "claude-opus-4-1",
    text: "Claude Opus 4.1",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    text: "Claude 3.5 Sonnet (Legacy)",
    contextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
];

export const GEMINI_MODELS = [
  {
    id: "gemini-2.5-pro",
    text: "Gemini 2.5 Pro",
    contextLength: 1048576,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gemini-2.5-flash",
    text: "Gemini 2.5 Flash",
    contextLength: 1048576,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    text: "Gemini 2.5 Flash Lite",
    contextLength: 1048576,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
];

export const GROQ_MODELS = [
  {
    id: "llama-3.3-70b-versatile",
    text: "Llama 3.3 70B Versatile",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "llama-3.1-8b-instant",
    text: "Llama 3.1 8B Instant",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "mixtral-8x7b-32768",
    text: "Mixtral 8x7B-32K",
    contextLength: 32768,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

export const HUGGINGFACE_MODELS = [
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    text: "Llama 3.3 70B Instruct",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "meta-llama/Llama-3.2-3B-Instruct",
    text: "Llama 3.2 3B Instruct",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "mistralai/Mistral-7B-Instruct-v0.3",
    text: "Mistral 7B Instruct v0.3",
    contextLength: 32768,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "microsoft/Phi-3-mini-4k-instruct",
    text: "Phi 3 Mini 4K Instruct",
    contextLength: 4096,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    text: "Qwen 2.5 72B Instruct",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

export const MISTRAL_MODELS = [
  {
    id: "mistral-large-latest",
    text: "Mistral Large",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "mistral-medium-latest",
    text: "Mistral Medium",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "mistral-small-latest",
    text: "Mistral Small",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "codestral-latest",
    text: "Codestral",
    contextLength: 256000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "open-mistral-nemo",
    text: "Mistral Nemo",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

export const OLLAMA_MODELS = [
  {
    id: "llama3.2",
    text: "Llama 3",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "mistral",
    text: "Mistral",
    contextLength: 32768,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "llama2",
    text: "Llama 2",
    contextLength: 4096,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "codellama",
    text: "Code Llama",
    contextLength: 16384,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "mixtral",
    text: "Mixtral",
    contextLength: 32768,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "phi",
    text: "Phi-2",
    contextLength: 2048,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

// Azure OpenAI models - these represent common deployment names
// Actual deployment names are configured in Azure Portal
export const AZURE_MODELS = [
  {
    id: "gpt-4o",
    text: "GPT-4o",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-4o-mini",
    text: "GPT-4o Mini",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-4-turbo",
    text: "GPT-4 Turbo",
    contextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-4",
    text: "GPT-4",
    contextLength: 8192,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "gpt-35-turbo",
    text: "GPT-3.5 Turbo",
    contextLength: 16385,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

// LM Studio doesn't have default models - they must be fetched from the local server
export const LMSTUDIO_MODELS = [];

// Perplexity models (predefined since there's no models API)
export const PERPLEXITY_MODELS = [
  {
    id: "sonar-pro",
    text: "Sonar Pro",
    contextLength: 200000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "sonar",
    text: "Sonar",
    contextLength: 128000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "sonar-reasoning-pro",
    text: "Sonar Reasoning Pro",
    contextLength: 128000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "sonar-reasoning",
    text: "Sonar Reasoning",
    contextLength: 128000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "sonar-deep-research",
    text: "Sonar Deep Research",
    contextLength: 128000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "r1-1776",
    text: "R1-1776",
    contextLength: 128000,
    supportsTools: false,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

// Grok (xAI) models
export const GROK_MODELS = [
  {
    id: "grok-3",
    text: "Grok 3",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "grok-3-fast",
    text: "Grok 3 Fast",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "grok-3-mini",
    text: "Grok 3 Mini",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "grok-3-mini-fast",
    text: "Grok 3 Mini Fast",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "grok-2-1212",
    text: "Grok 2 (1212)",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
  {
    id: "grok-2-vision-1212",
    text: "Grok 2 Vision (1212)",
    contextLength: 32768,
    supportsTools: true,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "grok-vision-beta",
    text: "Grok Vision Beta",
    contextLength: 8192,
    supportsTools: false,
    supportsVision: true,
    supportsJsonOutput: true,
  },
  {
    id: "grok-beta",
    text: "Grok Beta",
    contextLength: 131072,
    supportsTools: true,
    supportsVision: false,
    supportsJsonOutput: true,
  },
];

// OpenAI Compatible providers don't have default models - they must be fetched from the endpoint
export const OPENAI_COMPAT_MODELS = [];

// Default to WatsonX models for backward compatibility
export const MODEL_ITEMS = [];

/*************** EMBEDDING MODEL ITEMS BY PROVIDER **************/

export const WATSONX_EMBEDDINGS = [
  {
    id: "intfloat/multilingual-e5-large",
    text: "Multilingual E5 Large - Microsoft",
  },
  {
    id: "ibm/granite-embedding-278m-multilingual",
    text: "Granite Embedding 278M Multilingual",
  },
  { id: "ibm/slate-30m-english-rtrvr", text: "Slate 30M English" },
  { id: "ibm/slate-30m-english-rtrvr-v2", text: "Slate 30M English v2" },
  { id: "ibm/slate-125m-english-rtrvr", text: "Slate 125M English" },
  { id: "ibm/slate-125m-english-rtrvr-v2", text: "Slate 125M English v2" },
  { id: "sentence-transformers/all-minilm-l6-v2", text: "All MiniLM L6 v2" },
];

export const OLLAMA_EMBEDDINGS = [{ id: "nomic-embed-text", text: "Nomic Embed Text" }];

// LM Studio embeddings must be fetched from the local server
export const LMSTUDIO_EMBEDDINGS = [];

// Perplexity doesn't support embeddings
export const PERPLEXITY_EMBEDDINGS = [];

export const OPENAI_EMBEDDINGS = [
  { id: "text-embedding-3-large", text: "Text Embedding 3 Large" },
  { id: "text-embedding-3-small", text: "Text Embedding 3 Small" },
];

export const HUGGINGFACE_EMBEDDINGS = [
  { id: "sentence-transformers/all-MiniLM-L6-v2", text: "All MiniLM L6 v2" },
  { id: "BAAI/bge-small-en-v1.5", text: "BGE Small EN v1.5" },
  { id: "intfloat/e5-small-v2", text: "E5 Small v2" },
];

export const MISTRAL_EMBEDDINGS = [{ id: "mistral-embed", text: "Mistral Embed" }];

// Azure OpenAI embeddings - these represent common deployment names
export const AZURE_EMBEDDINGS = [
  { id: "text-embedding-3-large", text: "Text Embedding 3 Large" },
  { id: "text-embedding-3-small", text: "Text Embedding 3 Small" },
  { id: "text-embedding-ada-002", text: "Text Embedding Ada 002" },
];

// OpenAI Compatible providers don't have default embeddings - they must be fetched from the endpoint
export const OPENAI_COMPAT_EMBEDDINGS = [];

export const EMBEDDING_MODEL_ITEMS = WATSONX_EMBEDDINGS;

/*************** DEFAULT VALUES **************/

export const DEFAULT_VALUES = {
  MAX_TOKENS: 4000,
  TIME_LIMIT: 60000,
  TEMPERATURE: 0,
  MAX_TOOL_ITERATIONS: 5,
  DEFAULT_PROVIDER: API_PROVIDERS[0], // WatsonX
  DEFAULT_MODEL: WATSONX_MODELS[0],
  DEFAULT_EMBEDDING_MODEL: WATSONX_EMBEDDINGS[0],
  DEFAULT_WATSONX_URL: WATSONX_URLS[0], // Dallas
  DEFAULT_OLLAMA_URL: "http://localhost:11434",
  DEFAULT_LMSTUDIO_URL: "http://localhost:1234/v1",
  DEFAULT_OPENAI_COMPAT_URL: "http://localhost:8080/v1",
  DEFAULT_AZURE_API_VERSION: "2024-10-21",
};

/*************** API ENDPOINTS wx **************/

export const API_VERSION = "2023-10-25";
export const API_ENDPOINTS = {
  // CHAT and EMBEDDINGS endpoints are now dynamically constructed in STORAGE.js
  // based on the selected watsonx region URL
  ACCESS_TOKEN: "https://iam.cloud.ibm.com/identity/token",
};

/*************** VALIDATION CONSTANTS **************/

export const VALIDATION = {
  MAX_TOKENS: {
    MIN: 1,
    MAX: 240000,
    STEP: 1000,
  },
  TIME_LIMIT: {
    MIN: 1000,
    MAX: 180000,
    STEP: 1000,
  },
  MAX_TOOL_ITERATIONS: {
    MIN: 1,
    MAX: 50,
    STEP: 1,
  },
};

/*************** ROLE CONSTANTS **************/

export const ROLES = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
  TOOL: "tool",
  CONTROL: "control",
};
