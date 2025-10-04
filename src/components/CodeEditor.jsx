import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

export function CodeEditor({ file, content, onChange, onErrorsChange, theme = 'vs-dark' }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

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
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a file to edit
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={getLanguage(file)}
      value={content}
      theme={theme}
      onChange={onChange}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        parameterHints: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
      }}
    />
  );
}
