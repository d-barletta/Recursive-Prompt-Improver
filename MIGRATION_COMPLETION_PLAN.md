# Carbon to shadcn/ui Migration - Completion Plan

## Current Status: 33/52 files (63% complete)

### ✅ Completed (33 files)

**Core & Infrastructure:**
- index.js
- RunPage

**Context Providers (2):**
- ToastContext
- PromptContext

**Form Components (6):**
- FormComponent
- TestPairComponent
- ActionsSection
- SettingsSection
- TestPairsSection
- OutputSection

**Settings Components (4):**
- SettingsComponent
- GlobalSettingsSection
- EnvironmentVariablesSection
- ProvidersSection

**Modals (7):**
- ConfirmModal
- WelcomeModal
- DiffModal
- TestFunctionModal
- KnowledgeSearchModal
- CustomModelModal
- MCPModal

**Chat Components (2):**
- ChatMessage
- ChatInput

**Shared Components (5):**
- EmptyState
- GlobalLoadingOverlay
- InstructionsEditor
- SpeechTextArea
- MarkdownContent

**Header (1):**
- Header (with responsive Sheet navigation)

**Pages (4):**
- AgentsPage
- ToolsPage
- ContextsPage
- SessionsPage

**Other (1):**
- AgentCard

### 📋 Remaining (19 files)

**Pages (3):**
1. SettingsPage (447 lines) - Complex settings page with multiple sections
2. MCPPage (822 lines) - Model Context Protocol server management with DataTable
3. KnowledgePage (878 lines) - Most complex page - Knowledge base management with embeddings

**Modals (8):**
1. AgentModal - Agent configuration modal
2. ChatModal - Main chat interface modal
3. ToolModal - Tool creation/editing modal
4. UploadModal - File upload modal
5. ProviderModal - Provider configuration modal
6. SessionDetailsModal - Session details viewer
7. TestSettingsModal - Test settings configuration
8. ContextModal - Context/conversation modal

**Shared Components (8):**
1. AdvancedMultiselect/AdvancedMultiselect.js
2. AdvancedMultiselect/AdvancedMultiselectModal.js
3. AdvancedMultiselect/AdvancedMultiselectTable.js
4. AdvancedSelect/AdvancedSelect.js
5. AdvancedSelect/AdvancedSelectModal.js
6. AdvancedSelect/AdvancedSelectTable.js
7. CapabilityTags/CapabilityTags.js
8. CategoryDropdown/CategoryDropdown.js

## Migration Patterns Established

All remaining files follow established patterns:

### Modal Pattern
```jsx
// Carbon
import { Modal, TextInput, TextArea, Button } from "@carbon/react";

<Modal
  open={isOpen}
  modalHeading="Title"
  primaryButtonText="Save"
  secondaryButtonText="Cancel"
  onRequestSubmit={handleSave}
  onRequestClose={onClose}
>
  <TextInput labelText="Name" />
</Modal>

// shadcn/ui
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table Pattern
```jsx
// Carbon DataTable → shadcn/ui Table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Column 1</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.value}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Select/Dropdown Pattern
```jsx
// Carbon Select → shadcn/ui Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Icon Pattern
```jsx
// Carbon Icons → Lucide
import { Add, TrashCan, Edit } from "@carbon/icons-react";
// becomes
import { Plus, Trash2, Edit } from "lucide-react";
```

## Effort Estimate for Remaining Work

### By Complexity:

**Simple Components (6-8 hours):**
- CategoryDropdown (50 lines)
- CapabilityTags (80 lines)
- UploadModal (120 lines)
- ContextModal (150 lines)

**Medium Components (8-12 hours):**
- SettingsPage (447 lines)
- TestSettingsModal (200 lines)
- SessionDetailsModal (250 lines)
- ToolModal (300 lines)
- AgentModal (350 lines)
- ChatModal (400 lines)
- ProviderModal (500 lines)

**Complex Components (12-16 hours):**
- AdvancedSelect (3 files, 400+ combined lines)
- AdvancedMultiselect (3 files, 500+ combined lines)
- MCPPage (822 lines - complex DataTable with server management)
- KnowledgePage (878 lines - most complex: DataTable, embeddings, vector search)

**Total Estimated Effort:** 26-36 hours for remaining 19 files

## Priority Order for Completion

### Phase 1: Simple Shared Components (2-3 hours)
1. CategoryDropdown
2. CapabilityTags

### Phase 2: Medium Modals (6-8 hours)
3. UploadModal
4. ContextModal
5. TestSettingsModal
6. SessionDetailsModal

### Phase 3: Complex Modals (8-10 hours)
7. ToolModal
8. AgentModal
9. ChatModal
10. ProviderModal

### Phase 4: SettingsPage (4-5 hours)
11. SettingsPage (requires testing with all other components)

### Phase 5: Complex Select Components (8-10 hours)
12. AdvancedSelect (3 files)
13. AdvancedMultiselect (3 files)

### Phase 6: Final Complex Pages (8-10 hours)
14. MCPPage (DataTable + server management)
15. KnowledgePage (Most complex - DataTable + embeddings + vector search)

## Build & Test Strategy

After each phase:
1. Run `npm run build` to check for compilation errors
2. Test affected pages/components manually
3. Commit progress with `report_progress`
4. Verify no regressions in completed components

## Success Criteria

- ✅ All 52 files migrated from Carbon to shadcn/ui
- ✅ Build passes without errors
- ✅ All functionality preserved
- ✅ Dark theme consistent across application
- ✅ No Carbon Design System dependencies remaining
- ✅ Documentation updated

## Notes

- Carbon and shadcn/ui coexist during migration
- No breaking changes to functionality
- All migration patterns documented in MIGRATION_GUIDE.md
- Build tested after each major component migration
