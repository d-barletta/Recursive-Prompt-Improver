# Carbon Design to shadcn/ui Migration Guide

This guide provides patterns and examples for migrating from IBM Carbon Design System to shadcn/ui.

## Overview

The migration involves:
1. Replacing Carbon components with shadcn/ui equivalents
2. Replacing Carbon icons with Lucide React icons
3. Converting Carbon SCSS theming to Tailwind utility classes
4. Maintaining all existing functionality

## Setup Complete ✅

- Tailwind CSS installed and configured
- All core shadcn/ui components created in `src/components/ui/`
- Dark theme configured (equivalent to Carbon g100)
- Path aliases configured (@/ for src/)

## Component Mapping Reference

| Carbon Component | shadcn/ui Equivalent | Import Path |
|-----------------|---------------------|-------------|
| Button | Button | @/components/ui/button |
| TextInput | Input | @/components/ui/input |
| TextArea | Textarea | @/components/ui/textarea |
| Modal, ComposedModal | Dialog | @/components/ui/dialog |
| Dropdown | Select | @/components/ui/select |
| Toggle | Switch | @/components/ui/switch |
| Tag | Badge | @/components/ui/badge |
| Tile | Card | @/components/ui/card |
| Loading | LoadingSpinner | @/components/ui/spinner |
| InlineLoading | LoadingSpinner | @/components/ui/spinner |
| TextAreaSkeleton | Skeleton | @/components/ui/skeleton |
| ToastNotification | Toast (via Radix) | @/components/ui/toast |
| Tooltip | Tooltip | @/components/ui/tooltip |
| OverflowMenu | DropdownMenu | @/components/ui/dropdown-menu |
| Form | form (native) | N/A (use native or react-hook-form) |
| Grid, Column | div with Tailwind | Use Tailwind grid/flex utilities |
| FormGroup | div | Use semantic HTML with Tailwind |
| IconButton | Button with variant="ghost" size="icon" | @/components/ui/button |

## Icon Mapping Reference

| Carbon Icon | Lucide Icon |
|------------|------------|
| Add | Plus |
| ArrowDown | ArrowDown |
| ArrowUp | ArrowUp |
| Bot | Bot |
| Chat | MessageSquare |
| Checkmark | Check |
| ChevronDown | ChevronDown |
| ChevronRight | ChevronRight |
| ChevronUp | ChevronUp |
| Close | X |
| Connect | Link |
| Copy | Copy |
| Cut | Scissors |
| DataStructured | Database |
| Document | File |
| DocumentBlank | FileText |
| DocumentPdf | FileType |
| Download | Download |
| Edit | Edit |
| Image | Image |
| Json | FileJson |
| MagicWandFilled | Wand2 |
| Menu | Menu |
| Microphone | Mic |
| MicrophoneFilled | Mic |
| Play | Play |
| RecentlyViewed | History |
| Renew | RotateCw |
| Restart | RefreshCw |
| Search | Search |
| SearchLocateMirror | Search |
| Send | Send |
| TextLongParagraph | AlignLeft |
| Tools | Wrench |
| TrashCan | Trash2 |
| Upload | Upload |
| View | Eye |
| Warning | AlertTriangle |
| WarningFilled | AlertTriangle |
| NetworkPublic | Globe |
| Wifi | Wifi |

## Migration Patterns

### Button Migration

**Before (Carbon):**
```jsx
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";

<Button
  size="md"
  kind="primary"
  renderIcon={Add}
  onClick={handleClick}
>
  Add Item
</Button>

<Button kind="tertiary" size="sm">Cancel</Button>
<Button kind="ghost">Ghost Button</Button>
```

**After (shadcn/ui):**
```jsx
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

<Button
  size="md"
  variant="default"
  onClick={handleClick}
>
  <Plus className="mr-2 h-4 w-4" />
  Add Item
</Button>

<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="ghost">Ghost Button</Button>
```

**Carbon kind → shadcn variant mapping:**
- `kind="primary"` → `variant="default"`
- `kind="secondary"` → `variant="secondary"`
- `kind="tertiary"` → `variant="outline"`
- `kind="ghost"` → `variant="ghost"`
- `kind="danger"` → `variant="destructive"`

### Input/TextArea Migration

**Before (Carbon):**
```jsx
import { TextInput, TextArea } from "@carbon/react";

<TextInput
  id="name"
  labelText="Name"
  placeholder="Enter name"
  value={value}
  onChange={onChange}
/>

<TextArea
  labelText="Description"
  placeholder="Enter description"
  rows={4}
  value={description}
  onChange={onDescriptionChange}
/>
```

