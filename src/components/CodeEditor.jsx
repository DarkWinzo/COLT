import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from './ui/button';
import {
  Save,
  Code2,
  FileText,
  Search,
  Wand2,
  GitBranch,
  Settings,
  Palette,
  Type,
  Maximize2,
  Minimize2
} from 'lucide-react';

export function CodeEditor({ file, content, onChange, onErrorsChange, theme = 'vs-dark' }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [editorTheme, setEditorTheme] = useState('vs-dark');
  const [fontSize, setFontSize] = useState(14);
  const [minimap, setMinimap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      console.log('Save triggered');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
      editor.trigger('keyboard', 'editor.action.quickCommand');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      editor.trigger('keyboard', 'editor.action.quickOpen');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'actions.find');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'editor.action.startFindReplaceAction');
    });

    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      editor.trigger('keyboard', 'editor.action.formatDocument');
    });

    const updateMarkers = () => {
      if (!editor || !onErrorsChange) return;

      const model = editor.getModel();
      if (!model) return;

      const markers = monaco.editor.getModelMarkers({ resource: model.uri });
      const errors = markers.map(marker => ({
        type: marker.severity === monaco.MarkerSeverity.Error ? 'error' : 'warning',
        message: marker.message,
        line: marker.startLineNumber,
        file: file || 'unknown',
      }));

      onErrorsChange?.(errors);
    };

    editor.onDidChangeModelDecorations(() => {
      updateMarkers();
    });

    setTimeout(updateMarkers, 500);
  };

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const findInCode = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'actions.find');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const changeTheme = () => {
    const themes = ['vs-dark', 'vs-light', 'hc-black'];
    const currentIndex = themes.indexOf(editorTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setEditorTheme(nextTheme);
  };

  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 2, 32));
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 2, 10));
  };

  const getLanguage = (filename) => {
    const ext = filename.split('.').pop();
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      md: 'markdown',
      py: 'python',
      vue: 'vue',
    };
    return languageMap[ext] || 'plaintext';
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
        <Code2 className="w-16 h-16 opacity-20" />
        <div className="text-center">
          <p className="font-semibold mb-1">No file selected</p>
          <p className="text-sm">Select a file from the explorer to start editing</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs max-w-md">
          <div className="bg-muted/50 p-3 rounded">
            <kbd className="bg-background px-1.5 py-0.5 rounded">Ctrl/Cmd + S</kbd>
            <p className="mt-1">Save file</p>
          </div>
          <div className="bg-muted/50 p-3 rounded">
            <kbd className="bg-background px-1.5 py-0.5 rounded">Ctrl/Cmd + F</kbd>
            <p className="mt-1">Find in file</p>
          </div>
          <div className="bg-muted/50 p-3 rounded">
            <kbd className="bg-background px-1.5 py-0.5 rounded">Alt + Shift + F</kbd>
            <p className="mt-1">Format code</p>
          </div>
          <div className="bg-muted/50 p-3 rounded">
            <kbd className="bg-background px-1.5 py-0.5 rounded">Ctrl/Cmd + P</kbd>
            <p className="mt-1">Quick open</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <div className="flex items-center justify-between bg-muted/30 px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-xs">{file}</span>
          <span className="text-xs text-muted-foreground">{getLanguage(file)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={formatCode}
            title="Format Code (Alt+Shift+F)"
            className="h-8 w-8 p-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={findInCode}
            title="Find (Ctrl/Cmd+F)"
            className="h-8 w-8 p-0"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={changeTheme}
            title="Change Theme"
            className="h-8 w-8 p-0"
          >
            <Palette className="w-3.5 h-3.5" />
          </Button>
          <div className="flex items-center gap-0.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={decreaseFontSize}
              title="Decrease Font Size"
              className="h-8 w-8 p-0"
            >
              <Type className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-6 text-center">{fontSize}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={increaseFontSize}
              title="Increase Font Size"
              className="h-8 w-8 p-0"
            >
              <Type className="w-4 h-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMinimap(!minimap)}
            title="Toggle Minimap"
            className="h-8 w-8 p-0"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="h-8 w-8 p-0"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file)}
          value={content}
          theme={editorTheme}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: minimap },
            fontSize: fontSize,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'top',
            tabCompletion: 'on',
            suggest: {
              showMethods: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showKeywords: true,
              showWords: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showSnippets: true,
            },
            parameterHints: { enabled: true, cycle: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoClosingOvertype: 'always',
            autoSurround: 'languageDefined',
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            unfoldOnClickAfterEndOfLine: true,
            matchBrackets: 'always',
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            renderLineHighlight: 'all',
            renderLineHighlightOnlyWhenFocus: false,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            mouseWheelZoom: true,
            multiCursorModifier: 'alt',
            selectionHighlight: true,
            occurrencesHighlight: true,
            codeLens: true,
            colorDecorators: true,
            lightbulb: { enabled: true },
            contextmenu: true,
            links: true,
            hover: { enabled: true, sticky: true },
            find: {
              seedSearchStringFromSelection: 'always',
              autoFindInSelection: 'never',
              addExtraSpaceOnTop: true,
            },
            fontLigatures: true,
            fontFamily: 'JetBrains Mono, Fira Code, Cascadia Code, Menlo, Monaco, "Courier New", monospace',
          }}
        />
      </div>
    </div>
  );
}
