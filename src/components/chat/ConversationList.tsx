import { Conversation } from "@/pages/Chat";
import { Button } from "@/components/ui/button";
import { MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const ConversationList = ({ conversations, activeId, onSelect, onDelete }: ConversationListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {conversations.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          No conversations yet
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg p-2 cursor-pointer hover:bg-sidebar-accent transition-colors",
                activeId === conv.id && "bg-sidebar-accent"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm truncate">
                {conv.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationList;
