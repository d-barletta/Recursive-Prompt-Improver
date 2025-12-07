# Migration Status: Carbon Design to shadcn/ui

## Executive Summary

This document tracks the progress of migrating from IBM Carbon Design System to shadcn/ui in the Recursive Prompt Improver application.

**Current Status:** Foundation Complete + 4 Components Migrated
**Remaining Work:** 48 files with Carbon components + 24 files with icons

## What's Been Completed ✅

### 1. Foundation Setup (100% Complete)

All infrastructure needed for shadcn/ui has been installed and configured:

- ✅ Tailwind CSS 3.x installed and configured
- ✅ All Radix UI primitives installed
- ✅ shadcn/ui utility dependencies (clsx, tailwind-merge, class-variance-authority, lucide-react)
- ✅ PostCSS configuration
- ✅ Tailwind dark theme configured (equivalent to Carbon g100)
- ✅ Path aliases configured (@/ for src/ directory)
- ✅ 13 core UI components created in `src/components/ui/`:
  - button.jsx
  - input.jsx
  - textarea.jsx
  - dialog.jsx (replaces Modal)
  - select.jsx (replaces Dropdown)
  - label.jsx
  - card.jsx (replaces Tile)
  - badge.jsx (replaces Tag)
  - tooltip.jsx
  - switch.jsx (replaces Toggle)
  - toast.jsx
  - dropdown-menu.jsx (replaces OverflowMenu)
  - spinner.jsx (replaces Loading/InlineLoading)
  - skeleton.jsx

### 2. Documentation & Tooling (100% Complete)

- ✅ **MIGRATION_GUIDE.md** - Comprehensive guide with:
  - Component mapping reference
  - Icon mapping reference
  - Migration patterns with before/after code examples
  - Styling guidelines
  - File-by-file checklist

- ✅ **migration-status.sh** - Automated script to track migration progress

### 3. Components Migrated (4 Complete)

| Component | Type | Status | Notes |
|-----------|------|--------|-------|
| index.js | Root | ✅ Complete | Removed Carbon Theme wrapper, added dark class |
| RunPage | Page | ✅ Complete | Button + icon migrated |
| ConfirmModal | Modal | ✅ Complete | Full Dialog implementation |
| GlobalLoadingOverlay | Shared | ✅ Complete | Spinner with overlay styling |
| EmptyState | Shared | ✅ Complete | Card with Tailwind styling |

### 4. Build System (100% Complete)

- ✅ Application builds successfully with new setup
- ✅ No build errors or warnings
- ✅ Tailwind CSS processing working correctly
- ✅ Both Carbon and shadcn/ui coexist during migration

## What Remains To Be Done

### Component Migration (48 files)

#### Pages (7 remaining)
- [ ] SettingsPage.js - Complex page with multiple sections
- [ ] SessionsPage.js - DataTable, charts, complex UI
- [ ] ContextsPage.js
- [ ] ToolsPage.js
- [ ] AgentsPage.js - Custom card layout
- [ ] MCPPage.js
- [ ] KnowledgePage.js - File upload, complex interactions

