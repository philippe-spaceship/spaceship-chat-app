import { useState, useRef, useEffect } from "react";
import { Conversation, Message } from "@/pages/Chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Loader2 } from "lucide-react";
import MessageRating from "./MessageRating";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import aiAvatar from "@/assets/ai-avatar.png";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import EmailDraftEditor from "./EmailDraftEditor";

interface ChatMessagesProps {
  conversation?: Conversation;
  onUpdate: (id: string, updates: Partial<Conversation>) => void;
  userId?: string;
}

const ChatMessages = ({ conversation, onUpdate, userId }: ChatMessagesProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const loadingMessages = [
    "Analyzing your question...",
    "Searching knowledge base...",
    "Processing information...",
    "Generating response...",
    "Retrieving relevant data...",
    "Cross-referencing sources...",
    "Evaluating best answer...",
    "Compiling insights...",
    "Scanning documentation...",
    "Verifying information...",
    "Structuring response...",
    "Optimizing answer quality..."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const sendMessageToAI = async (messageContent: string, messagesContext: Message[]) => {
    if (!conversation || isLoading) return;

    const username = userId || "guest";
    const title = conversation.title;
    
    setIsLoading(true);
    
    // Show random loading messages
    const getRandomMessage = () => {
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      return loadingMessages[randomIndex];
    };
    
    setLoadingMessage(getRandomMessage());
    const loadingInterval = setInterval(() => {
      setLoadingMessage(getRandomMessage());
    }, 1200);

    try {
      // Step 1: Create async job
      console.log('Creating async job...');
      const createJobResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spaceship-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          question: messageContent,
          conversation_id: conversation.id,
          user_id: username,
          messages: messagesContext.map(msg => {
            if (msg.type === "email") {
              return {
                id: msg.id,
                type: "email",
                content: msg.content,
                timestamp: msg.timestamp
              };
            }
            return {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp
            };
          })
        })
      });

      if (!createJobResponse.ok) {
        const errorText = await createJobResponse.text();
        console.error('Failed to create job:', errorText);
        throw new Error(`Failed to create job: ${createJobResponse.status}`);
      }

      const jobData = await createJobResponse.json();
      console.log('Job created:', jobData);
      const { jobId } = jobData;

      // Step 2: Poll for job completion
      const pollDelay = 2000;
      const maxPolls = 150;
      let pollCount = 0;

      const pollJob = async () => {
        if (pollCount >= maxPolls) {
          throw new Error('Job timed out after 5 minutes');
        }
        pollCount++;

        const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spaceship-query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ jobId })
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error('Failed to check job status:', errorText);
          throw new Error(`Failed to check job status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        console.log('Job status:', statusData.status);

        if (statusData.status === 'DONE') {
          clearInterval(loadingInterval);
          
          const result = statusData.result;
          const sources = statusData.sources || [];
          const responsePayload = statusData.responsePayload || {};
          
          console.log('Job complete. Response payload:', responsePayload);
          
          // Create messages from job result
          const userMessageId = responsePayload.user_message_id || `msg-${Date.now()}-user`;
          const aiMessageId = responsePayload.assistant_message_id || `msg-${Date.now()}-ai`;
          
          const userMessage: Message = {
            id: userMessageId,
            role: "user",
            content: messageContent,
            timestamp: new Date()
          };

          const aiMessage: Message = {
            id: aiMessageId,
            role: "ai",
            content: result,
            timestamp: new Date(),
            sources: sources
          };

          // Check if there's an email draft in the response
          let emailDraftMessage: Message | null = null;
          if (responsePayload.email_draft) {
            const draft = responsePayload.email_draft;
            emailDraftMessage = {
              id: `email-draft-${Date.now()}`,
              type: "email",
              role: "ai",
              content: `Draft email to ${draft.contact_info?.email || 'support@spaceshipapp.com'}`,
              timestamp: new Date(),
              emailData: {
                subject: draft.subject,
                body: draft.body_markdown,
                recipient: draft.contact_info?.email || 'support@spaceshipapp.com'
              }
            };
          }

          // Simulate typing effect
          setIsStreaming(true);
          const content = result;
          let charIndex = 0;
          const typingSpeed = 15;
          
          const typeInterval = setInterval(() => {
            if (charIndex < content.length) {
              setStreamingText(content.slice(0, charIndex + 1));
              charIndex++;
            } else {
              clearInterval(typeInterval);
              setIsStreaming(false);
              setStreamingText("");
              setIsLoading(false);
              
              // Remove any temp messages and replace with backend IDs
              const messagesWithoutTemp = messagesContext.filter(m => !m.id.startsWith('temp-'));
              
              // Update with complete messages from backend
              const finalMessages = [
                ...messagesWithoutTemp,
                userMessage,
                aiMessage,
                ...(emailDraftMessage ? [emailDraftMessage] : [])
              ];
              
              onUpdate(conversation.id, { 
                messages: finalMessages,
                title 
              });
            }
          }, typingSpeed);
          
        } else if (statusData.status === 'ERROR') {
          throw new Error(statusData.error || 'Job processing failed');
        } else {
          console.log(`Job still ${statusData.status}, polling again in 2 seconds...`);
          setTimeout(() => pollJob(), pollDelay);
        }
      };

      setTimeout(() => pollJob(), pollDelay);

    } catch (error) {
      console.error("Error in async job flow:", error);
      clearInterval(loadingInterval);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText("");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || isLoading) return;

    const title = conversation.messages.length === 0 ? input.slice(0, 50) : conversation.title;

    // Create temporary message with placeholder ID
    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date()
    };

    // Add user message immediately with temp ID
    onUpdate(conversation.id, { messages: [...conversation.messages, tempUserMessage], title });
    const userInput = input;
    setInput("");

    // Validate input
    if (userInput.trim().length > 1000) {
      toast({
        title: "Message too long",
        description: "Please keep your message under 1000 characters.",
        variant: "destructive"
      });
      // Remove the temp message
      onUpdate(conversation.id, { 
        messages: conversation.messages.filter(m => m.id !== tempUserMessage.id),
        title 
      });
      return;
    }

    // Use the shared sendMessageToAI function
    await sendMessageToAI(userInput, [...conversation.messages, tempUserMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  const updateMessageRating = (messageId: string, rating?: number, comment?: string) => {
    if (!conversation) return;

    const updatedMessages = conversation.messages.map(msg =>
      msg.id === messageId ? { ...msg, rating, comment } : msg
    );

    onUpdate(conversation.id, { messages: updatedMessages });
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a conversation or create a new one to start chatting
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Start a conversation by typing a message below
          </div>
        ) : (
          <>
            {conversation.messages.map((message, idx) => {
              const isLastAiMessage = idx === conversation.messages.length - 1 && message.role === "ai";
              const displayContent = isLastAiMessage && isStreaming ? streamingText : message.content;
              
              // Handle email type messages specially
              if (message.type === "email" && message.emailData) {
                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-background">
                      <img src={aiAvatar} alt="AI Avatar" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 max-w-3xl">
                      <EmailDraftEditor
                        draft={{
                          subject: message.emailData.subject,
                          body: message.emailData.body
                        }}
                        onDiscard={() => {
                          onUpdate(conversation.id, {
                            messages: conversation.messages.filter(m => m.id !== message.id)
                          });
                        }}
                        onSent={async (emailData) => {
                          // Remove the email draft message
                          const messagesWithoutDraft = conversation.messages.filter(m => m.id !== message.id);
                          
                          // Create new user message with email content in italic
                          const emailContentMessage: Message = {
                            id: `email-sent-${Date.now()}`,
                            role: "user",
                            content: `**Sent the email with the content:**\n\n**Subject:** ${emailData.subject}\n\n**Body:**\n\n*${emailData.body}*`,
                            timestamp: new Date()
                          };
                          
                          const updatedMessages = [...messagesWithoutDraft, emailContentMessage];
                          
                          onUpdate(conversation.id, {
                            messages: updatedMessages
                          });
                          
                          toast({
                            title: "Email sent!",
                            description: "Your email has been sent to support.",
                          });
                          
                          // Send the email content to AI for processing
                          await sendMessageToAI(emailContentMessage.content, updatedMessages);
                        }}
                      />
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "ai" && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-background">
                      <img src={aiAvatar} alt="AI Avatar" className="w-full h-full object-contain" />
                    </div>
                  )}
                  
                  <div className={`flex-1 max-w-3xl ${message.role === "user" ? "flex justify-end" : ""}`}>
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="prose prose-sm max-w-none text-black [&_em]:italic [&_em]:font-normal [&_em]:text-black [&_p]:text-black [&_strong]:text-black [&_strong]:font-bold">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              em: ({ children }) => (
                                <em className="italic text-black" style={{ fontStyle: 'italic' }}>{children}</em>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-bold text-black">{children}</strong>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary font-semibold underline decoration-2 hover:text-primary/80 transition-colors"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {displayContent}
                          </ReactMarkdown>
                          {isLastAiMessage && isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
                          )}
                        </div>
                    )}
                    
                    {message.role === "ai" && !isStreaming && (
                      <>
                        <Collapsible className="mt-4">
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className="h-4 w-4" />
                            View Sources ({message.sources?.length || 0})
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-2 space-y-2">
                            {message.sources && message.sources.length > 0 ? (
                              message.sources.map((source, idx) => {
                                const sourceUrl = typeof source === 'string' ? source : source.url;
                                const sourceSnippet = typeof source === 'string' ? null : source.snippet;
                                
                                return (
                                  <div key={idx} className="p-3 bg-background/50 rounded border border-border">
                                    <a
                                      href={sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline break-all block"
                                    >
                                      {sourceUrl}
                                    </a>
                                    {sourceSnippet && (
                                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {sourceSnippet}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground italic p-3">
                                No sources available for this response
                              </p>
                            )}
                          </CollapsibleContent>
                        </Collapsible>
                        <MessageRating
                          messageId={message.id}
                          rating={message.rating}
                          comment={message.comment}
                          onUpdate={updateMessageRating}
                        />
                      </>
                    )}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-6 w-6 text-secondary-foreground" />
                  </div>
                )}
              </div>
            );
            })}
            
            {isLoading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden bg-background">
                  <img src={aiAvatar} alt="AI Avatar" className="w-full h-full object-contain" />
                </div>
                
                <div className="flex-1 max-w-3xl">
                  <div className="rounded-lg p-4 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">{loadingMessage}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[200px] resize-none"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon" className="h-[60px] w-[60px]">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessages;
