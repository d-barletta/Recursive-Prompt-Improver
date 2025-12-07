import React from "react";
import { LoadingSpinner } from "@/components/ui/spinner";
import { useLoading } from "@context/LoadingContext";

const GlobalLoadingOverlay = () => {
  const { isGlobalLoading, globalLoadingMessage } = useLoading();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 p-8 bg-card rounded-lg shadow-lg border">
        <LoadingSpinner className="h-8 w-8" />
        {globalLoadingMessage && (
          <p className="text-sm text-muted-foreground text-center">{globalLoadingMessage}</p>
        )}
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