**After (shadcn/ui):**
```jsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    placeholder="Enter name"
    value={value}
    onChange={onChange}
  />
</div>

<div className="space-y-2">
  <Label>Description</Label>
  <Textarea
    placeholder="Enter description"
    rows={4}
    value={description}
    onChange={onDescriptionChange}
  />
</div>
```

### Modal/Dialog Migration

**Before (Carbon):**
```jsx
import { Modal, ComposedModal, ModalHeader, ModalBody, ModalFooter } from "@carbon/react";

<Modal
  open={isOpen}
  onRequestClose={onClose}
  modalHeading="Confirm Action"
  primaryButtonText="Confirm"
  secondaryButtonText="Cancel"
  onRequestSubmit={onConfirm}
>
  <p>Are you sure?</p>
</Modal>

// Or with ComposedModal:
<ComposedModal open={isOpen} onClose={onClose}>
  <ModalHeader title="Edit Item" />
  <ModalBody>
    <p>Modal content</p>
  </ModalBody>
  <ModalFooter>
    <Button kind="secondary" onClick={onClose}>Cancel</Button>
    <Button kind="primary" onClick={onSave}>Save</Button>
  </ModalFooter>
</ComposedModal>
```

**After (shadcn/ui):**
```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>Are you sure?</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm}>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Or with more content:
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Item</DialogTitle>
    </DialogHeader>
    <div className="py-4">
      {/* Modal content */}
    </div>
    <DialogFooter>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select/Dropdown Migration

**Before (Carbon):**
```jsx
import { Dropdown } from "@carbon/react";

<Dropdown
  id="model-select"
  titleText="Select Model"
  label="Choose a model"
  items={models}
  itemToString={(item) => item?.name || ""}
  selectedItem={selectedModel}
  onChange={({ selectedItem }) => setSelectedModel(selectedItem)}
