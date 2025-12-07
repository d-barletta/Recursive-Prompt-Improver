import React from "react";
import ReactDOM from "react-dom";
// Carbon Modal components already migrated to shadcn/ui Dialog
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
    <ComposedModal
      size="md"
      open={isOpen}
      onClose={onClose}
      className="advanced-select-modal"
      preventCloseOnClickOutside
      selectorPrimaryFocus="#select-search"
    >
      <ModalHeader title={title} />
      <ModalBody className="advanced-select-modal__body">
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
      </ModalBody>
    </ComposedModal>
  );

  // Render modal in a portal to avoid nesting issues
  return ReactDOM.createPortal(modalContent, document.querySelector(".rpi"));
};

export default AdvancedSelectModal;
