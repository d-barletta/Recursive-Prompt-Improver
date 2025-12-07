import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AdvancedMultiselectTable from "./AdvancedMultiselectTable";

/**
 * Modal component for AdvancedMultiselect
 * Contains the searchable table and action buttons
 * Renders in a portal to avoid z-index issues with nested modals
 */
const AdvancedMultiselectModal = ({
  isOpen,
  onClose,
  items,
  selectedItems,
  onSelectionChange,
  itemToString,
  sortItems,
  columns,
  filterableColumns,
  title,
}) => {
  // Local state for modal selections (allows cancel without saving)
  const [tempSelectedItems, setTempSelectedItems] = useState([]);

  // Initialize temp selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedItems([...selectedItems]);
    }
  }, [isOpen, selectedItems]);

  const handleApply = () => {
    onSelectionChange(tempSelectedItems);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedItems([...selectedItems]); // Reset to original
    onClose();
  };

  const handleClearAll = () => {
    setTempSelectedItems([]);
  };

  const handleSelectAll = () => {
    // Filter out disabled items
    const selectableItems = items.filter((item) => !item.disabled);
    setTempSelectedItems(selectableItems);
  };

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 flex-1 overflow-auto">
          <AdvancedMultiselectTable
            items={items}
            selectedItems={tempSelectedItems}
            onSelectionChange={setTempSelectedItems}
            itemToString={itemToString}
            sortItems={sortItems}
            columns={columns}
            filterableColumns={filterableColumns}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
          />
        </div>
        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply ({tempSelectedItems.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Render modal in a portal to avoid nesting issues
  return ReactDOM.createPortal(modalContent, document.body);
};

export default AdvancedMultiselectModal;
