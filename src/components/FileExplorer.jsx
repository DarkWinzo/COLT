import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

export function FileExplorer({ files, onFileSelect, onFileCreate, onFileDelete, selectedFile }) {
  const [expanded, setExpanded] = useState(new Set(['']));
  const [contextMenu, setContextMenu] = useState(null);

  const buildFileTree = (fileList) => {
    const tree = {};

    Object.keys(fileList).forEach(path => {
      const parts = path.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? { __isFile: true, __path: path } : {};
        }
        current = current[part];
      });
    });

    return tree;
  };

  const toggleExpand = (path) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const renderTree = (node, path = '', depth = 0) => {
    return Object.keys(node).map(key => {
      if (key.startsWith('__')) return null;

      const fullPath = path ? `${path}/${key}` : key;
      const isFile = node[key].__isFile;
      const isExpanded = expanded.has(fullPath);
      const isSelected = selectedFile === (isFile ? node[key].__path : null);

      if (isFile) {
        return (
          <div
            key={fullPath}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm text-sm transition-colors',
              isSelected && 'bg-accent text-accent-foreground'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onFileSelect(node[key].__path)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ path: node[key].__path, x: e.clientX, y: e.clientY });
            }}
          >
            <File className="w-4 h-4 text-blue-500" />
            <span className="truncate">{key}</span>
          </div>
        );
      }

      return (
        <div key={fullPath}>
          <div
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent rounded-sm text-sm transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => toggleExpand(fullPath)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-yellow-500" />
            ) : (
              <Folder className="w-4 h-4 text-yellow-500" />
            )}
            <span className="truncate">{key}</span>
          </div>
          {isExpanded && (
            <div>
              {renderTree(node[key], fullPath, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const tree = buildFileTree(files);

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-2 border-b flex items-center justify-between">
        <h3 className="text-sm font-semibold">Files</h3>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            const fileName = prompt('Enter file name:');
            if (fileName) {
              onFileCreate(fileName);
            }
          }}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {renderTree(tree)}
      </div>

      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-popover border rounded-md shadow-md p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <Button
              size="sm"
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => {
                onFileDelete(contextMenu.path);
                setContextMenu(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
