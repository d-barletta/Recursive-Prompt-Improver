import React, { useMemo, useCallback } from "react";
// Carbon ComboBox already migrated to shadcn/ui in this file
import PropTypes from "prop-types";

/**
 * CategoryDropdown - A wrapper around Carbon's ComboBox that supports grouped items
 * with disabled category headers and searchable filtering.
 *
 * This component takes a flat array of items and groups them by a category field,
 * inserting disabled items as category headers. Perfect for displaying models
 * grouped by provider, tools grouped by type, etc.
 *
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items to display
 * @param {string} props.categoryField - Field name to use for grouping (default: "providerName")
 * @param {Function} props.categoryLabel - Function to format category label (optional)
 * @param {boolean} props.showCategoryInItems - Whether to show category in item text (default: false)
 * @param {Object} props.selectedItem - Currently selected item
 * @param {Function} props.onChange - Callback when selection changes
 * @param {Function} props.itemToString - Function to convert item to string
 */
const CategoryDropdown = ({
  items = [],
  categoryField = "providerName",
  categoryLabel = null,
  showCategoryInItems = false,
  selectedItem,
  onChange,
  itemToString = (item) => item?.text || "",
  ...rest
}) => {
  /**
   * Transform flat items array into grouped array with category headers
   * Category headers are marked with isCategory: true and disabled: true
   */
  const groupedItems = useMemo(() => {
    if (!items || items.length === 0) {
      return [];
    }

    // Group items by category field
    const grouped = items.reduce((acc, item) => {
      const category = item[categoryField] || "Other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    // Convert grouped object to flat array with category headers
    const result = [];
    Object.keys(grouped)
      .sort() // Sort categories alphabetically
      .forEach((category) => {
        // Add category header (disabled item)
        const categoryHeader = {
          id: `category-${category}`,
          text: `${categoryLabel ? categoryLabel(category) : category}`,
          isCategory: true,
          disabled: true,
          categoryName: category,
        };
        result.push(categoryHeader);

        // Add items for this category
        const categoryItems = grouped[category].map((item) => {
          // Optionally remove category from item text if showCategoryInItems is false
          const itemText = showCategoryInItems ? item.text : item.originalText || item.text;
          return {
            ...item,
            // Add spacing before item text to show indentation
            text: `ㅤ${itemText}`,
          };
        });
        result.push(...categoryItems);
      });

    return result;
  }, [items, categoryField, categoryLabel, showCategoryInItems]);

  /**
   * Custom itemToString that handles category headers
   */
  const customItemToString = useCallback(
    (item) => {
      if (!item) return "";
      if (item.isCategory) return item.text;
      return itemToString(item);
    },
    [itemToString]
  );

  /**
   * Custom filter function to filter items by search term
   * Also shows category headers if any items in that category match
   */
  const shouldFilterItem = useCallback(
    ({ item, inputValue: filterValue }) => {
      // Category headers: show if any item in this category matches
      if (item.isCategory) {
        if (!filterValue) return true;
        const searchTerm = filterValue.toLowerCase();
        // Check if any item in this category matches
        return groupedItems.some(
          (groupedItem) =>
            !groupedItem.isCategory &&
            groupedItem[categoryField] === item.categoryName &&
            customItemToString(groupedItem).toLowerCase().includes(searchTerm)
        );
      }

      // Regular items: standard text matching
      if (!filterValue) return true;
      return customItemToString(item).toLowerCase().includes(filterValue.toLowerCase());
    },
    [groupedItems, categoryField, customItemToString]
  );

  /**
   * Find the matching grouped item for the selected item.
   * This is necessary because groupedItems transforms items (adds text prefix),
   * so the original selectedItem won't match by reference.
   */
  const matchedSelectedItem = useMemo(() => {
    if (!selectedItem) return null;
    return groupedItems.find((item) => !item.isCategory && item.id === selectedItem.id);
  }, [selectedItem, groupedItems]);

  /**
   * Handle onChange - filter out category header selections
   * (they shouldn't be selectable, but this is a safety check)
   *
   * When user clicks on current selection and blurs, ComboBox fires onChange with null.
   * We preserve the current selection in this case by not propagating the null change.
   */
  const handleChange = (event) => {
    const { selectedItem: newSelectedItem } = event;
    // Don't allow selection of category headers
    if (newSelectedItem?.isCategory) {
      return;
    }
    // Allow valid item selection (pass through to parent)
    // Block null changes to preserve current selection on blur
    if (newSelectedItem) {
      onChange(event);
    }
  };

  return (
    <ComboBox
      {...rest}
      items={groupedItems}
      selectedItem={matchedSelectedItem}
      itemToString={customItemToString}
      onChange={handleChange}
      shouldFilterItem={shouldFilterItem}
    />
  );
};

CategoryDropdown.propTypes = {
  items: PropTypes.array.isRequired,
  categoryField: PropTypes.string,
  categoryLabel: PropTypes.func,
  showCategoryInItems: PropTypes.bool,
  selectedItem: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  itemToString: PropTypes.func,
};

export default CategoryDropdown;
