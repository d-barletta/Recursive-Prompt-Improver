import React, { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <span className="flex items-center gap-2">
        <Badge variant="secondary" className="rounded-sm">
          {selectedCount}
        </Badge>
        items selected
      </span>
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
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      {titleText && (
        <label htmlFor={id} className={`text-sm font-medium ${disabled ? "text-gray-500" : "text-gray-200"}`}>
          {titleText}
        </label>
      )}
      <Button
        id={id}
        variant="outline"
        size={size || "default"}
        className={`w-full justify-between ${invalid ? "border-red-500" : ""}`}
        onClick={handleOpenModal}
        disabled={disabled}
      >
        <span className="flex items-center gap-2 overflow-hidden">
          {buttonText}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
      {helperText && !invalid && <div className="text-xs text-gray-400">{helperText}</div>}
      {invalid && invalidText && <div className="text-xs text-red-400">{invalidText}</div>}

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
