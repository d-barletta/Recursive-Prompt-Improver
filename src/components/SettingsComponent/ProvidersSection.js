import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Edit, Trash2, Check } from "lucide-react";

const ProvidersSection = ({
  rows,
  headers,
  settings,
  onEditProvider,
  onDeleteProvider,
  onDefaultProviderChange,
}) => {
  // Helper to get providerData from row
  const getProviderData = (row) => {
    const providerDataCell = row.cells.find((c) => c.info.header === "providerData");
    return providerDataCell?.value;
  };

  return (
    <div className="w-full">
      <h5 className="settings-section-title">API Providers</h5>
      {rows.length === 0 ? (
        <div className="settings-empty-state">
          No providers configured. Click Add Provider to get started.
        </div>
      ) : (
        <div className="settings-table-container">
          <Table>
            <TableHeader>
              <TableRow>
                {headers
                  .filter((header) => header.key !== "providerData")
                  .map((header) => (
                    <TableHead key={header.key}>{header.header}</TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const providerData = getProviderData(row);
                return (
                  <TableRow key={row.id}>
                    {row.cells.map((cell) => {
                      // Skip rendering providerData cell (it's just for data access)
                      if (cell.info.header === "providerData") {
                        return null;
                      }
                      if (cell.info.header === "isDefault") {
                        return (
                          <TableCell key={cell.id}>
                            {cell.value ? (
                              <span className="settings-default-checkmark">
                                <Check className="h-5 w-5" />
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDefaultProviderChange(providerData)}
                              >
                                Make default
                              </Button>
                            )}
                          </TableCell>
                        );
                      }
                      if (cell.info.header === "actions") {
                        return (
                          <TableCell key={cell.id}>
                            <div className="settings-actions flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditProvider(providerData)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteProvider(providerData)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
        </div>
      )}
    </div>
  );
};

export default ProvidersSection;
