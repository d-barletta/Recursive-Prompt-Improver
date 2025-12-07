import React from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Download, MessageSquare } from "lucide-react";
import { truncateText } from "@utils/uiUtils";
import { formatDate } from "@utils/uiUtils";
import { ProviderIcon } from "@components/SettingsComponent/SettingsComponent.utils";
import { CapabilityTags } from "@components/shared";

const AgentCard = ({ agent, onEdit, onDelete, onExport, onChat }) => {
  const toolsCount = agent.selectedTools?.length || 0;
  const hasJsonOutput = agent.useJsonOutput;
  const hasJsonSchema = agent.useJsonSchema && agent.jsonSchema;

  return (
    <Card className="agent-card">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="agent-card__icon">
            <ProviderIcon providerId={agent.coreModel?.providerId} size={24} />
          </div>
          <div className="flex-1">
            <h4 className="agent-card__title font-semibold text-lg">{agent.name}</h4>
            <span className="agent-card__date text-sm text-muted-foreground">{formatDate(agent.timestamp)}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="agent-card__body space-y-4">
        <div className="agent-card__instructions text-sm" title={agent.instructions}>
          {truncateText(agent.instructions || "", 120)}
        </div>

        <div className="agent-card__metadata space-y-2">
          <div className="agent-card__metadata-item flex items-center gap-2">
            <span className="agent-card__metadata-label text-sm font-medium">Model:</span>
            <span className="agent-card__metadata-value text-sm text-muted-foreground">
              {agent.coreModel?.text || agent.coreModel?.originalText || "Not set"}
            </span>
          </div>

          <div className="agent-card__tags">
            <CapabilityTags
              toolsCount={toolsCount}
              supportsJsonOutput={hasJsonOutput}
              hasJsonSchema={hasJsonSchema}
              size="sm"
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="agent-card__actions flex gap-2">
        {onChat && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onChat}
            title="Chat"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          title="Edit"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          title="Export"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AgentCard;
