import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactDiffViewer from "@alexbruf/react-diff-viewer";
import "@alexbruf/react-diff-viewer/index.css";

const DiffModal = ({
  isOpen,
  onClose,
  title = "Diff Viewer",
  oldValue = "",
  newValue = "",
  //   oldLabel = "Original",
  //   newLabel = "Modified",
  showDiffOnly = false,
  hideLineNumbers = true,
  useDarkTheme = true,
  splitView = false,
  compareMethod = "diffWords",
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 overflow-auto">
          <ReactDiffViewer
            showDiffOnly={showDiffOnly}
            hideLineNumbers={hideLineNumbers}
            useDarkTheme={useDarkTheme}
            oldValue={oldValue}
            newValue={newValue}
            //   leftTitle={oldLabel}
            //   rightTitle={newLabel}
            splitView={splitView}
            compareMethod={compareMethod}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiffModal;
