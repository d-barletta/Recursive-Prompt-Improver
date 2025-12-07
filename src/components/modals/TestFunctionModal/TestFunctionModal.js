import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/spinner";
import { executeSandboxedFunction, validateFunctionCode } from "@utils/toolUtils";
import JsonSchemaEditor from "@components/shared/JsonSchemaEditor";
import { generateExampleParameters } from "./TestFunctionModal.utils";

const TestFunctionModal = ({ isOpen, onClose, functionCode, parametersSchema }) => {
  const [testParameters, setTestParameters] = useState("{}");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Generate example parameters based on schema
      const exampleParams = generateExampleParameters(parametersSchema);
      setTestParameters(JSON.stringify(exampleParams, null, 2));
      setTestResult(null);
    }
  }, [isOpen, parametersSchema]);

  const handleTestExecution = async () => {
    setIsExecuting(true);
    setTestResult(null);

    // Validate function code first
    const validation = validateFunctionCode(functionCode);
    if (!validation.valid) {
      setTestResult({
        success: false,
        result: null,
        error: validation.error,
      });
      setIsExecuting(false);
      return;
    }

    // Parse test parameters
    let params;
    try {
      params = JSON.parse(testParameters);
      if (typeof params !== "object" || params === null) {
        throw new Error("Parameters must be a JSON object");
      }
    } catch (error) {
      setTestResult({
        success: false,
        result: null,
        error: `Invalid JSON parameters: ${error.message}`,
      });
      setIsExecuting(false);
      return;
    }

    // Execute the function
    try {
      const result = await executeSandboxedFunction(functionCode, params, 5000);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        result: null,
        error: error.message || String(error),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] test-function-modal" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Test Function</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Test your function by providing parameter values below.
          </p>

          <div className="space-y-2">
            <Label>Test Parameters (JSON object)</Label>
            <JsonSchemaEditor
              value={testParameters}
              onChange={(value) => setTestParameters(value)}
              height="150px"
              placeholder='{"param1": "value1", "param2": 123}'
              showValidation={true}
              helperText="Provide parameter values as a JSON object"
            />
          </div>

          {isExecuting && (
            <div className="py-4">
              <LoadingSpinner description="Executing function..." />
            </div>
          )}

          {testResult && (
            <div className="space-y-4">
              {testResult.success ? (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Test Passed</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">Function executed successfully</p>
                </div>
              ) : (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <h4 className="font-semibold text-destructive">Test Failed</h4>
                  <p className="text-sm text-destructive">{testResult.error || "Unknown error"}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Result:</Label>
                <Textarea
                  id="test-result"
                  value={
                    testResult.success
                      ? JSON.stringify(testResult.result, null, 2)
                      : testResult.error || "No result"
                  }
                  rows={6}
                  readOnly
                  className="font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleTestExecution} disabled={isExecuting}>
            {isExecuting ? "Running..." : "Run Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestFunctionModal;
