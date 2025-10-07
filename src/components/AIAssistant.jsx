import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, Send, X, Wand2, Code2, Brain, Lightbulb, Bug, Zap, FileCode, Clipboard, RotateCcw } from 'lucide-react';
import { useToast } from './ui/use-toast';
import { supabase } from '@/lib/supabase';

export function AIAssistant({ onApplyChanges, files, userId, currentFile, currentCode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [contextAware, setContextAware] = useState(true);
  const messagesEndRef = useRef(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    { icon: Bug, label: 'Find bugs', prompt: 'Analyze the current code for potential bugs and issues' },
    { icon: Zap, label: 'Optimize', prompt: 'Optimize this code for better performance' },
    { icon: FileCode, label: 'Refactor', prompt: 'Refactor this code to improve readability and maintainability' },
    { icon: Lightbulb, label: 'Explain', prompt: 'Explain what this code does in detail' },
  ];

  const handleSubmit = async (e, customPrompt = null) => {
    e?.preventDefault();
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || loading) return;

    let enhancedPrompt = finalPrompt;
    if (contextAware && currentFile && currentCode) {
      enhancedPrompt = `Current file: ${currentFile}\n\nCurrent code:\n${currentCode}\n\nTask: ${finalPrompt}`;
    }

    const userMessage = { role: 'user', content: finalPrompt };
    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          existingFiles: files,
          analysisMode: analysisMode,
          context: contextAware ? { currentFile, currentCode } : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate code');
      }

      const result = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: result.description || 'Generated your project successfully!',
        files: result.files,
        isDemo: result.demo,
        analysis: result.analysis
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (result.files && onApplyChanges && !analysisMode) {
        onApplyChanges(result.files);
      }

      if (userId && !result.demo) {
        await supabase.from('ai_generations').insert({
          user_id: userId,
          prompt: finalPrompt,
          tokens_used: result.tokens_used || 0,
        });
      }

      toast({
        title: result.demo ? 'Demo Code Generated' : analysisMode ? 'Analysis Complete' : 'Code Generated',
        description: result.demo
          ? 'Demo project created. Add ANTHROPIC_API_KEY for AI generation.'
          : analysisMode
          ? 'Code analysis completed successfully!'
          : 'Your code has been generated and applied!',
      });
    } catch (error) {
      console.error('AI generation error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}. Please try again.`,
      };
      setMessages(prev => [...prev, errorMessage]);

      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Response copied to clipboard',
    });
  };

  const clearConversation = () => {
    setMessages([]);
    toast({
      title: 'Cleared',
      description: 'Conversation history cleared',
    });
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[450px] h-[600px] bg-background border rounded-lg shadow-2xl flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <Brain className="w-3 h-3 text-primary/50 absolute -top-1 -right-1" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by Claude</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={clearConversation}
            title="Clear conversation"
            className="h-7 w-7 p-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 p-0"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
        <Button
          size="sm"
          variant={analysisMode ? 'default' : 'outline'}
          onClick={() => setAnalysisMode(!analysisMode)}
          className="h-7 text-xs"
        >
          <Bug className="w-3 h-3 mr-1" />
          Analysis Mode
        </Button>
        <Button
          size="sm"
          variant={contextAware ? 'default' : 'outline'}
          onClick={() => setContextAware(!contextAware)}
          className="h-7 text-xs"
          disabled={!currentFile}
        >
          <FileCode className="w-3 h-3 mr-1" />
          Context: {currentFile ? currentFile.split('/').pop() : 'None'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm">
            <Wand2 className="w-12 h-12 mx-auto mb-3 text-primary opacity-50" />
            <p className="font-semibold mb-2">AI-Powered Code Assistant</p>
            <p className="text-xs mb-4">Generate, analyze, and optimize code with AI</p>

            {currentFile && contextAware && (
              <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                <FileCode className="w-4 h-4 inline mr-1" />
                Context: Analyzing <strong>{currentFile.split('/').pop()}</strong>
              </div>
            )}

            <div className="mb-4">
              <p className="text-xs font-semibold mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleSubmit(e, action.prompt)}
                    disabled={!currentFile || loading}
                    className="h-auto py-2 px-3 flex flex-col items-center gap-1 text-xs"
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-left">
              <p className="text-xs font-semibold">Example Prompts</p>
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Create a todo app with add, delete, and mark complete')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Todo app with CRUD operations
              </div>
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Build a weather dashboard with search')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Weather dashboard
              </div>
              <div className="bg-muted/50 rounded p-2 text-xs cursor-pointer hover:bg-muted" onClick={() => setPrompt('Add user authentication to my app')}>
                <Code2 className="w-3 h-3 inline mr-1" />
                Add authentication
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`relative group ${
                  msg.role === 'user'
                    ? 'ml-8'
                    : 'mr-8'
                }`}
              >
                <div className={`p-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.analysis && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Analysis:
                      </p>
                      <p className="text-xs opacity-90">{msg.analysis}</p>
                    </div>
                  )}
                  {msg.files && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs font-semibold mb-1">Files generated:</p>
                      <ul className="text-xs space-y-0.5">
                        {Object.keys(msg.files).map(file => (
                          <li key={file} className="truncate flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            {file}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {msg.isDemo && (
                    <div className="mt-2 text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 p-2 rounded">
                      Demo mode - Add ANTHROPIC_API_KEY for AI generation
                    </div>
                  )}
                </div>
                {msg.role === 'assistant' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(msg.content)}
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Clipboard className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/30 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            <span>{analysisMode ? 'Analyzing code...' : 'Generating code...'}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-background">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              placeholder={analysisMode ? 'Ask about the code...' : 'Describe what you want to build...'}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={loading || !prompt.trim()} className="shrink-0">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>
              {contextAware && currentFile ? `Context: ${currentFile.split('/').pop()}` : 'No context'}
            </span>
            <span className="text-xs">Press Enter to send</span>
          </div>
        </div>
      </form>
    </div>
  );
}
