import React, { useState, useMemo } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

/**
 * Table component for AdvancedMultiselect
 * Displays items in a searchable, selectable table
 * @param {Array} columns - Optional array of property names to display (default: shows only first column)
 */
const AdvancedMultiselectTable = ({
  items,
  selectedItems,
  onSelectionChange,
  itemToString,
  sortItems,
  columns,
  filterableColumns,
  onSelectAll,
  onClearAll,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });

  // Get searchable properties based on columns prop
  const getSearchableProperties = () => {
    if (columns && columns.length > 0) {
      // Search only in specified columns plus the name property
      return ["name", ...columns.filter((col) => col !== "name")];
    }
    // If no columns specified, search only in the first property (name)
    return ["name"];
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
        const textProperties = extractSearchableText(item, searchableProps);
        return textProperties.some((text) => text.includes(lowerSearchTerm));
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
      if (prop !== "name" && prop !== "disabled" && displayProperties.includes(prop)) {
        headers.push({
          key: prop,
          header: prop.charAt(0).toUpperCase() + prop.slice(1),
        });
      }
    });
  }
  // If no columns specified, show only the first column (name) by default

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

  // Create rows for table
  const rows = sortedItems.map((item) => {
    const row = {
      id: item.id || String(item.name || Math.random()),
      name: itemToString(item),
      disabled: item.disabled || false,
    };

    // Add additional properties
    displayProperties.forEach((prop) => {
      if (prop !== "name" && prop !== "disabled") {
        row[prop] = formatCellValue(item[prop]);
      }
    });

    return row;
  });

  // Check if item is selected
  const isItemSelected = (itemId) => {
    return selectedItems.some((selected) => {
      const selectedId = selected.id || String(selected.name);
      return selectedId === itemId;
    });
  };

  // Handle row selection
  const handleSelectRow = (rowId, checked) => {
    const item = sortedItems.find((i) => {
      const id = i.id || String(i.name);
      return id === rowId;
    });

    if (!item || item.disabled) return;

    if (checked) {
      // Add to selection if not already selected
      if (!isItemSelected(rowId)) {
        onSelectionChange([...selectedItems, item]);
      }
    } else {
      // Remove from selection
      onSelectionChange(
        selectedItems.filter((selected) => {
          const selectedId = selected.id || String(selected.name);
          return selectedId !== rowId;
        })
      );
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectAll();
    } else {
      onClearAll();
    }
  };

  // Calculate how many selectable items are selected
  const selectableItems = sortedItems.filter((item) => !item.disabled);
  const selectedSelectableCount = selectableItems.filter((item) => {
    const itemId = item.id || String(item.name);
    return isItemSelected(itemId);
  }).length;

  const allSelectableSelected =
    selectableItems.length > 0 && selectedSelectableCount === selectableItems.length;
  const someSelectableSelected = selectedSelectableCount > 0 && !allSelectableSelected;

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
    <div className="advanced-multiselect-table">
      <DataTable rows={rows} headers={headers}>
        {({
          rows,
          headers,
          getTableProps,
          getHeaderProps,
          getRowProps,
          getSelectionProps,
          getToolbarProps,
        }) => (
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
                  <div className="advanced-multiselect-table__filters">
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
                  <TableSelectAll
                    {...getSelectionProps()}
                    checked={allSelectableSelected}
                    indeterminate={someSelectableSelected}
                    onSelect={() => handleSelectAll(!allSelectableSelected)}
                    disabled={selectableItems.length === 0}
                  />
                  {headers.map((header) => {
                    const isSortable = false; //header.key !== "name" || columns?.includes(header.key);

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
                {rows.map((row) => {
                  const isSelected = isItemSelected(row.id);
                  const isDisabled = row.disabled;
                  return (
                    <TableRow
                      {...getRowProps({ row })}
                      key={row.id}
                      className={isDisabled ? "advanced-multiselect-table__row--disabled" : ""}
                      onClick={() => !isDisabled && handleSelectRow(row.id, !isSelected)}
                      style={{ cursor: isDisabled ? "not-allowed" : "pointer" }}
                    >
                      <TableSelectRow
                        {...getSelectionProps({ row })}
                        checked={isSelected}
                        onSelect={(checked) => {
                          if (!isDisabled) {
                            handleSelectRow(row.id, checked);
                          }
                        }}
                        disabled={isDisabled}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
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

export default AdvancedMultiselectTable;
