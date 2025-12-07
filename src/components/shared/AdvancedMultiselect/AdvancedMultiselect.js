import React, { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import AdvancedMultiselectModal from "./AdvancedMultiselectModal";

/**
 * AdvancedMultiselect - A drop-in replacement for Carbon's MultiSelect
 * Opens a modal with a searchable table for better item selection experience
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique identifier for the component
 * @param {string} props.titleText - Label text above the button
 * @param {string} props.label - Placeholder text when no items selected
 * @param {Array} props.items - Available items to select from
 * @param {Array} props.selectedItems - Currently selected items
 * @param {Function} props.onChange - Callback when selection changes: ({ selectedItems }) => void
 * @param {Function} props.itemToString - Function to convert item to display string
 * @param {Function} props.sortItems - Optional function to sort items
 * @param {Array} props.columns - Optional array of property names to display as columns (default: shows only first column)
 * @param {Array} props.filterableColumns - Optional array of column names that should have filter dropdowns
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.direction - Not used (for API compatibility with MultiSelect)
 * @param {string} props.helperText - Optional helper text below the button
 * @param {boolean} props.invalid - Whether the component is in invalid state
 * @param {string} props.invalidText - Error message to display when invalid
 */
const AdvancedMultiselect = ({
  id,
  titleText,
  label = "Select items",
  items = [],
  selectedItems = [],
  onChange,
  itemToString = (item) => item?.name || item?.text || "",
  sortItems,
  columns,
  filterableColumns,
  disabled = false,
  direction, // Not used, for API compatibility
  helperText,
  invalid = false,
  invalidText,
  size,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Count selected items
  const selectedCount = selectedItems?.length || 0;

  const handleDismissTag = () => {
    if (onChange) {
      onChange({ selectedItems: [] });
    }
  };

  // Generate button text
  const buttonText = useMemo(() => {
    if (selectedCount === 0) {
      return label;
    }
    return (
      <>
        <Tag className="selectdTag" type="high-contrast" size="sm">
          {selectedCount}
        </Tag>
        items selected
      </>
    );
  }, [selectedCount, label]);

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectionChange = (newSelectedItems) => {
    if (onChange) {
      onChange({ selectedItems: newSelectedItems });
    }
  };

  return (
    <div className={`advanced-multiselect ${disabled ? "disabled" : ""}`}>
      {titleText && (
        <label htmlFor={id} className={`cds--label ${disabled ? "cds--label--disabled" : ""}`}>
          {titleText}
        </label>
      )}
      <div className="cds--dropdown">
        <Button
          id={id}
          kind="tertiary"
          size={size || "md"}
          className={`advanced-multiselect__button ${invalid ? "advanced-multiselect__button--invalid" : ""}`}
          onClick={handleOpenModal}
          disabled={disabled}
          renderIcon={ChevronDown}
        >
          {buttonText}
        </Button>
      </div>
      {helperText && !invalid && <div className="cds--form__helper-text">{helperText}</div>}
      {invalid && invalidText && <div className="cds--form-requirement">{invalidText}</div>}

      <AdvancedMultiselectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        items={items}
        selectedItems={selectedItems}
        onSelectionChange={handleSelectionChange}
        itemToString={itemToString}
        sortItems={sortItems}
        columns={columns}
        filterableColumns={filterableColumns}
        title={titleText || "Select Items"}
      />
    </div>
  );
};

export default AdvancedMultiselect;
