# Remaining Migration Work

## Current Status (After Commit 7fe09c6)

**Completed:** 12/52 files (23%)
**Remaining:** 40 files with Carbon imports

### Files Successfully Migrated ✅

**Core (2 files):**
- index.js
- RunPage.js

**Modals (5 files):**
- ConfirmModal.js
- WelcomeModal.js
- DiffModal.js
- TestFunctionModal.js
- KnowledgeSearchModal.js

**Shared Components (5 files):**
- EmptyState.js
- GlobalLoadingOverlay.js
- InstructionsEditor.js
- SpeechTextArea.js
- MarkdownContent.js

**Agent Components (1 file):**
- AgentCard.js

## Remaining Files (40 total)

### Pages (7 files) - Priority: High
Complex pages with DataTables, charts, and extensive UI:
1. **AgentsPage.js** - Agent cards listing
2. **SessionsPage.js** - Complex DataTable with pagination, search
3. **ToolsPage.js** - Tools management
4. **SettingsPage.js** - Settings management
5. **MCPPage.js** - MCP server configuration
6. **KnowledgePage.js** - Knowledge base management with file uploads
7. **ContextsPage.js** - Context/conversations management

### Form Component Sections (6 files) - Priority: High
Core application form components:
1. **FormComponent/FormComponent.js** - Main form wrapper
2. **FormComponent/TestPairsSection.js** - Test pairs management
3. **FormComponent/SettingsSection.js** - Form settings
4. **FormComponent/ActionsSection.js** - Form actions
5. **FormComponent/OutputSection.js** - Output display
6. **FormComponent/TestPairComponent.js** - Individual test pair

### Settings Component Sections (4 files) - Priority: High
1. **SettingsComponent/SettingsComponent.js** - Main settings wrapper
2. **SettingsComponent/GlobalSettingsSection.js** - Global settings
3. **SettingsComponent/EnvironmentVariablesSection.js** - Env vars management
4. **SettingsComponent/ProvidersSection.js** - Provider configuration

### Header Component (1 file) - Priority: Critical
1. **HeaderComponent/Header.js** - Main navigation header with side nav

### Context Providers (2 files) - Priority: Medium
1. **ToastContext.js** - Toast notification provider
2. **PromptContext.js** - Prompt state management

### Remaining Modals (12 files) - Priority: Medium
Complex modals with forms and interactions:
1. **AgentModal/AgentModal.js** (552 lines)
2. **ProviderModal/ProviderModal.js** (554 lines)
3. **ContextModal/ContextModal.js** (561 lines)
4. **SessionDetailsModal/SessionDetailsModal.js** (679 lines)
5. **TestSettingsModal/TestSettingsModal.js** (918 lines)
6. **ChatModal/ChatModal.js** (1066 lines)
7. **ChatModal/ChatInput.js** (209 lines)
8. **ChatModal/ChatMessage.js** (201 lines)
9. **ToolModal/ToolModal.js** (541 lines)
10. **CustomModelModal/CustomModelModal.js** (239 lines)
11. **MCPModal/MCPModal.js** (303 lines)
12. **UploadModal/UploadModal.js** (262 lines)

## Complexity Assessment

### Simple Files (15-25% of remaining time):
- Context providers (2 files)
- Simpler modals like CustomModelModal, UploadModal (2-3 files)

### Medium Complexity (35-45% of remaining time):
- Most modals (8-10 files)
- Form sections (6 files)
- Settings sections (4 files)

### High Complexity (30-40% of remaining time):
- Pages with DataTables (SessionsPage, AgentsPage)
- Header component with navigation
- ChatModal (1066 lines)
- TestSettingsModal (918 lines)
- SessionDetailsModal (679 lines)

## Estimated Effort

Based on the work completed so far:
- **12 files migrated** in approximately 2-3 hours
- **Average:** ~15-20 minutes per simple file, 30-60+ minutes per complex file
- **Remaining 40 files:** Estimated 20-30 hours of focused development work

### Breakdown:
- Simple files (10): 3-5 hours
- Medium files (15): 8-12 hours  
- Complex files (15): 9-13 hours

**Total estimate:** 20-30 hours remaining

## Migration Approach for Remaining Files

1. **Continue with simpler modals** - Build momentum
2. **Migrate form sections** - Break into smaller pieces
3. **Tackle pages one by one** - Start with simpler ones
4. **Complete complex modals** - TestSettingsModal, ChatModal last
5. **Finish with Header** - Critical but complex navigation

## Notes

- Build passes after each batch of migrations ✅
- Dark theme configured correctly ✅
- All shadcn/ui components available ✅
- Migration patterns well-documented in MIGRATION_GUIDE.md ✅
- No breaking changes to functionality ✅

The foundation is solid. The remaining work is systematic file-by-file migration following established patterns.
