import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Button } from './ui/button';

export function ErrorPanel({ errors, onClear }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (errors && errors.length > 0) {
      setIsVisible(true);
    }
  }, [errors]);

  if (!isVisible || !errors || errors.length === 0) {
    return null;
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto bg-background border rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-sm">
            Problems ({errors.length})
          </h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setIsVisible(false);
            onClear?.();
          }}
          className="h-7 w-7"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="max-h-60 overflow-y-auto p-3 space-y-2">
        {errors.map((error, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
          >
            {getIcon(error.type || 'error')}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs text-muted-foreground">
                {error.file}:{error.line || '?'}
              </p>
              <p className="text-sm mt-0.5">{error.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
