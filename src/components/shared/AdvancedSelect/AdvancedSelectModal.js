import React from "react";
import ReactDOM from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdvancedSelectTable from "./AdvancedSelectTable";

/**
 * Modal component for AdvancedSelect
 * Contains the searchable table - no footer buttons, selection happens on click
 * Renders in a portal to avoid z-index issues with nested modals
 */
const AdvancedSelectModal = ({
  isOpen,
  onClose,
  items,
  selectedItem,
  onSelectionChange,
  itemToString,
  sortItems,
  columns,
  filterableColumns,
  title,
  showProviderIcon,
}) => {
  const handleItemSelect = (item) => {
    onSelectionChange(item);
    // Modal will be closed by parent component
  };

  const modalContent = (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 overflow-auto">
          <AdvancedSelectTable
            items={items}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
            itemToString={itemToString}
            sortItems={sortItems}
            columns={columns}
            filterableColumns={filterableColumns}
            showProviderIcon={showProviderIcon}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  // Render modal in a portal to avoid nesting issues
  return ReactDOM.createPortal(modalContent, document.body);
};

export default AdvancedSelectModal;
