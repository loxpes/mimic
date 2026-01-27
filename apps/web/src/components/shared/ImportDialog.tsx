import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { readFileAsText } from '@/lib/yaml-parser';

interface ImportDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: T[]) => Promise<void>;
  parseYaml: (content: string) => { items: T[]; errors: string[] };
  title: string;
  description: string;
  itemName: string;
}

export function ImportDialog<T>({
  open,
  onOpenChange,
  onImport,
  parseYaml,
  title,
  description,
  itemName,
}: ImportDialogProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<T[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setParsedItems([]);
    setParseErrors([]);

    try {
      const content = await readFileAsText(selectedFile);
      const result = parseYaml(content);
      setParsedItems(result.items);
      setParseErrors(result.errors);
    } catch {
      setParseErrors(['Failed to read file']);
    }
  }, [parseYaml]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.yaml') || droppedFile.name.endsWith('.yml'))) {
      handleFile(droppedFile);
    } else {
      setParseErrors(['Please drop a .yaml or .yml file']);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleImport = async () => {
    if (parsedItems.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parsedItems);
      onOpenChange(false);
      setFile(null);
      setParsedItems([]);
      setParseErrors([]);
    } catch {
      setParseErrors(['Failed to import items']);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFile(null);
    setParsedItems([]);
    setParseErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop a YAML file here, or
          </p>
          <label>
            <input
              type="file"
              accept=".yaml,.yml"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFile(selectedFile);
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer">Browse files</span>
            </Button>
          </label>
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="truncate">{file.name}</span>
          </div>
        )}

        {parseErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-1">
            {parseErrors.map((error, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {parsedItems.length > 0 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Found {parsedItems.length} {itemName}{parsedItems.length !== 1 ? 's' : ''} to import
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedItems.length === 0 || isImporting}
          >
            {isImporting ? 'Importing...' : `Import ${parsedItems.length} ${itemName}${parsedItems.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
