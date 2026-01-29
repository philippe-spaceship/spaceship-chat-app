import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MessageRatingProps {
  messageId: string;
  rating?: number;
  comment?: string;
  onUpdate: (messageId: string, rating?: number, comment?: string) => void;
}

const MessageRating = ({ messageId, rating, comment, onUpdate }: MessageRatingProps) => {
  const [showComment, setShowComment] = useState(false);
  const [commentText, setCommentText] = useState(comment || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRating = async (newRating: number) => {
    const finalRating = rating === newRating ? undefined : newRating;
    
    // Update local state optimistically
    onUpdate(messageId, finalRating, comment);
    
    if (finalRating) {
      setShowComment(true);
      
      // Call edge function to persist rating
      try {
        setIsSubmitting(true);
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rate-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message_id: messageId,
            rating: finalRating
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save rating');
        }

        toast({
          title: "Rating saved",
          description: "Your rating has been recorded.",
        });
      } catch (error) {
        console.error('Error saving rating:', error);
        toast({
          title: "Error",
          description: "Failed to save rating. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const saveComment = async () => {
    if (!commentText.trim()) {
      setShowComment(false);
      return;
    }

    // Update local state optimistically
    onUpdate(messageId, rating, commentText);
    setShowComment(false);

    // Call edge function to persist comment
    try {
      setIsSubmitting(true);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: messageId,
          comment: commentText
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save comment');
      }

      toast({
        title: "Comment saved",
        description: "Your comment has been recorded.",
      });
    } catch (error) {
      console.error('Error saving comment:', error);
      toast({
        title: "Error",
        description: "Failed to save comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRating(star)}
            className="p-0 hover:scale-110 transition-transform"
          >
            <Star
              className={cn(
                "h-4 w-4 transition-colors",
                rating && star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground hover:text-yellow-400"
              )}
            />
          </button>
        ))}
        {rating && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 text-xs"
            onClick={() => setShowComment(!showComment)}
          >
            {comment ? "Edit Comment" : "Add Comment"}
          </Button>
        )}
      </div>

      {showComment && (
        <div className="mt-2 space-y-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add your comment..."
            className="min-h-[60px] text-sm"
          />
          <Button size="sm" onClick={saveComment} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Comment"}
          </Button>
        </div>
      )}

      {comment && !showComment && (
        <p className="mt-2 text-sm text-muted-foreground italic">{comment}</p>
      )}
    </div>
  );
};

export default MessageRating;
