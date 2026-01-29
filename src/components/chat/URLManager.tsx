import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ExternalLink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface URLItem {
  id: string;
  url: string;
  addedAt: Date;
}

const URLManager = () => {
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAdding && progress < 99) {
      const timer = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 10; // Slower progress for longer retries
          const next = prev + increment;
          return next >= 99 ? 99 : next;
        });
      }, 500); // Slower updates
      return () => clearInterval(timer);
    }
  }, [isAdding, progress]);

  useEffect(() => {
    const fetchUrls = async () => {
      try {
        setIsLoading(true);
        const response = await supabase.functions.invoke("list-urls", {
          body: { index: "spaceship-docs" }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        // Transform backend data to URLItem format
        if (data.blocks && Array.isArray(data.blocks)) {
          const urlItems: URLItem[] = data.blocks.map((block: any, index: number) => ({
            id: block.id || `block-${index}`,
            url: block.url || block.source_url || "Unknown URL",
            addedAt: block.created_at ? new Date(block.created_at) : new Date()
          }));
          setUrls(urlItems);
        }
      } catch (error) {
        console.error("Error fetching URLs:", error);
        toast({
          title: "Error",
          description: "Failed to load URLs from backend",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUrls();
  }, [toast]);


  const addUrl = async () => {
    if (!newUrl.trim()) return;

    try {
      new URL(newUrl);
      setIsAdding(true);
      setProgress(0);
      
      const response = await supabase.functions.invoke("add-url", {
        body: { url: newUrl }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      setProgress(100);
      
      toast({
        title: "URL Added",
        description: data.message || "The URL has been added to the RAG system"
      });
      
      setNewUrl("");
      
      // Refresh the URL list
      const listResponse = await supabase.functions.invoke("list-urls", {
        body: { index: "spaceship-docs" }
      });
      
      if (listResponse.data?.blocks && Array.isArray(listResponse.data.blocks)) {
        const urlItems: URLItem[] = listResponse.data.blocks.map((block: any, index: number) => ({
          id: block.id || `block-${index}`,
          url: block.url || block.source_url || "Unknown URL",
          addedAt: block.created_at ? new Date(block.created_at) : new Date()
        }));
        setUrls(urlItems);
      }
    } catch (error) {
      console.error("Error adding URL:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to add URL";
      const isServiceError = errorMsg.includes("503") || errorMsg.includes("Service Unavailable") || errorMsg.includes("overloaded");
      
      toast({
        title: isServiceError ? "Service Temporarily Unavailable" : "Error",
        description: isServiceError 
          ? "The backend is currently overloaded or the URL is too large. Please try again in a moment."
          : errorMsg,
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsAdding(false);
        setProgress(0);
      }, 500);
    }
  };

  const deleteUrl = async (id: string) => {
    const urlToDelete = urls.find(u => u.id === id);
    if (!urlToDelete) return;

    try {
      setDeletingIds(prev => new Set([...prev, id]));
      
      const response = await supabase.functions.invoke("delete-url", {
        body: { url: urlToDelete.url }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "URL Removed",
        description: "The URL has been removed from the RAG system"
      });

      // Refresh the URL list
      const listResponse = await supabase.functions.invoke("list-urls", {
        body: { index: "spaceship-docs" }
      });
      
      if (listResponse.data?.blocks && Array.isArray(listResponse.data.blocks)) {
        const urlItems: URLItem[] = listResponse.data.blocks.map((block: any, index: number) => ({
          id: block.id || `block-${index}`,
          url: block.url || block.source_url || "Unknown URL",
          addedAt: block.created_at ? new Date(block.created_at) : new Date()
        }));
        setUrls(urlItems);
      }
    } catch (error) {
      console.error("Error deleting URL:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to delete URL";
      const isServiceError = errorMsg.includes("503") || errorMsg.includes("Service Unavailable") || errorMsg.includes("overloaded");
      
      toast({
        title: isServiceError ? "Service Temporarily Unavailable" : "Error",
        description: isServiceError 
          ? "The backend is currently overloaded. Please try again in a moment."
          : errorMsg,
        variant: "destructive"
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const deleteBulkUrls = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsBulkDeleting(true);
      const urlsToDelete = urls.filter(u => selectedIds.has(u.id));
      
      // Delete all selected URLs in parallel
      const deletePromises = urlsToDelete.map(url =>
        supabase.functions.invoke("delete-url", {
          body: { url: url.url }
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      const failedCount = results.filter(r => r.status === 'rejected').length;
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      if (failedCount > 0) {
        toast({
          title: "Partial Success",
          description: `${successCount} URLs removed, ${failedCount} failed`,
          variant: failedCount === results.length ? "destructive" : "default"
        });
      } else {
        toast({
          title: "URLs Removed",
          description: `${successCount} URLs have been removed from the RAG system`
        });
      }

      // Clear selection
      setSelectedIds(new Set());

      // Refresh the URL list
      const listResponse = await supabase.functions.invoke("list-urls", {
        body: { index: "spaceship-docs" }
      });
      
      if (listResponse.data?.blocks && Array.isArray(listResponse.data.blocks)) {
        const urlItems: URLItem[] = listResponse.data.blocks.map((block: any, index: number) => ({
          id: block.id || `block-${index}`,
          url: block.url || block.source_url || "Unknown URL",
          addedAt: block.created_at ? new Date(block.created_at) : new Date()
        }));
        setUrls(urlItems);
      }
    } catch (error) {
      console.error("Error bulk deleting URLs:", error);
      toast({
        title: "Error",
        description: "Failed to delete URLs",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUrls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUrls.map(u => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredUrls = urls.filter(item => 
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>RAG URL Manager</CardTitle>
        <CardDescription>
          Add URLs to connect to your RAG (Retrieval-Augmented Generation) system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addUrl()}
          />
          <Button onClick={addUrl} disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Add URL
          </Button>
        </div>

        {isAdding && (
          <div className="space-y-2 animate-fade-in">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground text-center">
              {progress < 100 
                ? `Processing URL and creating RAG blocks... ${Math.round(progress)}%`
                : "Complete!"
              }
            </p>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={deleteBulkUrls}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedIds.size}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading URLs...
            </p>
          ) : urls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No URLs found
            </p>
          ) : (
            <>
              {filteredUrls.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <Checkbox
                    checked={selectedIds.size === filteredUrls.length && filteredUrls.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({filteredUrls.length})
                  </span>
                </div>
              )}
              {filteredUrls.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                    disabled={isBulkDeleting || deletingIds.has(item.id)}
                  />
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.url}</p>
                    <p className="text-xs text-muted-foreground">
                      {deletingIds.has(item.id) 
                        ? "Deleting..." 
                        : `Added ${item.addedAt.toLocaleDateString()}`
                      }
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteUrl(item.id)}
                    disabled={deletingIds.has(item.id) || isBulkDeleting}
                  >
                    <Trash2 className={`h-4 w-4 ${deletingIds.has(item.id) ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default URLManager;
