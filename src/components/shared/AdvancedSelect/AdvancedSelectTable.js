import React, { useState, useMemo, useEffect, useRef } from "react";
// Carbon DataTable components already migrated to shadcn/ui Table
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";
import CapabilityTags from "../CapabilityTags";

/**
 * Format context length to short form (e.g., 128000 -> "128K")
 */
const formatContextLength = (value) => {
  if (!value) return null;
  const num = typeof value === "string" ? parseInt(value, 10) : value;
  if (isNaN(num)) return null;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  }
  return String(num);
};

/**
 * Table component for AdvancedSelect
 * Displays items in a searchable table with radio button selection
 * @param {Array} columns - Optional array of property names to display (default: shows only first column)
 * @param {boolean} showProviderIcon - Whether to show provider icon for items with providerId
 */
const AdvancedSelectTable = ({
  items,
  selectedItem,
  onItemSelect,
  itemToString,
  sortItems,
  columns,
  filterableColumns,
  showProviderIcon,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const tableContainerRef = useRef(null);
  const selectedRowRef = useRef(null);

  // Scroll to selected item when component mounts
  useEffect(() => {
    if (selectedRowRef.current && tableContainerRef.current) {
      // Small delay to ensure the table is rendered
      const timeoutId = setTimeout(() => {
        selectedRowRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Get searchable properties based on columns prop
  const getSearchableProperties = () => {
    // Always include common name/text properties for searching
    const baseProps = ["name", "text", "label"];
    if (columns && columns.length > 0) {
      // Add specified columns to search
      const additionalCols = columns.filter((col) => !baseProps.includes(col));
      return [...baseProps, ...additionalCols];
    }
    return baseProps;
  };

  // Extract text from specified properties for searching
  const extractSearchableText = (item, properties) => {
    const texts = [];

    properties.forEach((prop) => {
      const value = item[prop];
      if (typeof value === "string") {
        texts.push(value.toLowerCase());
      } else if (typeof value === "number") {
        texts.push(String(value).toLowerCase());
      } else if (typeof value === "boolean") {
        texts.push(String(value).toLowerCase());
      } else if (Array.isArray(value)) {
        // For arrays, convert each element to string
        value.forEach((v) => {
          if (v !== null && v !== undefined) {
            texts.push(String(v).toLowerCase());
          }
        });
      } else if (value && typeof value === "object") {
        // For objects, stringify
        texts.push(JSON.stringify(value).toLowerCase());
      }
    });

    return texts;
  };

  // Get unique values for each filterable column
  const getUniqueColumnValues = (columnKey) => {
    const values = new Set();
    items.forEach((item) => {
      const value = item[columnKey];
      if (value !== null && value !== undefined) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };

  // Filter items by search term and column filters
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const searchableProps = getSearchableProperties();

      filtered = filtered.filter((item) => {
        // Search in item properties
        const textProperties = extractSearchableText(item, searchableProps);
        // Also search in the display text from itemToString
        const displayText = itemToString(item)?.toLowerCase() || "";
        return (
          textProperties.some((text) => text.includes(lowerSearchTerm)) ||
          displayText.includes(lowerSearchTerm)
        );
      });
    }

    // Apply column filters
    Object.keys(columnFilters).forEach((columnKey) => {
      const filterValues = columnFilters[columnKey];
      if (filterValues && filterValues.length > 0) {
        filtered = filtered.filter((item) => {
          const itemValue = String(item[columnKey] ?? "");
          return filterValues.includes(itemValue);
        });
      }
    });

    return filtered;
  }, [items, searchTerm, columns, columnFilters]);

  // Apply custom sorting if provided, or column sorting
  const sortedItems = useMemo(() => {
    let sorted = [...filteredItems];

    // Apply column sorting if set
    if (sortConfig.column && sortConfig.direction) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.column];
        const bValue = b[sortConfig.column];

        // Handle null/undefined
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Convert to strings for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    // Apply custom sortItems function if provided (after column sorting)
    if (sortItems) {
      sorted = sortItems(sorted);
    }

    return sorted;
  }, [filteredItems, sortItems, sortConfig]);

  // Get properties to display as columns (excluding 'id' and internal properties)
  const getDisplayProperties = (items) => {
    if (!items || items.length === 0) return [];

    const allProps = new Set();
    items.forEach((item) => {
      Object.keys(item).forEach((key) => {
        // Exclude internal properties and id
        if (!key.startsWith("_") && key !== "id") {
          allProps.add(key);
        }
      });
    });

    // Convert to array and prioritize common properties
    const commonProps = ["name", "text", "label", "description", "type"];
    const propsArray = Array.from(allProps);

    // Sort so common properties come first
    propsArray.sort((a, b) => {
      const aIndex = commonProps.indexOf(a);
      const bIndex = commonProps.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return propsArray;
  };

  const displayProperties = getDisplayProperties(items);

  // Create headers for table
  // If columns prop is provided, use it; otherwise show only first column by default
  const headers = [
    {
      key: "name",
      header: "Item",
    },
  ];

  // Add additional columns based on columns prop or default (none)
  if (columns && columns.length > 0) {
    // Use specified columns
    columns.forEach((prop) => {
      // Special handling for capabilities column - always add it if requested
      if (prop === "capabilities") {
        headers.push({
          key: "capabilities",
          header: "Capabilities",
        });
      } else if (prop !== "name" && prop !== "disabled" && displayProperties.includes(prop)) {
        headers.push({
          key: prop,
          header: prop.charAt(0).toUpperCase() + prop.slice(1),
        });
      }
    });
  }

  // Format cell value for display
  const formatCellValue = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string" && value.length > 100) {
      return value.substring(0, 100) + "...";
    }
    return String(value);
  };

  // Check if capabilities column is requested
  const hasCapabilitiesColumn = columns && columns.includes("capabilities");

  // Create rows for table - use unique compound id to handle same model id across providers
  const tableRows = sortedItems.map((item, index) => {
    // Create a unique row id that includes providerId to differentiate same models across providers
    const uniqueId = item.providerId
      ? `${item.id}_${item.providerId}_${index}`
      : item.id || String(item.name || index);

    const row = {
      id: uniqueId,
      name: itemToString(item),
      disabled: item.disabled || false,
      _originalItem: item, // Keep reference to original item
      _providerId: item.providerId, // Keep providerId for icon rendering
    };

    // Add additional properties
    displayProperties.forEach((prop) => {
      if (prop !== "name" && prop !== "disabled") {
        row[prop] = formatCellValue(item[prop]);
      }
    });

    // Add capabilities data if requested (store raw values for custom rendering)
    if (hasCapabilitiesColumn) {
      row.capabilities = {
        contextLength: item.contextLength ?? null,
        supportsTools: item.supportsTools ?? false,
        supportsVision: item.supportsVision ?? false,
        supportsJsonOutput: item.supportsJsonOutput ?? false,
      };
    }

    return row;
  });

  // Create a lookup map for quick access to original row data by id
  const rowDataMap = useMemo(() => {
    const map = new Map();
    tableRows.forEach((row) => {
      map.set(row.id, row);
    });
    return map;
  }, [tableRows]);

  // Check if item is selected
  const isItemSelected = (row) => {
    if (!selectedItem) return false;
    // Use the original item reference stored in the row
    const originalItem = row._originalItem;
    if (!originalItem) return false;

    // Compare by id AND providerId to handle same model across providers
    if (originalItem.providerId && selectedItem.providerId) {
      return (
        originalItem.id === selectedItem.id && originalItem.providerId === selectedItem.providerId
      );
    }
    // Fallback to id comparison
    const selectedId = selectedItem.id || String(selectedItem.name);
    const itemId = originalItem.id || String(originalItem.name);
    return selectedId === itemId;
  };

  // Handle row click - select item immediately
  const handleRowClick = (row) => {
    if (row.disabled) return;
    // Use the original item reference stored in the row
    const item = row._originalItem;
    if (item) {
      onItemSelect(item);
    }
  };

  // Handle column filter change
  const handleFilterChange = (columnKey, selectedValues) => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnKey]: selectedValues.map((item) => item.id),
    }));
  };

  // Handle column sort
  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.column === columnKey) {
        // Cycle through: asc -> desc -> none
        if (prev.direction === "asc") {
          return { column: columnKey, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { column: null, direction: null };
        }
      }
      return { column: columnKey, direction: "asc" };
    });
  };

  return (
    <div className="advanced-select-table" ref={tableContainerRef}>
      <DataTable rows={tableRows} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps, getToolbarProps }) => (
          <TableContainer>
            <TableToolbar {...getToolbarProps()}>
              <TableToolbarContent>
                <TableToolbarSearch
                  persistent
                  id="select-search"
                  placeholder="Search..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                  value={searchTerm}
                />
                {filterableColumns && filterableColumns.length > 0 && (
                  <div className="advanced-select-table__filters">
                    {filterableColumns.map((columnKey) => {
                      const uniqueValues = getUniqueColumnValues(columnKey);
                      const items = uniqueValues.map((value) => ({
                        id: value,
                        text: value,
                      }));
                      const selectedItems = (columnFilters[columnKey] || []).map((value) => ({
                        id: value,
                        text: value,
                      }));

                      return (
                        <MultiSelect
                          key={columnKey}
                          hideLabel={true}
                          id={`filter-${columnKey}`}
                          label={`${columnKey.charAt(0).toUpperCase() + columnKey.slice(1)}`}
                          items={items}
                          selectedItems={selectedItems}
                          itemToString={(item) => item?.text || ""}
                          onChange={({ selectedItems }) =>
                            handleFilterChange(columnKey, selectedItems)
                          }
                          size="md"
                          titleText=""
                        />
                      );
                    })}
                  </div>
                )}
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableHeader style={{ width: "48px" }} />
                  {headers.map((header) => {
                    const isSortable = false;

                    return (
                      <TableHeader
                        {...getHeaderProps({ header })}
                        key={header.key}
                        isSortable={isSortable}
                        onClick={() => isSortable && handleSort(header.key)}
                        style={{ cursor: isSortable ? "pointer" : "default" }}
                      >
                        {header.header}
                      </TableHeader>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => {
                  // Look up our original row data using the rowDataMap
                  const originalRow = rowDataMap.get(row.id) || {};
                  const isSelected = isItemSelected(originalRow);
                  const isDisabled = originalRow.disabled;
                  const providerId = originalRow._providerId;

                  return (
                    <TableRow
                      {...getRowProps({ row })}
                      ref={isSelected ? selectedRowRef : null}
                      key={`${row.id}_${i}`}
                      className={isDisabled ? "advanced-select-table__row--disabled" : ""}
                      onClick={() => handleRowClick(originalRow)}
                      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
                    >
                      <TableCell>
                        <RadioButton
                          id={`radio-${row.id}`}
                          labelText=""
                          hideLabel
                          checked={isSelected}
                          disabled={isDisabled}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => handleRowClick(originalRow)}
                        />
                      </TableCell>
                      {row.cells.map((cell) => {
                        // Show provider icon for name column or providerName column
                        if (showProviderIcon && providerId && cell.info.header === "providerName") {
                          return (
                            <TableCell key={cell.id}>
                              <span className="advanced-select-table__cell-with-icon">
                                <ProviderIcon providerId={providerId} size={16} />
                                {cell.value}
                              </span>
                            </TableCell>
                          );
                        }
                        // Render capabilities column with tags
                        if (cell.info.header === "capabilities" && cell.value) {
                          const caps = cell.value;
                          return (
                            <TableCell key={cell.id}>
                              <CapabilityTags
                                supportsTools={caps.supportsTools}
                                supportsVision={caps.supportsVision}
                                supportsJsonOutput={caps.supportsJsonOutput}
                                className="advanced-select-table__capabilities"
                              />
                            </TableCell>
                          );
                        }
                        return <TableCell key={cell.id}>{cell.value}</TableCell>;
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DataTable>
    </div>
  );
};

export default AdvancedSelectTable;
