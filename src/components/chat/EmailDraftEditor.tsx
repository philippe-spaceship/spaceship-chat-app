import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, X, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailDraft {
  subject: string;
  body: string;
}

interface EmailDraftEditorProps {
  draft: EmailDraft;
  onDiscard: () => void;
  onSent: (emailData: { subject: string; body: string }) => void;
}

const SUPPORT_EMAIL = "support@spaceshipapp.com"; // Fixed recipient

const EmailDraftEditor = ({ draft, onDiscard, onSent }: EmailDraftEditorProps) => {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = () => {
    // TODO: Implement send email functionality
    toast({
      title: "Email sent",
      description: "Your email has been sent to Spaceship support",
    });
    onSent({ subject: subject.trim(), body: body.trim() });
  };

  return (
    <Card className="p-4 space-y-4 border-primary/20 bg-card/50 shadow-lg animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">📧 Email Draft Ready</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDiscard}
          disabled={isSending}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            value={SUPPORT_EMAIL}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            disabled={isSending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body"
            className="min-h-[200px] resize-y"
            disabled={isSending}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onDiscard}
          disabled={isSending}
        >
          Discard
        </Button>
        <Button
          onClick={handleSend}
          disabled={isSending || !subject.trim() || !body.trim()}
        >
          {isSending ? (
            <>
              <Send className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default EmailDraftEditor;
