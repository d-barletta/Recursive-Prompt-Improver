import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
// Carbon Modal components already migrated to shadcn/ui Dialog
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
    <ComposedModal
      size="md"
      open={isOpen}
      onClose={handleCancel}
      className="advanced-multiselect-modal"
      preventCloseOnClickOutside
      selectorPrimaryFocus="#select-search"
    >
      <ModalHeader title={title} />
      <ModalBody className="advanced-multiselect-modal__body">
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
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleApply}>
          Apply ({tempSelectedItems.length})
        </Button>
      </ModalFooter>
    </ComposedModal>
  );

  // Render modal in a portal to avoid nesting issues
  return ReactDOM.createPortal(modalContent, document.querySelector(".rpi"));
};

export default AdvancedMultiselectModal;
