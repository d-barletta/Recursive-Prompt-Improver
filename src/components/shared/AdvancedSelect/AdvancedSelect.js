import React, { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import AdvancedSelectModal from "./AdvancedSelectModal";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";

/**
 * AdvancedSelect - A single-select component that opens a modal with a searchable table
 * Similar to AdvancedMultiselect but for single item selection with instant selection on click
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique identifier for the component
 * @param {string} props.titleText - Label text above the button
 * @param {string} props.label - Placeholder text when no item selected
 * @param {Array} props.items - Available items to select from
 * @param {Object} props.selectedItem - Currently selected item
 * @param {Function} props.onChange - Callback when selection changes: ({ selectedItem }) => void
 * @param {Function} props.itemToString - Function to convert item to display string
 * @param {Function} props.sortItems - Optional function to sort items
 * @param {Array} props.columns - Optional array of property names to display as columns (default: shows only first column)
 * @param {Array} props.filterableColumns - Optional array of column names that should have filter dropdowns
 * @param {boolean} props.disabled - Whether the component is disabled
 * @param {string} props.direction - Not used (for API compatibility)
 * @param {string} props.helperText - Optional helper text below the button
 * @param {boolean} props.invalid - Whether the component is in invalid state
 * @param {string} props.invalidText - Error message to display when invalid
 * @param {boolean} props.showProviderIcon - Whether to show provider icon for items with providerId
 */
const AdvancedSelect = ({
  id,
  titleText,
  label = "Select an item",
  items = [],
  selectedItem = null,
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
  showProviderIcon = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Generate button content with optional provider icon
  const buttonContent = useMemo(() => {
    if (!selectedItem) {
      return label;
    }
    const text = itemToString(selectedItem);
    if (showProviderIcon && selectedItem.providerId) {
      return (
        <span className="advanced-select__button-content">
          <ProviderIcon providerId={selectedItem.providerId} size={16} />
          <span className="advanced-select__button-content__text">{text}</span>
        </span>
      );
    }
    return text;
  }, [selectedItem, label, itemToString, showProviderIcon]);

  const handleOpenModal = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectionChange = (newSelectedItem) => {
    if (onChange) {
      onChange({ selectedItem: newSelectedItem });
    }
    // Close modal immediately after selection
    setIsModalOpen(false);
  };

  return (
    <div className={`advanced-select ${disabled ? "disabled" : ""}`}>
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
          className={`advanced-select__button ${invalid ? "advanced-select__button--invalid" : ""}`}
          onClick={handleOpenModal}
          disabled={disabled}
          renderIcon={ChevronDown}
        >
          {buttonContent}
        </Button>
      </div>
      {helperText && !invalid && <div className="cds--form__helper-text">{helperText}</div>}
      {invalid && invalidText && <div className="cds--form-requirement">{invalidText}</div>}

      <AdvancedSelectModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        items={items}
        selectedItem={selectedItem}
        onSelectionChange={handleSelectionChange}
        itemToString={itemToString}
        sortItems={sortItems}
        columns={columns}
        filterableColumns={filterableColumns}
        title={titleText || "Select Item"}
        showProviderIcon={showProviderIcon}
      />
    </div>
  );
};

export default AdvancedSelect;
