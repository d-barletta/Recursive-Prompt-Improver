import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const EmptyState = ({ icon: Icon, title, description }) => {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        {Icon && (
          <div className="mb-4 text-muted-foreground">
            <Icon size={48} />
          </div>
        )}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