#### Core Components (12+ remaining)
- [ ] HeaderComponent/Header.js - Navigation, side nav, complex
- [ ] FormComponent/FormComponent.js - Main form, many Carbon components
- [ ] FormComponent/TestPairsSection.js
- [ ] FormComponent/SettingsSection.js
- [ ] FormComponent/TestPairComponent.js
- [ ] FormComponent/ActionsSection.js
- [ ] FormComponent/OutputSection.js
- [ ] SettingsComponent/SettingsComponent.js - Complex settings UI
- [ ] SettingsComponent/GlobalSettingsSection.js
- [ ] SettingsComponent/EnvironmentVariablesSection.js
- [ ] SettingsComponent/ProvidersSection.js
- [ ] AgentsComponent/AgentCard.js
- [ ] shared/InstructionsEditor.js
- [ ] shared/SpeechTextArea.js
- [ ] shared/MarkdownContent.js
- [ ] shared/AdvancedMultiselect/* - Custom multiselect
- [ ] shared/AdvancedSelect/* - Custom select

#### Modals (14 remaining)
- [ ] WelcomeModal/WelcomeModal.js
- [ ] DiffModal/DiffModal.js
- [ ] ChatModal/ChatModal.js - Complex chat interface
- [ ] ChatModal/ChatInput.js
- [ ] ChatModal/ChatMessage.js
- [ ] AgentModal/AgentModal.js
- [ ] SessionDetailsModal/SessionDetailsModal.js - Charts, tables
- [ ] ToolModal/ToolModal.js
- [ ] UploadModal/UploadModal.js - File upload
- [ ] CustomModelModal/CustomModelModal.js - Complex form
- [ ] KnowledgeSearchModal/KnowledgeSearchModal.js
- [ ] ProviderModal/ProviderModal.js - Complex provider config
- [ ] MCPModal/MCPModal.js
- [ ] TestSettingsModal/TestSettingsModal.js
- [ ] TestFunctionModal/TestFunctionModal.js
- [ ] ContextModal/ContextModal.js

### Icon Migration (24 files)

All Carbon icon imports need to be replaced with Lucide React equivalents. The mapping is documented in MIGRATION_GUIDE.md. Common replacements:

- Add → Plus
- TrashCan → Trash2
- RecentlyViewed → History
- MagicWandFilled → Wand2
- SearchLocateMirror → Search
- Warning/WarningFilled → AlertTriangle

### Styling Migration

#### SCSS Files Needing Updates

The following SCSS files still reference Carbon theme variables and need to be converted to Tailwind or have Carbon references removed:

- `_advanced-multiselect.scss` - Multiple `theme.$` references
- `_advanced-select.scss` - Multiple `theme.$` references
- `_agents.scss` - Multiple `theme.$` references
- `_chat.scss` - Likely has Carbon styling
- `_editors.scss` - Has `theme.$border-subtle`, `theme.$field` references
- `_knowledge.scss` - Likely has Carbon styling
- `_markdown.scss` - May need updates
- `_settings.scss` - Likely has Carbon styling
- `_modals.scss` - Modal-specific Carbon styling

These are currently commented out in index.scss to allow builds. They need to be:
1. Reviewed for necessary styling
2. Converted to Tailwind utilities where possible
3. Updated to use CSS variables instead of Carbon theme
4. Re-enabled in index.scss

## Migration Effort Estimate

Based on the complexity of the remaining files:

| Category | Files | Estimated Time | Complexity |
|----------|-------|----------------|------------|
| Simple Pages | 3 | 1-2 hours | Low-Medium |
| Complex Pages | 4 | 4-6 hours | High |
| Simple Components | 5 | 2-3 hours | Low-Medium |
| Complex Components | 10 | 8-12 hours | High |
| Simple Modals | 8 | 3-4 hours | Low-Medium |
| Complex Modals | 7 | 6-8 hours | High |
| Icon Migration | 24 files | 2-3 hours | Low |
| SCSS Migration | 9 files | 4-6 hours | Medium-High |
| Testing & Bug Fixes | - | 4-6 hours | Medium |
| **Total** | **60+ files** | **34-50 hours** | **Large** |

## How to Continue the Migration

### Step-by-Step Process

1. **Choose a file from the remaining list** (start with simpler ones)

2. **Open MIGRATION_GUIDE.md** and reference:
   - Component mapping table
   - Icon mapping table
   - Relevant code examples

3. **Migrate the file:**
   - Replace Carbon imports with shadcn/ui imports
   - Replace Carbon icons with Lucide icons
   - Convert Carbon props to shadcn/ui equivalents
   - Update className with Tailwind utilities where needed

4. **Test the changes:**
   ```bash
   npm run build
   npm run start:dev
   ```

5. **Run migration status check:**
   ```bash
   ./migration-status.sh
   ```

6. **Commit progress:**
   ```bash
   git add .
   git commit -m "Migrate [ComponentName] to shadcn/ui"
   git push
   ```

### Recommended Order

1. **Start with simple shared components** (already done: EmptyState, GlobalLoadingOverlay)
2. **Migrate simple modals** (already done: ConfirmModal)
3. **Migrate simple pages**
4. **Tackle complex components one at a time:**
   - HeaderComponent (critical for navigation)
   - FormComponent sections (break into smaller pieces)
   - SettingsComponent sections (break into smaller pieces)
5. **Migrate complex modals with form logic**
6. **Handle DataTable-based pages** (may need custom table component)
7. **Update SCSS files**
8. **Final testing and cleanup**

### Testing Strategy

After each migration:
1. Build succeeds
2. Component renders without errors
3. All interactions work (buttons, forms, etc.)
4. Styling looks correct in dark theme
5. No console errors or warnings

## Additional Components Needed

Some complex Carbon components may require additional shadcn/ui components:

### Potentially Needed:
- **Table** component (for DataTable replacement) - Not currently installed
- **Popover** component (for complex dropdowns) - Installed
- **Command** component (for ComboBox) - Not currently installed
- **Separator** component - Not currently installed
- **ScrollArea** component (for long lists) - Installed
- **Sheet** component (for side panels) - Not currently installed
- **Accordion** component - Installed
- **Tabs** component - Installed

These can be added from shadcn/ui as needed.

## Notes & Considerations

### Things That Work Well
- Build system handles both Carbon and shadcn/ui simultaneously
- Dark theme configured correctly
- Tailwind utilities integrate smoothly
- Icon sizes are consistent

### Known Challenges
1. **DataTable** - Carbon's DataTable is complex; may need custom implementation
2. **Header/Navigation** - Complex structure, needs careful migration
3. **Advanced Select/Multiselect** - Custom components, need thoughtful replacement
4. **SCSS theme variables** - Need systematic conversion to Tailwind

### Breaking Changes to Watch For
- Modal `onRequestClose` → `onOpenChange`
- Button `renderIcon` → inline icon with className
- Toggle `onToggle` → `onCheckedChange`
- Grid system → Tailwind grid utilities
- Select/Dropdown API differences

## Support & Resources

- **Migration Guide:** MIGRATION_GUIDE.md
- **Migration Status Script:** `./migration-status.sh`
- **shadcn/ui Docs:** https://ui.shadcn.com/docs
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **Lucide Icons:** https://lucide.dev/icons
- **Radix UI Docs:** https://www.radix-ui.com/primitives/docs/overview/introduction

## Success Criteria

The migration is complete when:
1. ✅ All 60+ files have no Carbon imports
2. ✅ Build succeeds with no warnings
3. ✅ All pages render and function correctly
4. ✅ All modals open and work as expected
5. ✅ Dark theme looks correct throughout
6. ✅ Electron build works
7. ✅ No Carbon dependencies remain in package.json
8. ✅ SCSS files use only Tailwind/CSS variables

---

*Last Updated: After completing 4 component migrations*
*Files Remaining: 48 with Carbon React + 24 with Carbon Icons*
