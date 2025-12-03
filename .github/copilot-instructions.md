# Copilot Instructions for RPI (Recursive Prompt Improver)

## Architecture Overview

RPI is a React 19 + Electron desktop/web application for testing and improving LLM prompts. Key architectural decisions:

- **Dual runtime**: Runs as Electron desktop app (`electron/main.js`) or browser-based web app
- **Multi-provider LLM abstraction**: `src/core/API.js` bridges to 13+ provider implementations in `src/api/API.*.js`
- **Local-first storage**: Uses `IndexedDB` (Electron) or `localStorage` (web) via adapter pattern in `src/utils/storageUtils.js`
- **React Context for state**: Six contexts (`Settings`, `Toast`, `Confirm`, `Prompt`, `Loading`, `Knowledge`) manage global state
- **Carbon Design System**: UI built entirely with `@carbon/react` components, theme `g100` (dark)

## Path Aliases

Always use these import aliases (configured in `jsconfig.json` and `config/webpack.config.js`):

```javascript
import { AI_API } from "@core/API"; // src/core/
import { STORAGE_KEYS } from "@utils/constants"; // src/utils/
import FormComponent from "@components/FormComponent"; // src/components/
import { useSettings } from "@context/SettingsContext"; // src/context/
import RunPage from "@pages/RunPage"; // src/pages/
import { useModalState } from "@hooks"; // src/hooks/
```

## Core Module Responsibilities

| Module                | Purpose                                               |
| --------------------- | ----------------------------------------------------- |
| `src/core/MAIN.js`    | Core prompt testing/improvement loop logic            |
| `src/core/API.js`     | Provider-agnostic LLM API bridge                      |
| `src/core/MCP.js`     | Model Context Protocol client (external tool servers) |
| `src/core/RAG.js`     | Document chunking, embeddings, vector search          |
| `src/core/STORAGE.js` | Settings retrieval wrapper over storageUtils          |
| `src/core/PROMPTS.js` | System prompts for improvement/feedback generation    |

## Adding a New LLM Provider

1. Create `src/api/API.{ProviderName}.js` exporting `AI_API` object with:
   - `fetchAvailableModels(apiKey)` - returns model list
   - `fetchAvailableEmbeddings(apiKey)` - returns embedding models
   - `generateAccessToken(providerConfig)` - OAuth flow if needed
   - `oneShotPrompt(systemPrompt, prompt, modelId, options)` - main chat completion
   - `embeddingsGet(inputs, modelId, abortSignal, providerParams)` - embeddings

2. Register in `src/core/API.js` `getProviderAPIById()` switch statement

3. Add provider config to `src/utils/constants.js`:
   - Add to `API_PROVIDERS` array
   - Add model constants (e.g., `ANTHROPIC_MODELS`)

## Component Patterns

### Form Components

Split complex forms into sub-files (see `src/components/FormComponent/`):

- `FormComponent.js` - main component
- `FormComponent.hooks.js` - custom hooks
- `FormComponent.utils.js` - helper functions
- Section components: `TestPairsSection.js`, `SettingsSection.js`, etc.

### Custom Hooks

Export all hooks through `src/hooks/index.js` barrel file. Common hooks:

- `useModalState` - modal open/close with data
- `useNavigationPrompt` - unsaved changes warning
- `useImportExport` - JSON import/export pattern
- `usePagination` - table pagination logic

## Styling

- Use SCSS modules in `src/style/` with BEM-like naming
- Import order in `src/index.scss` matters: Carbon first, then base → utilities → components
- Carbon spacing tokens: `$spacing-03`, `$spacing-05`, etc.
- Theme variables available: `$text-primary`, `$layer-01`, `$border-subtle`

## Development Commands

```bash
npm ci                    # Install dependencies (use ci, not install)
npm run start:dev         # Start Electron + React dev servers
npm run lint:fix          # ESLint with auto-fix
npm run format            # Prettier formatting
npm run build:executable:mac  # Build macOS DMG
```

## Storage Keys Pattern

All localStorage/IndexedDB keys defined in `STORAGE_KEYS` constant (`src/utils/constants.js`). Never use raw strings:

```javascript
// ✓ Correct
await getStorageItem(STORAGE_KEYS.PROVIDERS);
// ✗ Wrong
await getStorageItem("providers");
```

## Tool Execution

Tools (custom JS functions) run in sandboxed environment via `src/utils/sandboxUtils.js`. MCP tools execute through `src/core/MCP.js`. Both types unified in `src/utils/toolUtils.js` `executeTool()`.

## Testing Prompts Flow

`CORE.run()` in `src/core/MAIN.js` orchestrates:

1. Run tests against current instructions
2. If improve mode: generate feedback → improve prompt → re-test (loop N iterations)
3. Results stored in sessions (`STORAGE_KEYS.SESSIONS`)