/>
```

**After (shadcn/ui):**
```jsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="model-select">Select Model</Label>
  <Select
    value={selectedModel?.id}
    onValueChange={(value) => {
      const model = models.find(m => m.id === value);
      setSelectedModel(model);
    }}
  >
    <SelectTrigger id="model-select">
      <SelectValue placeholder="Choose a model" />
    </SelectTrigger>
    <SelectContent>
      {models.map((model) => (
        <SelectItem key={model.id} value={model.id}>
          {model.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Toggle/Switch Migration

**Before (Carbon):**
```jsx
import { Toggle } from "@carbon/react";

<Toggle
  id="auto-save"
  labelText="Auto Save"
  toggled={autoSave}
  onToggle={(checked) => setAutoSave(checked)}
/>
```

**After (shadcn/ui):**
```jsx
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

<div className="flex items-center space-x-2">
  <Switch
    id="auto-save"
    checked={autoSave}
    onCheckedChange={setAutoSave}
  />
  <Label htmlFor="auto-save">Auto Save</Label>
</div>
```

### Loading/Spinner Migration

**Before (Carbon):**
```jsx
import { Loading, InlineLoading } from "@carbon/react";

<Loading description="Loading..." withOverlay={false} />
<InlineLoading description="Processing" status="active" />
```

**After (shadcn/ui):**
```jsx
import { LoadingSpinner } from "@/components/ui/spinner";

<LoadingSpinner description="Loading..." />
<LoadingSpinner description="Processing" />
```

### Grid/Layout Migration

**Before (Carbon):**
```jsx
import { Grid, Column } from "@carbon/react";

<Grid>
  <Column lg={8} md={4} sm={4}>
    <div>Content</div>
  </Column>
  <Column lg={8} md={4} sm={4}>
    <div>Content</div>
  </Column>
</Grid>
```

**After (shadcn/ui with Tailwind):**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>Content</div>
  <div>Content</div>
</div>

// Or with more control:
<div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-16 gap-4">
  <div className="col-span-4 md:col-span-4 lg:col-span-8">
    <div>Content</div>
  </div>
  <div className="col-span-4 md:col-span-4 lg:col-span-8">
    <div>Content</div>
  </div>
</div>
```

### Tag/Badge Migration

**Before (Carbon):**
```jsx
import { Tag } from "@carbon/react";

<Tag type="blue">Active</Tag>
<Tag type="red">Error</Tag>
<Tag type="green">Success</Tag>
```

**After (shadcn/ui):**
```jsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">Active</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="secondary">Success</Badge>
```

### Tile/Card Migration

**Before (Carbon):**
```jsx
import { Tile } from "@carbon/react";

<Tile>
  <h3>Title</h3>
  <p>Content</p>
</Tile>
```

**After (shadcn/ui):**
```jsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

### Tooltip Migration

**Before (Carbon):**
```jsx
import { Tooltip } from "@carbon/react";

<Tooltip align="bottom" label="Click to edit">
  <button>Edit</button>
</Tooltip>
```

**After (shadcn/ui):**
```jsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button>Edit</button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Click to edit</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Styling Patterns

### Spacing Utilities

Replace Carbon spacing with Tailwind:
- `className="margin-top-1rem"` → `className="mt-4"`
- `className="padding-2rem"` → `className="p-8"`
- `className="gap-1rem"` → `className="gap-4"`

Tailwind spacing scale:
- `1` = 0.25rem (4px)
- `2` = 0.5rem (8px)
- `3` = 0.75rem (12px)
- `4` = 1rem (16px)
- `6` = 1.5rem (24px)
- `8` = 2rem (32px)

### Color Utilities

Use Tailwind color utilities or CSS variables:
- Background: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary`
- Border: `border-border`, `border-input`

### Common Tailwind Classes

- Flexbox: `flex`, `flex-col`, `items-center`, `justify-between`, `gap-4`
- Grid: `grid`, `grid-cols-2`, `gap-4`
- Spacing: `p-4`, `px-6`, `py-2`, `m-4`, `mx-auto`, `space-y-2`
- Sizing: `w-full`, `h-10`, `min-h-screen`, `max-w-lg`
- Typography: `text-sm`, `text-lg`, `font-medium`, `font-bold`
- Borders: `border`, `border-2`, `rounded-md`, `rounded-lg`
- Effects: `shadow-sm`, `shadow-md`, `hover:bg-accent`, `focus:ring-2`

## Files Requiring Migration

### Pages (8 files)
- [ ] src/pages/RunPage.js (STARTED)
- [ ] src/pages/SettingsPage.js
- [ ] src/pages/SessionsPage.js
- [ ] src/pages/ContextsPage.js
- [ ] src/pages/ToolsPage.js
- [ ] src/pages/AgentsPage.js
- [ ] src/pages/MCPPage.js
- [ ] src/pages/KnowledgePage.js

### Components (14+ files)
- [ ] src/components/HeaderComponent/Header.js
- [ ] src/components/FormComponent/FormComponent.js
- [ ] src/components/FormComponent/TestPairsSection.js
- [ ] src/components/FormComponent/SettingsSection.js
- [ ] src/components/FormComponent/ActionsSection.js
- [ ] src/components/FormComponent/OutputSection.js
- [ ] src/components/SettingsComponent/SettingsComponent.js
- [ ] src/components/SettingsComponent/GlobalSettingsSection.js
- [ ] src/components/SettingsComponent/EnvironmentVariablesSection.js
- [ ] src/components/AgentsComponent/*
- [ ] src/components/shared/EmptyState.js
- [ ] src/components/shared/GlobalLoadingOverlay.js
- [ ] src/components/shared/InstructionsEditor.js
- [ ] src/components/shared/SpeechTextArea.js
- [ ] src/components/shared/AdvancedMultiselect/*
- [ ] src/components/shared/AdvancedSelect/*

### Modals (15 files)
- [ ] src/components/modals/ConfirmModal/ConfirmModal.js
- [ ] src/components/modals/WelcomeModal/WelcomeModal.js
- [ ] src/components/modals/DiffModal/DiffModal.js
- [ ] src/components/modals/ChatModal/ChatModal.js
- [ ] src/components/modals/ChatModal/ChatInput.js
- [ ] src/components/modals/ChatModal/ChatMessage.js
- [ ] src/components/modals/AgentModal/AgentModal.js
- [ ] src/components/modals/SessionDetailsModal/SessionDetailsModal.js
- [ ] src/components/modals/ToolModal/ToolModal.js
- [ ] src/components/modals/UploadModal/UploadModal.js
- [ ] src/components/modals/CustomModelModal/CustomModelModal.js
- [ ] src/components/modals/KnowledgeSearchModal/KnowledgeSearchModal.js
- [ ] src/components/modals/ProviderModal/ProviderModal.js
- [ ] src/components/modals/MCPModal/MCPModal.js
- [ ] src/components/modals/TestSettingsModal/TestSettingsModal.js
- [ ] src/components/modals/TestFunctionModal/TestFunctionModal.js
- [ ] src/components/modals/ContextModal/ContextModal.js

## Next Steps

1. Migrate each file following the patterns above
2. Test each component after migration
3. Update SCSS files to remove Carbon theme references
4. Remove Carbon dependencies from package.json
5. Update documentation

## Notes

- The dark theme is enabled by default with the `.dark` class on the root element
- All shadcn/ui components are accessible and follow best practices
- Tailwind provides more flexibility than Carbon's grid system
- Icon sizes may need adjustment (typically `h-4 w-4` for small, `h-5 w-5` for medium, `h-6 w-6` for large)
