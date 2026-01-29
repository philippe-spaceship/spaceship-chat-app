import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText, Search, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface DocumentItem {
  id: string;
  filename: string;
  fileType: string;
  addedAt: Date;
}

const ACCEPTED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  // Presentations
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff'],
  'image/bmp': ['.bmp'],
  'image/svg+xml': ['.svg'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'image/avif': ['.avif'],
  // Text
  'text/plain': ['.txt'],
  'text/html': ['.html', '.htm'],
  'text/markdown': ['.md', '.markdown', '.mkd'],
};

const DocumentManager = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isUploading && progress < 99) {
      const timer = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 10;
          const next = prev + increment;
          return next >= 99 ? 99 : next;
        });
      }, 500);
      return () => clearInterval(timer);
    }
  }, [isUploading, progress]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await supabase.functions.invoke("list-documents", {
          body: { index: "spaceship-docs" }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        const data = response.data;
        
        if (data.blocks && Array.isArray(data.blocks)) {
          const docItems: DocumentItem[] = data.blocks
            .filter((block: any) => block.type === 'document')
            .map((block: any, index: number) => ({
              id: block.id || `doc-${index}`,
              filename: block.filename || block.source_filename || "Unknown Document",
              fileType: block.file_type || "unknown",
              addedAt: block.created_at ? new Date(block.created_at) : new Date()
            }));
          setDocuments(docItems);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast({
          title: "Error",
          description: "Failed to load documents from backend",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [toast]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadDocument = async (file: File) => {
    try {
      setIsUploading(true);
      setProgress(0);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:*/*;base64, prefix
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await supabase.functions.invoke("add-document", {
        body: {
          filename: file.name,
          file_type: file.type,
          file_data: base64
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      
      setProgress(100);
      
      toast({
        title: "Document Added",
        description: data.message || "The document has been added to the RAG system"
      });

      // Refresh the document list
      const listResponse = await supabase.functions.invoke("list-documents", {
        body: { index: "spaceship-docs" }
      });
      
      if (listResponse.data?.blocks && Array.isArray(listResponse.data.blocks)) {
        const docItems: DocumentItem[] = listResponse.data.blocks
          .filter((block: any) => block.type === 'document')
          .map((block: any, index: number) => ({
            id: block.id || `doc-${index}`,
            filename: block.filename || block.source_filename || "Unknown Document",
            fileType: block.file_type || "unknown",
            addedAt: block.created_at ? new Date(block.created_at) : new Date()
          }));
        setDocuments(docItems);
      }
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(file.type);
      if (!isValidType) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a supported file type (PDF, Word, Excel, PowerPoint, Images, or Text files)",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (max 20MB)
      const maxSize = 20 * 1024 * 1024; // 20MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 20MB",
          variant: "destructive"
        });
        return;
      }

      uploadDocument(file);
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      setDeletingIds(prev => new Set([...prev, id]));
      
      const doc = documents.find(d => d.id === id);
      if (!doc) {
        throw new Error("Document not found");
      }
      
      const response = await supabase.functions.invoke("delete-document", {
        body: { filename: doc.filename }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setDocuments(prev => prev.filter(doc => doc.id !== id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive"
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const deleteBulkDocuments = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsBulkDeleting(true);
      const deletePromises = Array.from(selectedIds).map(id => {
        const doc = documents.find(d => d.id === id);
        if (!doc) return Promise.reject(new Error("Document not found"));
        
        return supabase.functions.invoke("delete-document", {
          body: { filename: doc.filename }
        });
      });

      const results = await Promise.allSettled(deletePromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      setDocuments(prev => prev.filter(doc => !selectedIds.has(doc.id)));
      setSelectedIds(new Set());

      toast({
        title: "Bulk Delete Complete",
        description: `${successCount} documents deleted successfully${failCount > 0 ? `, ${failCount} failed` : ''}`
      });
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast({
        title: "Error",
        description: "Some documents failed to delete",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const acceptString = Object.values(ACCEPTED_FILE_TYPES).flat().join(',');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Document Manager</CardTitle>
        <CardDescription>
          Upload documents to enhance the knowledge base (PDF, Word, Excel, PowerPoint, Images, Text files)
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button 
            onClick={handleFileSelect} 
            disabled={isUploading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
          
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={deleteBulkDocuments}
              disabled={isBulkDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selectedIds.size} Selected
            </Button>
          )}
        </div>

        {isUploading && (
          <Progress value={progress} className="w-full" />
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading documents...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No documents match your search" : "No documents yet. Upload your first document to get started!"}
            </div>
          ) : (
            <>
              {filteredDocuments.length > 1 && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Checkbox
                    checked={selectedIds.size === filteredDocuments.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({filteredDocuments.length})
                  </span>
                </div>
              )}
              
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={selectedIds.has(doc.id)}
                      onCheckedChange={() => toggleSelect(doc.id)}
                    />
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType} • Added {doc.addedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDocument(doc.id)}
                    disabled={deletingIds.has(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
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

export default DocumentManager;
