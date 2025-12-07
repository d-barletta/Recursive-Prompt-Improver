import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Edit, Trash2, Plus } from "lucide-react";

const EnvironmentVariablesSection = ({
  environmentVariables,
  showEnvVarForm,
  editingEnvVarIndex,
  envVarKey,
  envVarValue,
  envVarKeyError,
  onAddEnvVar,
  onEditEnvVar,
  onDeleteEnvVar,
  onSaveEnvVar,
  onCancelEnvVar,
  onEnvVarKeyChange,
  onEnvVarValueChange,
}) => {
  return (
    <div className="w-full">
      <h5 className="settings-section-title--spaced text-lg font-semibold mb-4">Environment Variables</h5>
      <p className="settings-env-description text-sm text-muted-foreground mb-4">
        Environment variables defined here will be available in tool functions as{" "}
        <code className="px-1 py-0.5 bg-muted rounded text-sm">env.VARIABLE_NAME</code>
        <br />
        Use them to store configuration values, API keys, or any other data your tools need.
      </p>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="env-vars">
          <AccordionTrigger>
            Environment Variables {environmentVariables?.length ? `(${environmentVariables?.length})` : ""}
          </AccordionTrigger>
          <AccordionContent>
            <div className="settings-env-accordion-content space-y-4">
              {/* Add/Edit Form */}
              {showEnvVarForm && (
                <div className="settings-env-form border rounded-md p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="env-var-key">Key</Label>
                      <Input
                        id="env-var-key"
                        placeholder="e.g., API_KEY, DATABASE_URL"
                        value={envVarKey}
                        onChange={onEnvVarKeyChange}
                      />
                      {envVarKeyError && (
                        <p className="text-sm text-destructive">{envVarKeyError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="env-var-value">Value</Label>
                      <Input
                        id="env-var-value"
                        placeholder="Enter value"
                        value={envVarValue}
                        onChange={onEnvVarValueChange}
                      />
                    </div>
                  </div>
                  <div className="settings-env-form-actions flex gap-2">
                    <Button size="sm" onClick={onSaveEnvVar}>
                      {editingEnvVarIndex !== null ? "Update" : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancelEnvVar}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* List of Environment Variables */}
              {environmentVariables && environmentVariables.length > 0 ? (
                <div className="settings-env-list space-y-2">
                  {environmentVariables.map((envVar, index) => (
                    <div key={index} className="settings-env-item flex items-center justify-between p-3 border rounded-md">
                      <div className="settings-env-item-content flex-1">
                        <strong className="font-semibold">{envVar.key}</strong>
                        <div className="settings-env-item-value text-sm text-muted-foreground mt-1">{envVar.value}</div>
                      </div>
                      <div className="settings-env-item-actions flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditEnvVar(index)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteEnvVar(index)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : showEnvVarForm ? null : (
                <div className="settings-empty-state text-center py-8 text-sm text-muted-foreground">
                  <p className="mb-4">No environment variables defined. Click Add Variable to get started.</p>
                  <Button size="sm" variant="ghost" onClick={onAddEnvVar}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variable
                  </Button>
                </div>
              )}

              {/* Add Button */}
              {!showEnvVarForm && environmentVariables.length > 0 && (
                <div className="settings-env-add-button">
                  <Button size="sm" variant="ghost" onClick={onAddEnvVar}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Variable
                  </Button>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default EnvironmentVariablesSection;
