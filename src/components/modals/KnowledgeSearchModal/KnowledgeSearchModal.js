import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Search } from "lucide-react";
import { RAG } from "@core/RAG";
import { truncateText } from "@utils/uiUtils";

const TOP_K_OPTIONS = [
  { id: 1, text: "1 result" },
  { id: 5, text: "5 results" },
  { id: 10, text: "10 results" },
  { id: 20, text: "20 results" },
  { id: 50, text: "50 results" },
];

const KnowledgeSearchModal = ({ open, onClose, knowledgeBase }) => {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(TOP_K_OPTIONS[1]); // Default to 5
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !knowledgeBase?.vectors) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const { modelId, providerId } = knowledgeBase.vectors;

      // Retrieve results from the knowledge base
      const chunks = await RAG.retrieveFromKnowledgeBase(
        query,
        knowledgeBase,
        modelId,
        providerId,
        {
          topK: topK.id,
          minSimilarity: 0.0, // Show all results up to topK
        }
      );

      setResults(chunks);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [query, topK, knowledgeBase]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      handleSearch();
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] knowledge-search-modal">
        <DialogHeader>
          <DialogTitle>Search: {knowledgeBase?.name || "Knowledge Base"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="knowledge-search-controls space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Search Query</Label>
              <Input
                id="search-query"
                placeholder="Enter your search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSearching}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="top-k-select">Results</Label>
              <Select
                value={topK.id.toString()}
                onValueChange={(value) => {
                  const selected = TOP_K_OPTIONS.find(opt => opt.id.toString() === value);
                  if (selected) setTopK(selected);
                }}
                disabled={isSearching}
              >
                <SelectTrigger id="top-k-select">
                  <SelectValue placeholder="Select number of results" />
                </SelectTrigger>
                <SelectContent>
                  {TOP_K_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id.toString()}>
                      {option.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              size="default"
              onClick={handleSearch}
              disabled={!query.trim() || isSearching || !knowledgeBase?.vectors}
              className="w-full knowledge-search-button"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>

          {isSearching && (
            <div className="knowledge-search-loading py-8">
              <LoadingSpinner description="Searching..." />
            </div>
          )}

          {!isSearching && hasSearched && (
            <div className="knowledge-search-results space-y-4">
              <h4 className="knowledge-search-results-title font-semibold">
                {results.length > 0
                  ? `Found ${results.length} result${results.length !== 1 ? "s" : ""}`
                  : "No results found"}
              </h4>

              {results.length > 0 && (
                <div className="knowledge-search-results-list space-y-3 max-h-[400px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={`${result.fileId}-${result.index}`} className="knowledge-search-result p-3 border rounded-md">
                      <div className="knowledge-search-result-header flex items-center gap-2 mb-2">
                        <span className="knowledge-search-result-rank text-sm font-medium">#{index + 1}</span>
                        <span className="knowledge-search-result-file text-sm text-muted-foreground">
                          {truncateText(result.fileName, 40)}
                        </span>
                        <span className="knowledge-search-result-score ml-auto text-sm font-medium">
                          {(result.similarity * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <div className="knowledge-search-result-text text-sm">{result.text}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasSearched && !isSearching && (
            <p className="knowledge-search-hint text-sm text-muted-foreground text-center py-8">
              Enter a query and click Search to find relevant content.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeSearchModal;
