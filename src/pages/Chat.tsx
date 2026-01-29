import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ConversationList from "@/components/chat/ConversationList";
import ChatMessages from "@/components/chat/ChatMessages";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  rating?: number;
  comment?: string;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  type?: "message" | "email";
  emailData?: {
    subject: string;
    body: string;
    recipient: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// Decode base64 token to get user identity
const decodeToken = (token: string): string | null => {
  try {
    return atob(token);
  } catch {
    console.error("Invalid token format");
    return null;
  }
};

// Generate a unique guest ID
const generateGuestId = (): string => {
  const existingGuestId = localStorage.getItem("guestId");
  if (existingGuestId) {
    return existingGuestId;
  }
  const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem("guestId", newGuestId);
  return newGuestId;
};

const Chat = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string>("");
  const [isGuest, setIsGuest] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (token) {
      // Decode the token to get user identity
      const decodedUserId = decodeToken(token);
      if (decodedUserId) {
        setUserId(decodedUserId);
        setIsGuest(false);
        loadConversations(decodedUserId);
      } else {
        // Invalid token, fall back to guest
        const guestId = generateGuestId();
        setUserId(guestId);
        setIsGuest(true);
        loadConversations(guestId);
      }
    } else {
      // No token provided, generate guest ID
      const guestId = generateGuestId();
      setUserId(guestId);
      setIsGuest(true);
      loadConversations(guestId);
    }
  }, [searchParams]);

  const loadConversations = async (id: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('load-conversations', {
        body: { user_id: id }
      });

      if (error) throw error;

      if (data?.conversations) {
        const transformedConversations: Conversation[] = data.conversations.map((conv: any) => ({
          id: conv.conversation_id,
          title: conv.messages[0]?.text?.substring(0, 50) || "New Conversation",
          messages: conv.messages.map((msg: any) => ({
            id: msg.message_id,
            role: msg.role === "assistant" ? "ai" : msg.role as "user" | "ai",
            content: msg.text,
            timestamp: new Date(msg.created_at),
            rating: msg.rating !== "unrated" ? parseInt(msg.rating) : undefined,
            comment: msg.comment || undefined,
            sources: msg.cited_sources?.map((url: string) => ({
              title: url.split('/').pop()?.replace(/-/g, ' ') || 'Source',
              url: url
            })) || undefined,
          })),
          createdAt: new Date(conv.messages[0]?.created_at || new Date()),
        }));

        setConversations(transformedConversations);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (conversations.length > 0 && userId) {
      localStorage.setItem(`conversations_${userId}`, JSON.stringify(conversations));
    }
  }, [conversations, userId]);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date()
    };
    setConversations([newConv, ...conversations]);
    setActiveConversationId(newConv.id);
  };

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => 
      prev.map(c => c.id === id ? { ...c, ...updates } : c)
    );
  };

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 h-14 flex items-center">
        <h1 className="text-lg font-semibold text-foreground">Spaceship Bot</h1>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-sidebar flex flex-col shrink-0">
          <div className="p-3 border-b">
            <Button onClick={createNewConversation} className="w-full" size="sm">
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={setActiveConversationId}
              onDelete={deleteConversation}
            />
          )}
        </aside>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages
            conversation={activeConversation}
            onUpdate={updateConversation}
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
