import { useEffect, useState } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';

export function Preview({ url }) {
  const [key, setKey] = useState(0);
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(url);
  }, [url]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleRefresh}
          title="Refresh preview"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleOpenExternal}
          title="Open in new tab"
          disabled={!currentUrl}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <div className="flex-1 px-3 py-1.5 text-sm bg-muted rounded-md truncate">
          {currentUrl || 'Starting server...'}
        </div>
      </div>
      <div className="flex-1 relative">
        {currentUrl ? (
          <iframe
            key={key}
            src={currentUrl}
            className="w-full h-full border-0"
            title="Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p>Starting development server...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
